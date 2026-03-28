import axios from 'axios';
import { login, TEST_USERS, seedDatabase } from '../support/test-helpers';

describe('Shift Scheduling & Constraints (Requirement #2)', () => {
  let managerToken: string;
  const loc1Id = '11111111-1111-4111-8111-111111111111'; // Downtown
  const staffId = '33333333-3333-4333-8333-333333333332'; // Charlie
  const bartenderSkillId = '22222222-2222-4222-8222-222222222221';

  beforeAll(async () => {
    seedDatabase();
    managerToken = await login(TEST_USERS.manager.email, TEST_USERS.manager.pass);
  });

  async function safePost(url: string, data: any, token: string) {
    try {
      return await axios.post(url, data, { headers: { Authorization: `Bearer ${token}` } });
    } catch (e) {
      const errorMsg = e.response?.data?.message || e.message;
      const errorCode = e.response?.data?.code || 'NO_CODE';
      throw new Error(`API POST ${url} failed: [${e.response?.status}] ${JSON.stringify(errorMsg)} (Code: ${errorCode})`);
    }
  }

  describe('Constraint: No Double-Booking (Overlapping)', () => {
    it('should block a manager from assigning a staff member to an overlapping shift', async () => {
      // 1. Create Shift A (12:00 - 16:00)
      const shiftA = await safePost('/api/shifts', {
        locationId: loc1Id,
        requiredSkillId: bartenderSkillId,
        startTime: new Date('2026-04-01T12:00:00Z').toISOString(),
        endTime: new Date('2026-04-01T16:00:00Z').toISOString(),
        headcountNeeded: 1,
        status: 'published'
      }, managerToken);

      // 2. Assign Charlie to Shift A
      await safePost(`/api/shifts/${shiftA.data.id}/assign`, { userId: staffId }, managerToken);

      // 3. Create Shift B (14:00 - 18:00) - Overlaps with A
      const shiftB = await safePost('/api/shifts', {
        locationId: loc1Id,
        requiredSkillId: bartenderSkillId,
        startTime: new Date('2026-04-01T14:00:00Z').toISOString(),
        endTime: new Date('2026-04-01T18:00:00Z').toISOString(),
        headcountNeeded: 1,
        status: 'published'
      }, managerToken);

      // 4. Try to assign Charlie to Shift B - EXPECT FAILURE
      try {
        await axios.post(`/api/shifts/${shiftB.data.id}/assign`, {
          userId: staffId
        }, { headers: { Authorization: `Bearer ${managerToken}` } });
        throw new Error('Should have blocked overlapping assignment');
      } catch (e) {
        if (!e.response) throw e;
        expect(e.response.status).toBe(400);
        expect(e.response.data.message).toContain('Staff member has an overlapping shift');
      }
    });
  });

  describe('Constraint: Minimum 10-Hour Rest', () => {
    it('should block an assignment that violates the 10-hour rest gap', async () => {
      // 1. Create Shift C (Ends at 22:00)
      const shiftC = await safePost('/api/shifts', {
        locationId: loc1Id,
        requiredSkillId: bartenderSkillId,
        startTime: new Date('2026-04-02T18:00:00Z').toISOString(),
        endTime: new Date('2026-04-02T22:00:00Z').toISOString(),
        headcountNeeded: 1,
        status: 'published'
      }, managerToken);

      await safePost(`/api/shifts/${shiftC.data.id}/assign`, { userId: staffId }, managerToken);

      // 2. Create Shift D (Starts at 04:00 next day) - Only 6 hours rest
      const shiftD = await safePost('/api/shifts', {
        locationId: loc1Id,
        requiredSkillId: bartenderSkillId,
        startTime: new Date('2026-04-03T04:00:00Z').toISOString(),
        endTime: new Date('2026-04-03T08:00:00Z').toISOString(),
        headcountNeeded: 1,
        status: 'published'
      }, managerToken);

      // 3. Try to assign Charlie to Shift D - EXPECT FAILURE
      try {
        await axios.post(`/api/shifts/${shiftD.data.id}/assign`, {
          userId: staffId
        }, { headers: { Authorization: `Bearer ${managerToken}` } });
        throw new Error('Should have blocked assignment due to 10-hour rest');
      } catch (e) {
        if (!e.response) throw e;
        expect(e.response.status).toBe(400);
        expect(e.response.data.message).toContain('Minimum 10-hour rest period required between shifts');
      }
    });
  });
});
