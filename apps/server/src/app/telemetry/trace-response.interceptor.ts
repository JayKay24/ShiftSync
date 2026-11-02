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
import { Response, Request } from 'express';
import { randomBytes } from 'crypto';

/**
 * Interceptor that sets the 'x-trace-id' header and enriches the active span with actor context.
 */
@Injectable()
export class TraceResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() === 'http') {
      const http = context.switchToHttp();
      const req = http.getRequest<Request>();
      const res = http.getResponse<Response>();

      const activeSpan = trace.getActiveSpan();
      let traceId = activeSpan?.spanContext()?.traceId;

      if (!traceId) {
        const traceparent = req.headers?.traceparent;
        if (typeof traceparent === 'string') {
          const match = traceparent.match(
            /^00-([0-9a-f]{32})-[0-9a-f]{16}-[0-9a-f]{2}$/,
          );
          if (match) {
            traceId = match[1];
          }
        }
      }

      if (!traceId) {
        traceId = randomBytes(16).toString('hex');
      }

      res.setHeader('x-trace-id', traceId);

      if (activeSpan) {
        // Enrich span with actor context if user is authenticated
        const user = (
          req as unknown as {
            user?: { userId?: string; id?: string; role?: string };
          }
        ).user;
        const userId = user?.userId || user?.id;
        if (userId) {
          activeSpan.setAttribute('enduser.id', userId);
        }
        if (user?.role) {
          activeSpan.setAttribute('enduser.role', user.role);
        }
      }
    }

    return next.handle();
  }
}
