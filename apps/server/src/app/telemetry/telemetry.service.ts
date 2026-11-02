/**
 * @fileoverview Domain telemetry service wrapping OpenTelemetry traces and business metrics.
 *
 * Provides high-level helper methods for creating domain spans and incrementing
 * Coastal Eats business metrics without coupling domain code to low-level OTel schemas.
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  trace,
  metrics,
  Tracer,
  Meter,
  Span,
  SpanStatusCode,
  Attributes,
  Counter,
  Histogram,
  ObservableGauge,
} from '@opentelemetry/api';

/**
 * Service encapsulating OpenTelemetry tracer and business metrics for ShiftSync.
 */
@Injectable()
export class TelemetryService implements OnModuleInit {
  private tracer: Tracer;
  private meter: Meter;

  // Domain Business Counters & Histograms
  private complianceEvaluationsCounter!: Counter;
  private complianceViolationsCounter!: Counter;
  private complianceDurationHistogram!: Histogram;
  private shiftAssignmentsCounter!: Counter;
  private swapTransitionsCounter!: Counter;
  private wsConnectedUsersGauge!: ObservableGauge;

  private wsConnectionCountResolver: (() => number) | null = null;

  constructor() {
    this.tracer = trace.getTracer('shiftsync.domain', '1.0.0');
    this.meter = metrics.getMeter('shiftsync.business', '1.0.0');
  }

  /**
   * Initializes OpenTelemetry metric instruments on module startup.
   */
  onModuleInit() {
    this.complianceEvaluationsCounter = this.meter.createCounter(
      'shiftsync_compliance_evaluations_total',
      {
        description: 'Total labor compliance checks evaluated',
      },
    );

    this.complianceViolationsCounter = this.meter.createCounter(
      'shiftsync_compliance_violations_total',
      {
        description: 'Total individual labor rule violations flagged',
      },
    );

    this.complianceDurationHistogram = this.meter.createHistogram(
      'shiftsync_compliance_evaluation_duration_ms',
      {
        description:
          'Execution duration of compliance rule evaluation in milliseconds',
        unit: 'ms',
      },
    );

    this.shiftAssignmentsCounter = this.meter.createCounter(
      'shiftsync_shifts_assignments_total',
      {
        description: 'Total shift staff assignments created',
      },
    );

    this.swapTransitionsCounter = this.meter.createCounter(
      'shiftsync_swaps_transitions_total',
      {
        description: 'Total shift swap lifecycle state transitions',
      },
    );

    this.wsConnectedUsersGauge = this.meter.createObservableGauge(
      'shiftsync_websocket_connected_users',
      {
        description: 'Current number of active authenticated WebSocket users',
      },
    );

    this.wsConnectedUsersGauge.addCallback((observableResult) => {
      if (this.wsConnectionCountResolver) {
        observableResult.observe(this.wsConnectionCountResolver());
      }
    });
  }

  /**
   * Executes an asynchronous operation inside a child OpenTelemetry span.
   * Automatically records exceptions, sets span error status on failure, and closes the span.
   *
   * @template T
   * @param {string} name - Span operation name.
   * @param {Attributes} attributes - Initial span attributes.
   * @param {(span: Span) => Promise<T>} fn - Asynchronous logic to execute within the active span.
   * @returns {Promise<T>} Result of the executed logic.
   */
  async withSpan<T>(
    name: string,
    attributes: Attributes,
    fn: (span: Span) => Promise<T>,
  ): Promise<T> {
    return this.tracer.startActiveSpan(name, { attributes }, async (span) => {
      try {
        const result = await fn(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        span.recordException(error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message || 'Domain operation failed',
        });
        throw err;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Records a completed labor law compliance evaluation outcome and latency.
   *
   * @param {'pass' | 'warning' | 'override_required' | 'hard_block'} outcome - Evaluation result category.
   * @param {number} durationMs - Duration in milliseconds.
   */
  recordComplianceEvaluation(
    outcome: 'pass' | 'warning' | 'override_required' | 'hard_block',
    durationMs: number,
  ): void {
    this.complianceEvaluationsCounter?.add(1, { outcome });
    this.complianceDurationHistogram?.record(durationMs, { outcome });
  }

  /**
   * Increments the violation counter for a specific labor compliance constraint.
   *
   * @param {string} rule - Name of violated rule (e.g. 'overlap', 'rest_10h', 'daily_12h', 'consecutive_7th').
   */
  recordComplianceViolation(rule: string): void {
    this.complianceViolationsCounter?.add(1, { rule });
  }

  /**
   * Increments the shift assignment counter.
   *
   * @param {boolean} overridden - Whether the assignment required a manager override.
   */
  recordShiftAssignment(overridden: boolean): void {
    this.shiftAssignmentsCounter?.add(1, {
      overridden: overridden ? 'true' : 'false',
    });
  }

  /**
   * Increments the swap lifecycle transition counter.
   *
   * @param {string} action - Lifecycle transition (e.g. 'requested', 'accepted', 'declined', 'approved').
   * @param {'peer' | 'drop'} type - Type of swap request.
   */
  recordSwapTransition(action: string, type: 'peer' | 'drop'): void {
    this.swapTransitionsCounter?.add(1, { action, type });
  }

  /**
   * Registers a provider function that computes the live count of connected WebSocket users.
   *
   * @param {() => number} resolver - Function returning the active connection count.
   */
  registerWebSocketConnectionResolver(resolver: () => number): void {
    this.wsConnectionCountResolver = resolver;
  }
}
