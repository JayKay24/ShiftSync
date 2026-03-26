import axios from 'axios';
import { login, TEST_USERS } from '../support/test-helpers';

describe('Labor Law Compliance (Requirement #4)', () => {
  let managerToken: string;
  const loc1Id = '11111111-1111-4111-8111-111111111111';
  const staffId = '33333333-3333-4333-8333-333333333332';
  const bartenderSkillId = '22222222-2222-4222-8222-222222222221';

  beforeAll(async () => {
    managerToken = await login(TEST_USERS.manager.email, TEST_USERS.manager.pass);
  });

  describe('Scenario: The Overtime Trap (12-hour Hard Block)', () => {
    it('should block a 13th hour in a single day', async () => {
      // 1. Create 12-hour shift (08:00 - 20:00)
      const shift12h = await axios.post('/api/shifts', {
        locationId: loc1Id,
        requiredSkillId: bartenderSkillId,
        startTime: new Date('2026-04-10T08:00:00Z').toISOString(),
        endTime: new Date('2026-04-10T20:00:00Z').toISOString(),
        headcountNeeded: 1,
        status: 'published'
      }, { headers: { Authorization: `Bearer ${managerToken}` } });

      await axios.post(`/api/shifts/${shift12h.data.id}/assign`, {
        userId: staffId
      }, { headers: { Authorization: `Bearer ${managerToken}` } });

      // 2. Try to add another 1-hour shift on the same day
      const extraShift = await axios.post('/api/shifts', {
        locationId: loc1Id,
        requiredSkillId: bartenderSkillId,
        startTime: new Date('2026-04-10T21:00:00Z').toISOString(),
        endTime: new Date('2026-04-10T22:00:00Z').toISOString(),
        headcountNeeded: 1,
        status: 'published'
      }, { headers: { Authorization: `Bearer ${managerToken}` } });

      try {
        await axios.post(`/api/shifts/${extraShift.data.id}/assign`, {
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
          // Setup: Assign shifts for 6 days (April 11th - 16th)
          for (let i = 11; i <= 16; i++) {
            const s = await axios.post('/api/shifts', {
                locationId: loc1Id,
                requiredSkillId: bartenderSkillId,
                startTime: new Date(`2026-04-${i}T12:00:00Z`).toISOString(),
                endTime: new Date(`2026-04-${i}T16:00:00Z`).toISOString(),
                headcountNeeded: 1,
                status: 'published'
              }, { headers: { Authorization: `Bearer ${managerToken}` } });
              
              await axios.post(`/api/shifts/${s.data.id}/assign`, { userId: staffId }, { headers: { Authorization: `Bearer ${managerToken}` } });
          }

          // 7th Day Shift (April 17th)
          const day7 = await axios.post('/api/shifts', {
            locationId: loc1Id,
            requiredSkillId: bartenderSkillId,
            startTime: new Date('2026-04-17T12:00:00Z').toISOString(),
            endTime: new Date('2026-04-17T16:00:00Z').toISOString(),
            headcountNeeded: 1,
            status: 'published'
          }, { headers: { Authorization: `Bearer ${managerToken}` } });

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
          const res = await axios.post(`/api/shifts/${day7.data.id}/assign`, {
            userId: staffId,
            overrideReason: 'Staff agreed to extra day'
          }, { headers: { Authorization: `Bearer ${managerToken}` } });

          expect(res.status).toBe(201);
      });
  });
});
