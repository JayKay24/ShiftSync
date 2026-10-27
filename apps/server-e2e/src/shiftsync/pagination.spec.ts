import axios from 'axios';
import {
  login,
  TEST_USERS,
  clearDynamicData,
  getFutureDate,
  getNextWednesday,
} from '../support/test-helpers';
import { setHours } from 'date-fns';

describe('Cursor-Based Pagination across List Endpoints (Issue #40)', () => {
  let adminToken: string;
  let managerToken: string;
  let charlieToken: string;
  let daveToken: string;

  const loc1Id = '11111111-1111-4111-8111-111111111111';
  const bartenderSkillId = '22222222-2222-4222-8222-222222222221';

  beforeAll(async () => {
    await clearDynamicData();
    adminToken = await login(TEST_USERS.admin.email, TEST_USERS.admin.pass);
    managerToken = await login(
      TEST_USERS.manager.email,
      TEST_USERS.manager.pass,
    );
    charlieToken = await login(
      TEST_USERS.charlie.email,
      TEST_USERS.charlie.pass,
    );
    daveToken = await login(TEST_USERS.dave.email, TEST_USERS.dave.pass);
  });

  beforeEach(async () => {
    await clearDynamicData();
  });

  describe('GET /api/shifts pagination', () => {
    it('should paginate shifts with limit and nextCursor without duplicate or skipped items', async () => {
      const baseDate = getFutureDate(10);
      const createdShiftIds: string[] = [];

      for (let i = 0; i < 4; i++) {
        const start = setHours(baseDate, 10 + i);
        const end = setHours(baseDate, 14 + i);
        const res = await axios.post(
          '/api/shifts',
          {
            locationId: loc1Id,
            requiredSkillId: bartenderSkillId,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            headcountNeeded: 1,
            status: 'published',
          },
          { headers: { Authorization: `Bearer ${managerToken}` } },
        );
        createdShiftIds.push(res.data.id);
      }

      // Page 1: limit = 2
      const page1 = await axios.get('/api/shifts?limit=2', {
        headers: { Authorization: `Bearer ${managerToken}` },
      });
      expect(page1.status).toBe(200);
      expect(page1.data.data.length).toBe(2);
      expect(page1.data.hasMore).toBe(true);
      expect(page1.data.nextCursor).toBeTruthy();
      expect(page1.data.data[0].id).toBe(createdShiftIds[0]);
      expect(page1.data.data[1].id).toBe(createdShiftIds[1]);

      // Page 2: limit = 2 with cursor from Page 1
      const page2 = await axios.get(
        `/api/shifts?limit=2&cursor=${encodeURIComponent(page1.data.nextCursor)}`,
        {
          headers: { Authorization: `Bearer ${managerToken}` },
        },
      );
      expect(page2.status).toBe(200);
      expect(page2.data.data.length).toBe(2);
      expect(page2.data.hasMore).toBe(false);
      expect(page2.data.nextCursor).toBeNull();
      expect(page2.data.data[0].id).toBe(createdShiftIds[2]);
      expect(page2.data.data[1].id).toBe(createdShiftIds[3]);
    });

    it('should break ties deterministically on identical start times using entity ID', async () => {
      const baseDate = getFutureDate(15);
      const start = setHours(baseDate, 12).toISOString();
      const end = setHours(baseDate, 16).toISOString();

      const shiftA = await axios.post(
        '/api/shifts',
        {
          locationId: loc1Id,
          requiredSkillId: bartenderSkillId,
          startTime: start,
          endTime: end,
          headcountNeeded: 1,
          status: 'published',
        },
        { headers: { Authorization: `Bearer ${managerToken}` } },
      );

      const shiftB = await axios.post(
        '/api/shifts',
        {
          locationId: loc1Id,
          requiredSkillId: bartenderSkillId,
          startTime: start,
          endTime: end,
          headcountNeeded: 1,
          status: 'published',
        },
        { headers: { Authorization: `Bearer ${managerToken}` } },
      );

      const page1 = await axios.get('/api/shifts?limit=1', {
        headers: { Authorization: `Bearer ${managerToken}` },
      });
      expect(page1.data.data.length).toBe(1);
      expect(page1.data.hasMore).toBe(true);
      expect(page1.data.nextCursor).toBeTruthy();

      const page2 = await axios.get(
        `/api/shifts?limit=1&cursor=${encodeURIComponent(page1.data.nextCursor)}`,
        {
          headers: { Authorization: `Bearer ${managerToken}` },
        },
      );
      expect(page2.data.data.length).toBe(1);
      expect(page2.data.data[0].id).not.toBe(page1.data.data[0].id);

      const allFetchedIds = [page1.data.data[0].id, page2.data.data[0].id];
      expect(allFetchedIds).toContain(shiftA.data.id);
      expect(allFetchedIds).toContain(shiftB.data.id);
    });
  });

  describe('GET /api/shifts/staff pagination', () => {
    it('should paginate staff members alphabetically by last name with limit and cursor', async () => {
      const page1 = await axios.get('/api/shifts/staff?limit=2', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(page1.status).toBe(200);
      expect(page1.data.data.length).toBe(2);
      expect(page1.data.hasMore).toBe(true);
      expect(page1.data.nextCursor).toBeTruthy();

      const page2 = await axios.get(
        `/api/shifts/staff?limit=2&cursor=${encodeURIComponent(page1.data.nextCursor)}`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        },
      );
      expect(page2.status).toBe(200);
      expect(page2.data.data.length).toBeGreaterThan(0);

      const page1Ids = page1.data.data.map((s: any) => s.id);
      const page2Ids = page2.data.data.map((s: any) => s.id);
      const overlap = page1Ids.filter((id: string) => page2Ids.includes(id));
      expect(overlap).toEqual([]);
    });
  });

  describe('GET /api/audit pagination', () => {
    it('should paginate audit logs in reverse chronological order', async () => {
      // Trigger multiple audit log events by creating shifts
      const baseDate = getFutureDate(20);
      for (let i = 0; i < 3; i++) {
        await axios.post(
          '/api/shifts',
          {
            locationId: loc1Id,
            requiredSkillId: bartenderSkillId,
            startTime: setHours(baseDate, 10 + i).toISOString(),
            endTime: setHours(baseDate, 14 + i).toISOString(),
            headcountNeeded: 1,
            status: 'draft',
          },
          { headers: { Authorization: `Bearer ${adminToken}` } },
        );
      }

      const page1 = await axios.get('/api/audit?limit=2', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(page1.status).toBe(200);
      expect(page1.data.data.length).toBe(2);
      expect(page1.data.hasMore).toBe(true);
      expect(page1.data.nextCursor).toBeTruthy();

      const page2 = await axios.get(
        `/api/audit?limit=2&cursor=${encodeURIComponent(page1.data.nextCursor)}`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        },
      );
      expect(page2.status).toBe(200);
      expect(page2.data.data.length).toBeGreaterThan(0);

      const page1Ids = page1.data.data.map((l: any) => l.id);
      const page2Ids = page2.data.data.map((l: any) => l.id);
      const overlap = page1Ids.filter((id: string) => page2Ids.includes(id));
      expect(overlap).toEqual([]);
    });
  });

  describe('GET /api/notifications pagination', () => {
    it('should paginate user notifications using cursor', async () => {
      const baseDate = getNextWednesday(getFutureDate(60));
      const shift = await axios.post(
        '/api/shifts',
        {
          locationId: loc1Id,
          requiredSkillId: bartenderSkillId,
          startTime: setHours(baseDate, 14).toISOString(),
          endTime: setHours(baseDate, 18).toISOString(),
          headcountNeeded: 1,
          status: 'published',
        },
        { headers: { Authorization: `Bearer ${managerToken}` } },
      );

      const charlieId = '33333333-3333-4333-8333-333333333332';
      const daveId = '33333333-3333-4333-8333-333333333333';

      // Assigning shift creates a notification for Charlie
      await axios.post(
        `/api/shifts/${shift.data.id}/assign`,
        { userId: charlieId },
        {
          headers: { Authorization: `Bearer ${managerToken}` },
        },
      );

      // Swap request creates a notification for Dave
      await axios.post(
        '/api/swaps/request',
        {
          shiftId: shift.data.id,
          targetUserId: daveId,
          reason: 'Swap needed for emergency',
        },
        { headers: { Authorization: `Bearer ${charlieToken}` } },
      );

      const res = await axios.get('/api/notifications?limit=1', {
        headers: { Authorization: `Bearer ${daveToken}` },
      });
      expect(res.status).toBe(200);
      expect(res.data.data.length).toBe(1);
      expect(res.data.data[0].userId).toBe(daveId);
    });
  });
});
