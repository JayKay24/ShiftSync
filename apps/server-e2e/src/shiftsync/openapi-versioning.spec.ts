import axios from 'axios';
import { login, TEST_USERS } from '../support/test-helpers';

describe('API Versioning, OpenAPI / Swagger, and Zod Validation', () => {
  describe('URI API Versioning', () => {
    it('should serve the version-neutral health probe at GET /api', async () => {
      const res = await axios.get('/api');
      expect(res.status).toBe(200);
      expect(res.data).toEqual({ message: 'Hello API' });
    });

    it('should reject unversioned domain endpoints with 404 Not Found', async () => {
      try {
        await axios.get('/api/shifts');
        expect.unreachable('Should have failed with 404');
      } catch (err: any) {
        expect(err.response?.status).toBe(404);
      }
    });

    it('should successfully access versioned domain endpoints at /api/v1/shifts/skills', async () => {
      const token = await login(
        TEST_USERS.charlie.email,
        TEST_USERS.charlie.pass,
      );
      const res = await axios.get('/api/v1/shifts/skills', {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
    });
  });

  describe('Zod Request Validation & Response Serialization', () => {
    it('should reject invalid request bodies with 400 Bad Request via StandardSchemaValidationPipe', async () => {
      try {
        await axios.post('/api/v1/auth/login', {
          email: 'not-an-email',
          pass: '123', // less than 6 chars
        });
        expect.unreachable('Should have failed with 400');
      } catch (err: any) {
        expect(err.response?.status).toBe(400);
        expect(err.response?.data?.message).toBeDefined();
      }
    });

    it('should strip sensitive fields like passwordHash from responses via StandardSchemaSerializerInterceptor', async () => {
      const res = await axios.post('/api/v1/auth/login', {
        email: TEST_USERS.charlie.email,
        pass: TEST_USERS.charlie.pass,
      });

      expect(res.status).toBe(201);
      expect(res.data.access_token).toBeDefined();
      expect(res.data.user).toBeDefined();
      expect(res.data.user.email).toBe(TEST_USERS.charlie.email);
      expect(res.data.user.passwordHash).toBeUndefined();
    });
  });

  describe('OpenAPI / Swagger Documentation', () => {
    it('should expose the OpenAPI specification at /api/docs-json', async () => {
      const res = await axios.get('/api/docs-json');
      expect(res.status).toBe(200);
      expect(res.data).toBeDefined();

      // Verify OpenAPI structure and metadata
      expect(res.data.openapi).toMatch(/^3\./);
      expect(res.data.info?.title).toBe('ShiftSync API (Coastal Eats)');
      expect(res.data.info?.version).toBe('1.0');

      // Verify JWT Bearer security scheme definition
      expect(res.data.components?.securitySchemes?.JWT).toBeDefined();
      expect(res.data.components.securitySchemes.JWT.type).toBe('http');
      expect(res.data.components.securitySchemes.JWT.scheme).toBe('bearer');

      // Verify domain tags are registered
      const tagNames = res.data.tags?.map((t: any) => t.name) ?? [];
      expect(tagNames).toContain('Health');
      expect(tagNames).toContain('Auth');
      expect(tagNames).toContain('Shifts');
      expect(tagNames).toContain('Swaps');
      expect(tagNames).toContain('Users');
      expect(tagNames).toContain('Analytics');
      expect(tagNames).toContain('Audit');
      expect(tagNames).toContain('Notifications');

      // Verify paths are mapped under /api/v1
      const paths = Object.keys(res.data.paths ?? {});
      expect(paths).toContain('/api/v1/auth/login');
      expect(paths).toContain('/api/v1/shifts');
      expect(paths).toContain('/api/v1/swaps');
      expect(paths).toContain('/api/v1/analytics/fairness');
    });
  });
});
