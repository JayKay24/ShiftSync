import axios from 'axios';
import { login, TEST_USERS, seedDatabase } from '../support/test-helpers';

describe('Labor Law Compliance (Requirement #4)', () => {
  let managerToken: string;
  const loc1Id = '11111111-1111-4111-8111-111111111111';
  const staffId = '33333333-3333-4333-8333-333333333332';
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

  describe('Scenario: The Overtime Trap (12-hour Hard Block)', () => {
    it('should block a 13th hour in a single day', async () => {
      // 1. Create 8-hour shift (08:00 - 16:00)
      const shift8h = await safePost('/api/shifts', {
        locationId: loc1Id,
        requiredSkillId: bartenderSkillId,
        startTime: new Date('2026-04-10T08:00:00Z').toISOString(),
        endTime: new Date('2026-04-10T16:00:00Z').toISOString(),
        headcountNeeded: 1,
        status: 'published'
      }, managerToken);

      await safePost(`/api/shifts/${shift8h.data.id}/assign`, { userId: staffId }, managerToken);

      // 2. Create another 4-hour shift (Starts 10 hours later to avoid rest-period trap)
      // 16:00 + 10 hours = 02:00 next day? No, Requirement says "Daily hours" (same day).
      // Let's use a 12-hour shift directly, then try to add 1 more hour.
      // But 12-hour shift + 1-hour shift on same day = 13 hours.
      // To avoid rest-period, they must have 10 hours between them.
      // Shift A: 00:00 - 06:00 (6h)
      // Shift B: 16:00 - 22:00 (6h) -> Total 12h.
      // Shift C: 23:00 - 00:00 -> This would violate rest period with B.
      
      // Actually, if they are on the SAME day, we can just test if a SINGLE 13-hour shift is blocked.
      const shift13h = await safePost('/api/shifts', {
        locationId: loc1Id,
        requiredSkillId: bartenderSkillId,
        startTime: new Date('2026-04-11T06:00:00Z').toISOString(),
        endTime: new Date('2026-04-11T19:00:00Z').toISOString(),
        headcountNeeded: 1,
        status: 'published'
      }, managerToken);

      try {
        await axios.post(`/api/shifts/${shift13h.data.id}/assign`, {
          userId: staffId
        }, { headers: { Authorization: `Bearer ${managerToken}` } });
        throw new Error('Should have blocked >12h daily limit');
      } catch (e) {
        expect(e.response.status).toBe(400);
        expect(e.response.data.message).toContain('Hard Block: Daily hours exceed 12-hour hard block limit');
      }
    });
  });

  describe('Scenario: 7th Consecutive Day Override', () => {
      it('should require a reason to override 7th day assignment', async () => {
          // Setup: Assign shifts for 6 days (April 12th - 17th)
          // Use 4-hour shifts to stay well under the 12h/day and 40h/week limits.
          for (let i = 12; i <= 17; i++) {
            const s = await safePost('/api/shifts', {
                locationId: loc1Id,
                requiredSkillId: bartenderSkillId,
                startTime: new Date(`2026-04-${i}T12:00:00Z`).toISOString(),
                endTime: new Date(`2026-04-${i}T16:00:00Z`).toISOString(),
                headcountNeeded: 1,
                status: 'published'
              }, managerToken);
              
              await safePost(`/api/shifts/${s.data.id}/assign`, { userId: staffId }, managerToken);
          }

          // 7th Day Shift (April 18th)
          const day7 = await safePost('/api/shifts', {
            locationId: loc1Id,
            requiredSkillId: bartenderSkillId,
            startTime: new Date('2026-04-18T12:00:00Z').toISOString(),
            endTime: new Date('2026-04-18T16:00:00Z').toISOString(),
            headcountNeeded: 1,
            status: 'published'
          }, managerToken);

          // Try without reason
          try {
            await axios.post(`/api/shifts/${day7.data.id}/assign`, {
              userId: staffId
            }, { headers: { Authorization: `Bearer ${managerToken}` } });
            throw new Error('Should have required override reason');
          } catch (e) {
            expect(e.response.data.code).toBe('OVERRIDE_REQUIRED');
          }

          // Try with reason
          const res = await safePost(`/api/shifts/${day7.data.id}/assign`, {
            userId: staffId,
            overrideReason: 'Staff agreed to extra day'
          }, managerToken);

          expect(res.status).toBe(201);
      });
  });
});
