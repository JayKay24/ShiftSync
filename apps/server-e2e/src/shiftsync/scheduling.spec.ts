import axios from 'axios';
import { login, TEST_USERS, clearDynamicData, getNextWednesday, getFutureDate } from '../support/test-helpers';
import { addHours, setHours } from 'date-fns';

describe('Shift Scheduling & Constraints (Requirement #2)', () => {
  let managerToken: string;
  const loc1Id = '11111111-1111-4111-8111-111111111111'; // Downtown
  const staffId = '33333333-3333-4333-8333-333333333332'; // Charlie (Unavailable Mondays)
  const bartenderSkillId = '22222222-2222-4222-8222-222222222221';

  beforeAll(async () => {
    await clearDynamicData();
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
      await clearDynamicData();
      // Use Wednesday in the future to avoid seed and cutoff
      const baseDate = getFutureDate(10);
      const startTime = setHours(getNextWednesday(baseDate), 14);
      const endTime = addHours(startTime, 4);

      const shiftA = await safePost('/api/shifts', {
        locationId: loc1Id,
        requiredSkillId: bartenderSkillId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        headcountNeeded: 1,
        status: 'published'
      }, managerToken);

      await safePost(`/api/shifts/${shiftA.data.id}/assign`, { userId: staffId }, managerToken);

      // Overlapping shift (Shift B starts 2h after Shift A)
      const shiftB = await safePost('/api/shifts', {
        locationId: loc1Id,
        requiredSkillId: bartenderSkillId,
        startTime: addHours(startTime, 2).toISOString(),
        endTime: addHours(startTime, 6).toISOString(),
        headcountNeeded: 1,
        status: 'published'
      }, managerToken);

      try {
        await axios.post(`/api/shifts/${shiftB.data.id}/assign`, {
          userId: staffId
        }, { headers: { Authorization: `Bearer ${managerToken}` } });
        throw new Error('Should have blocked overlapping assignment');
      } catch (e) {
        expect(e.response.status).toBe(400);
        expect(e.response.data.message).toContain('overlapping shift');
      }
    });
  });

  describe('Constraint: Minimum 10-Hour Rest', () => {
    it('should block an assignment that violates the 10-hour rest gap', async () => {
      await clearDynamicData();
      // Use different day from overlap test (e.g. Wednesday + 1 day = Thursday)
      const baseDate = getFutureDate(11);
      const startTime = setHours(getNextWednesday(baseDate), 14);
      const endTime = addHours(startTime, 4);

      const shiftC = await safePost('/api/shifts', {
        locationId: loc1Id,
        requiredSkillId: bartenderSkillId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        headcountNeeded: 1,
        status: 'published'
      }, managerToken);

      await safePost(`/api/shifts/${shiftC.data.id}/assign`, { userId: staffId }, managerToken);

      // Only 8 hours rest
      const shiftD = await safePost('/api/shifts', {
        locationId: loc1Id,
        requiredSkillId: bartenderSkillId,
        startTime: addHours(endTime, 8).toISOString(),
        endTime: addHours(endTime, 12).toISOString(),
        headcountNeeded: 1,
        status: 'published'
      }, managerToken);

      try {
        await axios.post(`/api/shifts/${shiftD.data.id}/assign`, {
          userId: staffId
        }, { headers: { Authorization: `Bearer ${managerToken}` } });
        throw new Error('Should have blocked assignment due to 10-hour rest');
      } catch (e) {
        expect(e.response.status).toBe(400);
        expect(e.response.data.message).toContain('Minimum 10-hour rest period required');
      }
    });
  });
});
