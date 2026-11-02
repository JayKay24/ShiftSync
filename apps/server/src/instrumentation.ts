/**
 * @fileoverview OpenTelemetry SDK initialization and runtime auto-instrumentation pre-loader.
 *
 * This file is imported at line 1 of main.ts before NestFactory and other modules are required,
 * ensuring that Node's module loader is hooked for HTTP, Express, pg, Socket.io, and Pino.
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  resourceFromAttributes,
  defaultResource,
} from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
} from '@opentelemetry/semantic-conventions';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { SocketIoInstrumentation } from '@opentelemetry/instrumentation-socket.io';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';
import { RuntimeNodeInstrumentation } from '@opentelemetry/instrumentation-runtime-node';

/**
 * Determines if OpenTelemetry telemetry export is active for the current environment.
 *
 * Defaults to false during testing ('NODE_ENV === test') unless explicitly overridden
 * via 'OTEL_ENABLED=true', and defaults to true otherwise unless disabled with 'OTEL_ENABLED=false'.
 *
 * @param {NodeJS.ProcessEnv} [env=process.env] - Environment configuration dictionary.
 * @returns {boolean} True if telemetry collection and export should start.
 */
export function isTelemetryEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (env.OTEL_ENABLED === 'false') {
    return false;
  }
  if (env.NODE_ENV === 'test') {
    return env.OTEL_ENABLED === 'true';
  }
  return true;
}

export let sdk: NodeSDK | null = null;

if (isTelemetryEnabled()) {
  const serviceName = process.env.OTEL_SERVICE_NAME || 'shiftsync-server';
  const serviceVersion = process.env.npm_package_version || '0.1.0';
  const environment = process.env.NODE_ENV || 'development';
  const otlpEndpoint =
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';

  // 1. Configure OpenTelemetry Resource attributes
  const resource = defaultResource().merge(
    resourceFromAttributes({
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_VERSION]: serviceVersion,
      [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: environment,
    }),
  );

  // 2. Initialize OTLP HTTP Exporters (Traces, Metrics, Logs)
  const traceExporter = new OTLPTraceExporter({
    url: `${otlpEndpoint.replace(/\/+$/, '')}/v1/traces`,
  });

  const metricReader = new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: `${otlpEndpoint.replace(/\/+$/, '')}/v1/metrics`,
    }),
    exportIntervalMillis: 10000,
  });

  const logRecordProcessor = new BatchLogRecordProcessor({
    exporter: new OTLPLogExporter({
      url: `${otlpEndpoint.replace(/\/+$/, '')}/v1/logs`,
    }),
  });

  // 3. Assemble surgical NodeSDK instrumentations
  sdk = new NodeSDK({
    resource,
    traceExporter,
    metricReaders: [metricReader],
    logRecordProcessors: [logRecordProcessor],
    instrumentations: [
      new HttpInstrumentation(),
      new ExpressInstrumentation(),
      new NestInstrumentation(),
      new PgInstrumentation({
        enhancedDatabaseReporting:
          process.env.OTEL_DB_ENHANCED_REPORTING === 'true',
      }),
      new SocketIoInstrumentation(),
      new PinoInstrumentation({
        logKeys: {
          traceId: 'trace_id',
          spanId: 'span_id',
          traceFlags: 'trace_flags',
        },
      }),
      new RuntimeNodeInstrumentation(),
    ],
  });

  // 4. Start the OpenTelemetry NodeSDK
  try {
    sdk.start();
  } catch (error) {
    console.error('Failed to start OpenTelemetry NodeSDK:', error);
  }

  // 5. Graceful shutdown handler
  const shutdown = async () => {
    if (sdk) {
      try {
        await sdk.shutdown();
      } catch (err) {
        console.error('Error shutting down OpenTelemetry NodeSDK:', err);
      }
    }
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

/**
 * Manually shuts down the active OpenTelemetry NodeSDK instance if running.
 *
 * @returns {Promise<void>} Resolves when the SDK has flushed buffers and closed exporters.
 */
export async function shutdownTelemetry(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    sdk = null;
  }
}
