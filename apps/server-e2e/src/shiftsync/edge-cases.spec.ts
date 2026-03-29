import axios from 'axios';
import { login, TEST_USERS, seedDatabase } from '../support/test-helpers';

describe('Edge Cases & Advanced Constraints (QA Checklist)', () => {
  let managerToken: string;
  let charlieToken: string;
  let frankToken: string;

  const loc1Id = '11111111-1111-4111-8111-111111111111';
  const charlieId = '33333333-3333-4333-8333-333333333332'; // Unavailable MON
  const frankId = '33333333-3333-4333-8333-333333333335'; // 24/7
  const bartenderSkillId = '22222222-2222-4222-8222-222222222221';

  beforeAll(async () => {
    seedDatabase();
    managerToken = await login(TEST_USERS.manager.email, TEST_USERS.manager.pass);
    charlieToken = await login(TEST_USERS.charlie.email, TEST_USERS.charlie.pass);
    frankToken = await login(TEST_USERS.frank.email, TEST_USERS.frank.pass);
  });

  describe('Edge Case: Shift Full (Headcount Enforcement)', () => {
    it('should block assignment when headcount is reached', async () => {
      const shift = await axios.post('/api/shifts', {
        locationId: loc1Id,
        requiredSkillId: bartenderSkillId,
        startTime: new Date('2026-04-01T12:00:00Z').toISOString(),
        endTime: new Date('2026-04-01T16:00:00Z').toISOString(),
        headcountNeeded: 1,
        status: 'published'
      }, { headers: { Authorization: `Bearer ${managerToken}` } });

      await axios.post(`/api/shifts/${shift.data.id}/assign`, { userId: charlieId }, { headers: { Authorization: `Bearer ${managerToken}` } });

      try {
        await axios.post(`/api/shifts/${shift.data.id}/assign`, { userId: frankId }, { headers: { Authorization: `Bearer ${managerToken}` } });
        throw new Error('Should have blocked assignment to full shift');
      } catch (e) {
        if (!e.response) throw e;
        expect(e.response.status).toBe(400);
        expect(e.response.data.message).toContain('Shift is already full');
      }
    });
  });

  describe('Edge Case: Regret Swap (Auto-Cancellation)', () => {
    it('should cancel pending swap when manager edits critical shift fields', async () => {
      const shift = await axios.post('/api/shifts', {
        locationId: loc1Id,
        requiredSkillId: bartenderSkillId,
        startTime: new Date('2026-04-08T12:00:00Z').toISOString(),
        endTime: new Date('2026-04-08T16:00:00Z').toISOString(),
        headcountNeeded: 1,
        status: 'published'
      }, { headers: { Authorization: `Bearer ${managerToken}` } });
      await axios.post(`/api/shifts/${shift.data.id}/assign`, { userId: charlieId }, { headers: { Authorization: `Bearer ${managerToken}` } });

      const swap = await axios.post('/api/swaps/request', {
        shiftId: shift.data.id,
        targetUserId: frankId,
        reason: 'Change of plans'
      }, { headers: { Authorization: `Bearer ${charlieToken}` } });

      await axios.patch(`/api/shifts/${shift.data.id}`, {
        startTime: new Date('2026-04-08T13:00:00Z').toISOString()
      }, { headers: { Authorization: `Bearer ${managerToken}` } });

      const swaps = await axios.get('/api/swaps', { headers: { Authorization: `Bearer ${charlieToken}` } });
      const updatedSwap = swaps.data.find((s: any) => s.id === swap.data.id);
      expect(updatedSwap.status).toBe('cancelled');
    });
  });

  describe('Constraint: Max Pending Requests', () => {
    it('should block more than 3 pending swap/drop requests', async () => {
      // NOTE: Charlie already has 1 pending request from seed.ts
      // We will add 2 more successfully, and the 3rd (total 4th) should fail.
      const days = [21, 22, 23];
      for (const day of days) {
        const startTime = new Date(`2026-04-${day}T12:00:00Z`);
        const endTime = new Date(`2026-04-${day}T16:00:00Z`);
        
        const s = await axios.post('/api/shifts', {
          locationId: loc1Id,
          requiredSkillId: bartenderSkillId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          headcountNeeded: 1,
          status: 'published'
        }, { headers: { Authorization: `Bearer ${managerToken}` } });
        
        await axios.post(`/api/shifts/${s.data.id}/assign`, { userId: charlieId }, { headers: { Authorization: `Bearer ${managerToken}` } });
        
        if (day < 23) {
          // Charlie now has 2, then 3 pending
          await axios.post('/api/swaps/request', {
            shiftId: s.data.id,
            reason: 'Busy with family'
          }, { headers: { Authorization: `Bearer ${charlieToken}` } });
        } else {
          // This would be the 4th pending request (1 from seed + 2 from loop + 1 current)
          try {
            await axios.post('/api/swaps/request', {
              shiftId: s.data.id,
              reason: 'Too busy with work'
            }, { headers: { Authorization: `Bearer ${charlieToken}` } });
            throw new Error('Should have blocked 4th request');
          } catch (err) {
            if (!err.response) throw err;
            expect(err.response.status).toBe(400);
            expect(err.response.data.message).toContain('cannot have more than 3 pending');
          }
        }
      }
    });
  });

  describe('Constraint: Availability Alignment', () => {
    it('should block assignment on a day the user is unavailable (Monday for Charlie)', async () => {
      const monShift = await axios.post('/api/shifts', {
        locationId: loc1Id,
        requiredSkillId: bartenderSkillId,
        startTime: new Date('2026-04-06T12:00:00Z').toISOString(),
        endTime: new Date('2026-04-06T16:00:00Z').toISOString(),
        headcountNeeded: 1,
        status: 'published'
      }, { headers: { Authorization: `Bearer ${managerToken}` } });

      try {
        await axios.post(`/api/shifts/${monShift.data.id}/assign`, { userId: charlieId }, { headers: { Authorization: `Bearer ${managerToken}` } });
        throw new Error('Should have blocked assignment due to availability');
      } catch (e) {
        if (!e.response) throw e;
        expect(e.response.status).toBe(400);
        expect(e.response.data.message).toContain('outside of staff availability windows');
      }
    });
  });

  describe('Feature: Suggest Alternatives', () => {
    it('should provide alternative available staff when a conflict occurs', async () => {
      const shift = await axios.post('/api/shifts', {
        locationId: loc1Id,
        requiredSkillId: bartenderSkillId,
        startTime: new Date('2026-04-13T12:00:00Z').toISOString(),
        endTime: new Date('2026-04-13T16:00:00Z').toISOString(),
        headcountNeeded: 1,
        status: 'published'
      }, { headers: { Authorization: `Bearer ${managerToken}` } });

      const res = await axios.get(`/api/shifts/${shift.data.id}/available-staff`, {
        headers: { Authorization: `Bearer ${managerToken}` }
      });

      expect(res.status).toBe(200);
      const names = res.data.map((s: any) => s.name);
      expect(names).not.toContain('Charlie Staff');
      expect(names).toContain('Frank Staff'); 
    });
  });
});
