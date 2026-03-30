import axios from 'axios';
import { login, TEST_USERS, clearDynamicData, getFutureDate } from '../support/test-helpers';
import { addDays, addHours, setHours } from 'date-fns';

describe('Labor Law Compliance (Requirement #4)', () => {
  let managerToken: string;
  const loc1Id = '11111111-1111-4111-8111-111111111111';
  const bartenderSkillId = '22222222-2222-4222-8222-222222222221';
  const lineCookSkillId = '22222222-2222-4222-8222-222222222222';
  const frankId = '33333333-3333-4333-8333-333333333335'; // Frank (24/7 available)

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

  describe('Scenario: The Overtime Trap (12-hour Hard Block)', () => {
    it('should block a 13th hour in a single day', async () => {
      await clearDynamicData();
      const futureDate = getFutureDate(20);
      const shift13h = await safePost('/api/shifts', {
        locationId: loc1Id,
        requiredSkillId: lineCookSkillId,
        startTime: setHours(futureDate, 6).toISOString(),
        endTime: setHours(futureDate, 19).toISOString(),
        headcountNeeded: 1,
        status: 'published'
      }, managerToken);

      try {
        await axios.post(`/api/shifts/${shift13h.data.id}/assign`, {
          userId: frankId
        }, { headers: { Authorization: `Bearer ${managerToken}` } });
        throw new Error('Should have blocked >12h daily limit');
      } catch (e) {
        expect(e.response.status).toBe(400);
        expect(e.response.data.message).toContain('Daily hours');
        expect(e.response.data.message).toContain('exceed 12-hour hard block limit');
      }
    });
  });

  describe('Scenario: 7th Consecutive Day Override', () => {
      it('should require a reason to override 7th day assignment', async () => {
          await clearDynamicData();
          // Assign shifts for 6 days starting 21 days in the future
          const baseDate = getFutureDate(21);

          for (let i = 0; i < 6; i++) {
            const currentDay = addDays(baseDate, i);
            const s = await safePost('/api/shifts', {
                locationId: loc1Id,
                requiredSkillId: lineCookSkillId,
                startTime: setHours(currentDay, 12).toISOString(),
                endTime: setHours(currentDay, 16).toISOString(),
                headcountNeeded: 1,
                status: 'published'
              }, managerToken);
              
              await safePost(`/api/shifts/${s.data.id}/assign`, { userId: frankId }, managerToken);
          }

          // 7th Day
          const day7Date = addDays(baseDate, 6);
          const day7 = await safePost('/api/shifts', {
            locationId: loc1Id,
            requiredSkillId: lineCookSkillId,
            startTime: setHours(day7Date, 12).toISOString(),
            endTime: setHours(day7Date, 16).toISOString(),
            headcountNeeded: 1,
            status: 'published'
          }, managerToken);

          // Try without reason
          try {
            await axios.post(`/api/shifts/${day7.data.id}/assign`, {
              userId: frankId
            }, { headers: { Authorization: `Bearer ${managerToken}` } });
            throw new Error('Should have required override reason');
          } catch (e) {
            expect(e.response.data.code).toBe('OVERRIDE_REQUIRED');
          }

          // Try with reason
          const res = await safePost(`/api/shifts/${day7.data.id}/assign`, {
            userId: frankId,
            overrideReason: 'Staff agreed to extra day'
          }, managerToken);

          expect(res.status).toBe(201);
      });
  });
});
