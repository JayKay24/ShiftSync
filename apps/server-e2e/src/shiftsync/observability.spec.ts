import axios from 'axios';

describe('OpenTelemetry & Observability Integration', () => {
  it('should return a 32-hex-character x-trace-id header on HTTP responses', async () => {
    const res = await axios.get('/api');
    expect(res.status).toBe(200);

    const traceId = res.headers['x-trace-id'];
    expect(traceId).toBeDefined();
    expect(typeof traceId).toBe('string');
    expect(traceId).toMatch(/^[0-9a-f]{32}$/);
  });

  it('should propagate incoming W3C traceparent header into the echoed x-trace-id', async () => {
    const customTraceId = '4bf92f3577b34da6a3ce929d0e0e4736';
    const parentSpanId = '00f067aa0ba902b7';
    const traceparent = `00-${customTraceId}-${parentSpanId}-01`;

    const res = await axios.get('/api', {
      headers: {
        traceparent,
      },
    });

    expect(res.status).toBe(200);
    expect(res.headers['x-trace-id']).toBe(customTraceId);
  });

  it('should expose x-trace-id in Access-Control-Expose-Headers for CORS callers', async () => {
    const res = await axios.get('/api', {
      headers: {
        Origin: 'http://localhost:3000',
      },
    });

    expect(res.status).toBe(200);
    const exposedHeaders = res.headers['access-control-expose-headers'];
    expect(exposedHeaders).toBeDefined();
    expect(exposedHeaders.toLowerCase()).toContain('x-trace-id');
  });
});
