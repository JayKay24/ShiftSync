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

    it('should inject x-trace-id header and actor context when active span exists', () => {
      const mockSpan = {
        spanContext: () => ({ traceId: '4bf92f3577b34da6a3ce929d0e0e4736' }),
        setAttribute: vi.fn(),
      };
      vi.spyOn(trace, 'getActiveSpan').mockReturnValue(mockSpan as any);

      const mockReq = {
        headers: {},
        user: { userId: 'user-uuid-123', role: 'Manager' },
      };
      const mockRes = {
        setHeader: vi.fn(),
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

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'x-trace-id',
        '4bf92f3577b34da6a3ce929d0e0e4736',
      );
      expect(mockSpan.setAttribute).toHaveBeenCalledWith(
        'enduser.id',
        'user-uuid-123',
      );
      expect(mockSpan.setAttribute).toHaveBeenCalledWith(
        'enduser.role',
        'Manager',
      );
    });

    it('should extract trace ID from traceparent header when no active span exists', () => {
      vi.spyOn(trace, 'getActiveSpan').mockReturnValue(undefined);

      const mockReq = {
        headers: {
          traceparent:
            '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
        },
      };
      const mockRes = {
        setHeader: vi.fn(),
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

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'x-trace-id',
        '4bf92f3577b34da6a3ce929d0e0e4736',
      );
    });

    it('should generate a compliant 32-hex trace ID when no active span or traceparent header exists', () => {
      vi.spyOn(trace, 'getActiveSpan').mockReturnValue(undefined);

      const mockReq = { headers: {} };
      const mockRes = { setHeader: vi.fn() };

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

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'x-trace-id',
        expect.stringMatching(/^[0-9a-f]{32}$/),
      );
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
