import axios from 'axios';
import { login, TEST_USERS, seedDatabase } from '../support/test-helpers';

describe('Shift Cutoff & Past Assignment Constraints', () => {
  let managerToken: string;
  let adminToken: string;
  const loc1Id = '11111111-1111-4111-8111-111111111111'; // Downtown
  const staffId = '33333333-3333-4333-8333-333333333332'; // Charlie
  const bartenderSkillId = '22222222-2222-4222-8222-222222222221';

  beforeAll(async () => {
    seedDatabase();
    managerToken = await login(TEST_USERS.manager.email, TEST_USERS.manager.pass);
    adminToken = await login(TEST_USERS.admin.email, TEST_USERS.admin.pass);
  });

  async function safePost(url: string, data: any, token: string) {
    return axios.post(url, data, { headers: { Authorization: `Bearer ${token}` } });
  }

  async function safePatch(url: string, data: any, token: string) {
    return axios.patch(url, data, { headers: { Authorization: `Bearer ${token}` } });
  }

  describe('Constraint: No Past Shift Assignment', () => {
    it('should block a manager from assigning a staff member to a past shift', async () => {
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 24);

      // Create a past shift using Admin (who can bypass constraints if needed)
      const pastShift = await safePost('/api/shifts', {
        locationId: loc1Id,
        requiredSkillId: bartenderSkillId,
        startTime: pastDate.toISOString(),
        endTime: new Date(pastDate.getTime() + 4 * 3600000).toISOString(),
        headcountNeeded: 1,
        status: 'published'
      }, adminToken);

      try {
        await safePost(`/api/shifts/${pastShift.data.id}/assign`, { userId: staffId }, managerToken);
        throw new Error('Should have blocked past shift assignment');
      } catch (e) {
        expect(e.response.status).toBe(400);
        expect(e.response.data.message).toContain('Cannot assign staff to a shift that has already started or passed');
      }
    });
  });

  describe('Constraint: 48h Schedule Edit Cutoff', () => {
    it('should block a manager from editing a shift within 48h of start time', async () => {
      const nearFutureDate = new Date();
      nearFutureDate.setHours(nearFutureDate.getHours() + 24); // 24h from now < 48h

      const nearShift = await safePost('/api/shifts', {
        locationId: loc1Id,
        requiredSkillId: bartenderSkillId,
        startTime: nearFutureDate.toISOString(),
        endTime: new Date(nearFutureDate.getTime() + 4 * 3600000).toISOString(),
        headcountNeeded: 1,
        status: 'published'
      }, adminToken);

      try {
        await safePatch(`/api/shifts/${nearShift.data.id}`, { headcountNeeded: 2 }, managerToken);
        throw new Error('Should have blocked edit within 48h');
      } catch (e) {
        expect(e.response.status).toBe(400);
        expect(e.response.data.message).toContain('Shifts cannot be edited or unpublished within 48 hours');
      }
    });

    it('should allow an admin to bypass the 48h edit cutoff', async () => {
      const nearFutureDate = new Date();
      nearFutureDate.setHours(nearFutureDate.getHours() + 12); // 12h from now

      const nearShift = await safePost('/api/shifts', {
        locationId: loc1Id,
        requiredSkillId: bartenderSkillId,
        startTime: nearFutureDate.toISOString(),
        endTime: new Date(nearFutureDate.getTime() + 4 * 3600000).toISOString(),
        headcountNeeded: 1,
        status: 'published'
      }, adminToken);

      const res = await safePatch(`/api/shifts/${nearShift.data.id}`, { headcountNeeded: 3 }, adminToken);
      expect(res.status).toBe(200);
      expect(res.data.headcountNeeded).toBe(3);
    });

    it('should allow a manager to edit a shift more than 48h in the future', async () => {
      const farFutureDate = new Date();
      farFutureDate.setHours(farFutureDate.getHours() + 72); // 72h from now > 48h

      const farShift = await safePost('/api/shifts', {
        locationId: loc1Id,
        requiredSkillId: bartenderSkillId,
        startTime: farFutureDate.toISOString(),
        endTime: new Date(farFutureDate.getTime() + 4 * 3600000).toISOString(),
        headcountNeeded: 1,
        status: 'published'
      }, adminToken);

      const res = await safePatch(`/api/shifts/${farShift.data.id}`, { headcountNeeded: 2 }, managerToken);
      expect(res.status).toBe(200);
      expect(res.data.headcountNeeded).toBe(2);
    });
  });
});
