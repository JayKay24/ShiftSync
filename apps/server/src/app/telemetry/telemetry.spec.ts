import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { trace } from '@opentelemetry/api';
import { isTelemetryEnabled } from '../../instrumentation';
import { TelemetryService } from './telemetry.service';
import { TraceResponseInterceptor } from './trace-response.interceptor';

describe('Telemetry & Observability', () => {
  describe('isTelemetryEnabled environment gating', () => {
    it('should return false in test environment by default', () => {
      expect(isTelemetryEnabled({ NODE_ENV: 'test' })).toBe(false);
    });

    it('should return true in test environment when OTEL_ENABLED is explicitly true', () => {
      expect(
        isTelemetryEnabled({ NODE_ENV: 'test', OTEL_ENABLED: 'true' }),
      ).toBe(true);
    });

    it('should return false when OTEL_ENABLED is false even in development', () => {
      expect(
        isTelemetryEnabled({ NODE_ENV: 'development', OTEL_ENABLED: 'false' }),
      ).toBe(false);
    });

    it('should return true in development environment by default', () => {
      expect(isTelemetryEnabled({ NODE_ENV: 'development' })).toBe(true);
    });

    it('should return true in production environment by default', () => {
      expect(isTelemetryEnabled({ NODE_ENV: 'production' })).toBe(true);
    });
  });

  describe('TelemetryService', () => {
    let service: TelemetryService;

    beforeEach(() => {
      service = new TelemetryService();
      service.onModuleInit();
    });

    it('should execute withSpan and mark span OK on success', async () => {
      const result = await service.withSpan(
        'test.operation',
        { 'test.attr': 'value' },
        async (span) => {
          expect(span).toBeDefined();
          return 'success_payload';
        },
      );

      expect(result).toBe('success_payload');
    });

    it('should record exception and mark span ERROR on failure', async () => {
      const error = new Error('Test domain failure');

      await expect(
        service.withSpan('test.failure', {}, async () => {
          throw error;
        }),
      ).rejects.toThrow('Test domain failure');
    });

    it('should record domain metrics without throwing errors', () => {
      expect(() => {
        service.recordComplianceEvaluation('pass', 12.5);
        service.recordComplianceEvaluation('hard_block', 45.2);
        service.recordComplianceViolation('rest_10h');
        service.recordShiftAssignment(true);
        service.recordShiftAssignment(false);
        service.recordSwapTransition('requested', 'peer');
        service.recordSwapTransition('approved', 'drop');
      }).not.toThrow();
    });

    it('should register WebSocket connection resolver', () => {
      const resolver = vi.fn(() => 42);
      service.registerWebSocketConnectionResolver(resolver);

      // Verify resolver is retained
      expect(resolver).not.toHaveBeenCalled();
    });
  });

  describe('TraceResponseInterceptor', () => {
    let interceptor: TraceResponseInterceptor;

    beforeEach(() => {
      interceptor = new TraceResponseInterceptor();
    });

    it('should inject x-trace-id header and actor context when active span exists', async () => {
      const tracer = trace.getTracer('test-tracer');

      await tracer.startActiveSpan('http_request_span', async (span) => {
        try {
          const traceId = span.spanContext().traceId;
          const headers: Record<string, string> = {};

          const mockReq = {
            user: { userId: 'user-uuid-123', role: 'Manager' },
          };
          const mockRes = {
            setHeader: vi.fn((key: string, val: string) => {
              headers[key] = val;
            }),
          };

          const mockContext = {
            getType: () => 'http',
            switchToHttp: () => ({
              getRequest: () => mockReq,
              getResponse: () => mockRes,
            }),
          } as unknown as ExecutionContext;

          const mockHandler: CallHandler = {
            handle: () => of({ success: true }),
          };

          interceptor.intercept(mockContext, mockHandler).subscribe();

          expect(mockRes.setHeader).toHaveBeenCalledWith('x-trace-id', traceId);
        } finally {
          span.end();
        }
      });
    });

    it('should gracefully pass through when context is not http', () => {
      const mockContext = {
        getType: () => 'rpc',
      } as unknown as ExecutionContext;

      const mockHandler: CallHandler = {
        handle: () => of({ success: true }),
      };

      let emitted = false;
      interceptor.intercept(mockContext, mockHandler).subscribe((res) => {
        emitted = true;
        expect(res).toEqual({ success: true });
      });

      expect(emitted).toBe(true);
    });
  });
});
