import axios from 'axios';
import { login, TEST_USERS, seedDatabase } from '../support/test-helpers';

describe('Labor Law Compliance (Requirement #4)', () => {
  let managerToken: string;
  const loc1Id = '11111111-1111-4111-8111-111111111111';
  const bartenderSkillId = '22222222-2222-4222-8222-222222222221';
  const lineCookSkillId = '22222222-2222-4222-8222-222222222222';
  const frankId = '33333333-3333-4333-8333-333333333335'; // Frank (24/7 available)

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
      const shift13h = await safePost('/api/shifts', {
        locationId: loc1Id,
        requiredSkillId: lineCookSkillId,
        startTime: new Date('2026-04-01T06:00:00Z').toISOString(),
        endTime: new Date('2026-04-01T19:00:00Z').toISOString(),
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
          // Assign shifts for 6 days (Wed Apr 1st - Mon Apr 6th)
          for (let i = 1; i <= 6; i++) {
            const dateStr = `2026-04-0${i}`;
            const s = await safePost('/api/shifts', {
                locationId: loc1Id,
                requiredSkillId: lineCookSkillId,
                startTime: new Date(`${dateStr}T12:00:00Z`).toISOString(),
                endTime: new Date(`${dateStr}T16:00:00Z`).toISOString(),
                headcountNeeded: 1,
                status: 'published'
              }, managerToken);
              
              await safePost(`/api/shifts/${s.data.id}/assign`, { userId: frankId }, managerToken);
          }

          // 7th Day: Tue Apr 7th
          const day7 = await safePost('/api/shifts', {
            locationId: loc1Id,
            requiredSkillId: lineCookSkillId,
            startTime: new Date('2026-04-07T12:00:00Z').toISOString(),
            endTime: new Date('2026-04-07T16:00:00Z').toISOString(),
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
