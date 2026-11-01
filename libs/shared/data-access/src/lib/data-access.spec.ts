import {
  LoginRequestSchema,
  CreateShiftRequestSchema,
  UpdateProfileRequestSchema,
  CursorPaginationQuerySchema,
  SerializedDateTimeSchema,
  SafeUserSchema,
  ShiftResponseSchema,
  SwapRequestResponseSchema,
  createCursorPaginatedSchema,
} from './api-interfaces';

describe('Zod Validation and Response Schemas (@shiftsync/data-access)', () => {
  describe('SerializedDateTimeSchema', () => {
    it('should format a JavaScript Date into an ISO string', () => {
      const now = new Date('2026-10-19T17:00:00.000Z');
      const result = SerializedDateTimeSchema.parse(now);
      expect(result).toBe('2026-10-19T17:00:00.000Z');
    });

    it('should accept a valid ISO string', () => {
      const iso = '2026-10-19T17:00:00.000Z';
      const result = SerializedDateTimeSchema.parse(iso);
      expect(result).toBe(iso);
    });

    it('should reject invalid date strings', () => {
      expect(() => SerializedDateTimeSchema.parse('invalid-date')).toThrow();
    });

    it('should expose Standard JSON Schema converter for OpenAPI 3.0', () => {
      const standard = (SerializedDateTimeSchema as any)['~standard'];
      expect(standard).toBeDefined();
      expect(standard.jsonSchema).toBeDefined();
      const openapi = standard.jsonSchema.output({ target: 'openapi-3.0' });
      expect(openapi.type).toBe('string');
      expect(openapi.format).toBe('date-time');
    });
  });

  describe('LoginRequestSchema', () => {
    it('should validate valid email and password', () => {
      const valid = {
        email: 'charlie.staff@coastaleats.com',
        pass: 'password123',
      };
      const parsed = LoginRequestSchema.parse(valid);
      expect(parsed).toEqual(valid);
    });

    it('should reject invalid email format', () => {
      expect(() =>
        LoginRequestSchema.parse({
          email: 'not-an-email',
          pass: 'password123',
        }),
      ).toThrow();
    });

    it('should reject short passwords (< 6 characters)', () => {
      expect(() =>
        LoginRequestSchema.parse({
          email: 'charlie.staff@coastaleats.com',
          pass: '12345',
        }),
      ).toThrow();
    });
  });

  describe('CreateShiftRequestSchema', () => {
    it('should validate a complete valid shift creation request', () => {
      const payload = {
        locationId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        requiredSkillId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        startTime: '2026-10-19T17:00:00Z',
        endTime: '2026-10-19T23:00:00Z',
        headcountNeeded: 3,
        status: 'published' as const,
        isPremium: true,
      };
      const parsed = CreateShiftRequestSchema.parse(payload);
      expect(parsed.headcountNeeded).toBe(3);
      expect(parsed.isPremium).toBe(true);
    });

    it('should reject headcountNeeded less than 1', () => {
      expect(() =>
        CreateShiftRequestSchema.parse({
          locationId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          requiredSkillId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
          startTime: '2026-10-19T17:00:00Z',
          endTime: '2026-10-19T23:00:00Z',
          headcountNeeded: 0,
        }),
      ).toThrow();
    });
  });

  describe('UpdateProfileRequestSchema', () => {
    it('should validate partial profile updates', () => {
      const payload = {
        firstName: 'Alice',
        desiredWeeklyHours: 35,
      };
      const parsed = UpdateProfileRequestSchema.parse(payload);
      expect(parsed.firstName).toBe('Alice');
      expect(parsed.desiredWeeklyHours).toBe(35);
    });

    it('should reject desiredWeeklyHours over 168', () => {
      expect(() =>
        UpdateProfileRequestSchema.parse({
          desiredWeeklyHours: 170,
        }),
      ).toThrow();
    });
  });

  describe('CursorPaginationQuerySchema', () => {
    it('should coerce string numbers to integer limit', () => {
      const parsed = CursorPaginationQuerySchema.parse({
        cursor: 'eyJsYXN0SWQiOiIxMjMifQ',
        limit: '25',
      });
      expect(parsed.limit).toBe(25);
      expect(parsed.cursor).toBe('eyJsYXN0SWQiOiIxMjMifQ');
    });

    it('should reject limit greater than 100', () => {
      expect(() =>
        CursorPaginationQuerySchema.parse({
          limit: '150',
        }),
      ).toThrow();
    });
  });

  describe('SafeUserSchema', () => {
    it('should strip passwordHash and serialize Date to ISO string', () => {
      const rawUser = {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        email: 'charlie.staff@coastaleats.com',
        passwordHash: '$2a$10$hashedpasswordstringthatmustnotleak',
        firstName: 'Charlie',
        lastName: 'Staff',
        role: 'Staff' as const,
        timezone: 'America/New_York',
        desiredWeeklyHours: 40,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      };

      const parsed = SafeUserSchema.parse(rawUser);
      expect((parsed as any).passwordHash).toBeUndefined();
      expect(parsed.email).toBe('charlie.staff@coastaleats.com');
      expect(parsed.createdAt).toBe('2026-01-01T00:00:00.000Z');
    });
  });

  describe('createCursorPaginatedSchema', () => {
    it('should wrap item schema in paginated envelope', () => {
      const PaginatedShiftsSchema =
        createCursorPaginatedSchema(ShiftResponseSchema);
      const envelope = {
        data: [
          {
            id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            locationId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
            requiredSkillId: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
            startTime: new Date('2026-10-19T17:00:00Z'),
            endTime: new Date('2026-10-19T23:00:00Z'),
            headcountNeeded: 2,
            status: 'published' as const,
            isPremium: false,
            createdBy: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
          },
        ],
        nextCursor: 'next-page-token',
        hasMore: true,
      };

      const parsed = PaginatedShiftsSchema.parse(envelope);
      expect(parsed.hasMore).toBe(true);
      expect(parsed.data[0].startTime).toBe('2026-10-19T17:00:00.000Z');
    });

    it('should validate swap request response structure', () => {
      const swapResponse = {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        requestingUserId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        shiftId: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
        status: 'pending_peer' as const,
        reason: 'Family emergency on Friday night',
        createdAt: new Date('2026-10-19T10:00:00Z'),
        requestingUser: {
          id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
          email: 'charlie.staff@coastaleats.com',
          firstName: 'Charlie',
          lastName: 'Staff',
          role: 'Staff' as const,
          timezone: 'America/New_York',
          desiredWeeklyHours: 40,
          createdAt: new Date('2026-01-01T00:00:00Z'),
        },
        shift: {
          id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
          locationId: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
          requiredSkillId: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
          startTime: new Date('2026-10-19T17:00:00Z'),
          endTime: new Date('2026-10-19T23:00:00Z'),
          headcountNeeded: 1,
          status: 'published' as const,
          isPremium: false,
          createdBy: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        },
      };

      const parsed = SwapRequestResponseSchema.parse(swapResponse);
      expect(parsed.status).toBe('pending_peer');
      expect(parsed.createdAt).toBe('2026-10-19T10:00:00.000Z');
    });
  });
});
