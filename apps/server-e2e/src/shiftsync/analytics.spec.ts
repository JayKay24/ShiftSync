import axios from 'axios';
import { login, TEST_USERS, seedDatabase } from '../support/test-helpers';

describe('Analytics & Fairness (Requirement #8)', () => {
  let managerToken: string;
  const loc1Id = '11111111-1111-4111-8111-111111111111';
  const charlieId = '33333333-3333-4333-8333-333333333332'; // Unavailable MON
  const daveId = '33333333-3333-4333-8333-333333333333'; // Unavailable TUE
  const bartenderSkillId = '22222222-2222-4222-8222-222222222221';
  const lineCookSkillId = '22222222-2222-4222-8222-222222222222';

  beforeAll(async () => {
    seedDatabase();
    managerToken = await login(TEST_USERS.manager.email, TEST_USERS.manager.pass);
  });

  it('should return shift distribution and fairness metrics', async () => {
    // Shift 1: Charlie (Bartender, Loc 1) - Use Wednesday June 3 (Available)
    const s1 = await axios.post('/api/shifts', {
      locationId: loc1Id,
      requiredSkillId: bartenderSkillId,
      startTime: new Date('2026-06-03T12:00:00Z').toISOString(),
      endTime: new Date('2026-06-03T16:00:00Z').toISOString(),
      headcountNeeded: 1,
      status: 'published'
    }, { headers: { Authorization: `Bearer ${managerToken}` } });
    await axios.post(`/api/shifts/${s1.data.id}/assign`, { userId: charlieId }, { headers: { Authorization: `Bearer ${managerToken}` } });

    // Shift 2: Dave (Line Cook, Loc 1) - Use Wednesday June 3 (Available)
    const s2 = await axios.post('/api/shifts', {
      locationId: loc1Id,
      requiredSkillId: lineCookSkillId,
      startTime: new Date('2026-06-03T17:00:00Z').toISOString(),
      endTime: new Date('2026-06-03T20:00:00Z').toISOString(),
      headcountNeeded: 1,
      status: 'published'
    }, { headers: { Authorization: `Bearer ${managerToken}` } });
    await axios.post(`/api/shifts/${s2.data.id}/assign`, { userId: daveId }, { headers: { Authorization: `Bearer ${managerToken}` } });

    // 2. Check Distribution
    const dist = await axios.get('/api/analytics/distribution', {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    expect(dist.status).toBe(200);
    expect(dist.data.length).toBeGreaterThan(0);

    // 3. Check Fairness
    const fairness = await axios.get('/api/analytics/fairness', {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    expect(fairness.status).toBe(200);
    const userIds = fairness.data.distribution.map((f: any) => f.userId);
    expect(userIds).toContain(charlieId);
    expect(userIds).toContain(daveId);
  });
});
