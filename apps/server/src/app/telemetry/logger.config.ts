/**
 * @fileoverview Configuration factory for nestjs-pino structured logging.
 *
 * Configures request redaction, environment-aware transports (pino-pretty in development),
 * and suppresses high-frequency health probes.
 */

import type { IncomingMessage } from 'http';
import { Params } from 'nestjs-pino';

/**
 * Creates configuration options for nestjs-pino LoggerModule.
 *
 * @returns {Params} Configuration object for LoggerModule.forRoot.
 */
export function createLoggerConfig(): Params {
  const isDev = process.env.NODE_ENV === 'development';
  const isTest = process.env.NODE_ENV === 'test';
  const logLevel =
    process.env.LOG_LEVEL || (isTest ? 'silent' : isDev ? 'debug' : 'info');

  return {
    pinoHttp: {
      level: logLevel,
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.body.pass',
          'req.body.password',
          'res.headers["set-cookie"]',
        ],
        censor: '[REDACTED]',
      },
      autoLogging: {
        ignore: (req: IncomingMessage) => req.url === '/api',
      },
      transport: isDev
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              singleLine: true,
              translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
    },
  };
}
