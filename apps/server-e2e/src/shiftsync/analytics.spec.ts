import axios from 'axios';
import { login, TEST_USERS, clearDynamicData, getNextWednesday, getFutureDate } from '../support/test-helpers';
import { setHours, addHours } from 'date-fns';

describe('Analytics & Fairness (Requirement #8)', () => {
  let managerToken: string;
  const loc1Id = '11111111-1111-4111-8111-111111111111';
  const charlieId = '33333333-3333-4333-8333-333333333332'; // Unavailable MON
  const daveId = '33333333-3333-4333-8333-333333333333'; // Unavailable TUE
  const bartenderSkillId = '22222222-2222-4222-8222-222222222221';
  const lineCookSkillId = '22222222-2222-4222-8222-222222222222';

  beforeAll(async () => {
    await clearDynamicData();
    managerToken = await login(TEST_USERS.manager.email, TEST_USERS.manager.pass);
  });

  it('should return shift distribution and fairness metrics', async () => {
    await clearDynamicData();
    // Shift 1: Charlie (Bartender, Loc 1) - Use Wednesday in future
    const baseDate = getFutureDate(60);
    const futureDate = getNextWednesday(baseDate);
    const s1 = await axios.post('/api/shifts', {
      locationId: loc1Id,
      requiredSkillId: bartenderSkillId,
      startTime: setHours(futureDate, 14).toISOString(),
      endTime: setHours(futureDate, 18).toISOString(),
      headcountNeeded: 1,
      status: 'published'
    }, { headers: { Authorization: `Bearer ${managerToken}` } });
    await axios.post(`/api/shifts/${s1.data.id}/assign`, { userId: charlieId }, { headers: { Authorization: `Bearer ${managerToken}` } });

    // Shift 2: Dave (Line Cook, Loc 1) - Use Wednesday (Available)
    const s2 = await axios.post('/api/shifts', {
      locationId: loc1Id,
      requiredSkillId: lineCookSkillId,
      startTime: setHours(futureDate, 17).toISOString(),
      endTime: setHours(futureDate, 20).toISOString(),
      headcountNeeded: 1,
      status: 'published'
    }, { headers: { Authorization: `Bearer ${managerToken}` } });
    await axios.post(`/api/shifts/${s2.data.id}/assign`, { userId: daveId }, { headers: { Authorization: `Bearer ${managerToken}` } });

    // 2. Check Distribution
    const rangeStart = futureDate.toISOString();
    const rangeEnd = addHours(futureDate, 48).toISOString();
    
    const dist = await axios.get(`/api/analytics/distribution?startDate=${rangeStart}&endDate=${rangeEnd}`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    expect(dist.status).toBe(200);
    expect(dist.data.length).toBeGreaterThan(0);

    // 3. Check Fairness
    const fairness = await axios.get(`/api/analytics/fairness?startDate=${rangeStart}&endDate=${rangeEnd}`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    expect(fairness.status).toBe(200);
    expect(fairness.data).toHaveProperty('overallScore');
    expect(typeof fairness.data.overallScore).toBe('number');
    
    // With 0 premium shifts, it should be 100 (perfectly fair)
    expect(fairness.data.overallScore).toBe(100);

    const userIds = fairness.data.distribution.map((f: any) => f.userId);
    expect(userIds).toContain(charlieId);
    expect(userIds).toContain(daveId);

    // 4. Test inequality: Add a premium shift to Charlie
    const premiumShift = await axios.post('/api/shifts', {
      locationId: loc1Id,
      requiredSkillId: bartenderSkillId,
      startTime: setHours(addHours(futureDate, 24), 14).toISOString(),
      endTime: setHours(addHours(futureDate, 24), 18).toISOString(),
      headcountNeeded: 1,
      status: 'published',
      isPremium: true
    }, { headers: { Authorization: `Bearer ${managerToken}` } });
    
    await axios.post(`/api/shifts/${premiumShift.data.id}/assign`, { userId: charlieId }, { headers: { Authorization: `Bearer ${managerToken}` } });

    const fairness2 = await axios.get(`/api/analytics/fairness?startDate=${rangeStart}&endDate=${rangeEnd}`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    
    // Fairness should decrease as Charlie now has 1 and others have 0
    expect(fairness2.data.overallScore).toBeLessThan(100);
    const charlieDist = fairness2.data.distribution.find((d: any) => d.userId === charlieId);
    expect(charlieDist.premiumShiftCount).toBe(1);
  });
});
