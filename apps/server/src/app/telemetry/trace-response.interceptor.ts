/**
 * @fileoverview Interceptor injecting active OpenTelemetry trace IDs into HTTP response headers.
 *
 * Exposes 'x-trace-id' on outgoing responses to allow frontend clients, browser DevTools,
 * and test harnesses to correlate any API response directly to backend traces in Tempo.
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { trace } from '@opentelemetry/api';
import { Response } from 'express';

/**
 * Interceptor that sets the 'x-trace-id' header and enriches the active span with actor context.
 */
@Injectable()
export class TraceResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() === 'http') {
      const http = context.switchToHttp();
      const req = http.getRequest();
      const res = http.getResponse<Response>();

      const activeSpan = trace.getActiveSpan();
      if (activeSpan) {
        const spanContext = activeSpan.spanContext();
        if (spanContext.traceId) {
          res.setHeader('x-trace-id', spanContext.traceId);
        }

        // Enrich span with actor context if user is authenticated
        if (req.user?.userId) {
          activeSpan.setAttribute('enduser.id', req.user.userId);
        }
        if (req.user?.role) {
          activeSpan.setAttribute('enduser.role', req.user.role);
        }
      }
    }

    return next.handle();
  }
}
