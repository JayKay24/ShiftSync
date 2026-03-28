import axios from 'axios';
import { login, TEST_USERS, seedDatabase } from '../support/test-helpers';

describe('Shift Swap Workflow (Requirement #5)', () => {
  let managerToken: string;
  let charlieToken: string;
  let frankToken: string;

  const loc1Id = '11111111-1111-4111-8111-111111111111';
  const charlieId = '33333333-3333-4333-8333-333333333332';
  const frankId = '33333333-3333-4333-8333-333333333335'; // Frank (24/7 available)
  const bartenderSkillId = '22222222-2222-4222-8222-222222222221';

  beforeAll(async () => {
    seedDatabase();
    managerToken = await login(TEST_USERS.manager.email, TEST_USERS.manager.pass);
    charlieToken = await login(TEST_USERS.charlie.email, TEST_USERS.charlie.pass);
    frankToken = await login(TEST_USERS.frank.email, TEST_USERS.frank.pass);
  });

  async function safePut(url: string, data: any, token: string) {
    try {
      return await axios.put(url, data, { headers: { Authorization: `Bearer ${token}` } });
    } catch (e) {
      const errorMsg = e.response?.data?.message || e.message;
      throw new Error(`API PUT ${url} failed: [${e.response?.status}] ${JSON.stringify(errorMsg)}`);
    }
  }

  it('should complete a full swap: Request -> Accept -> Approve', async () => {
    // 1. Manager creates and assigns a shift to Charlie
    // Use a Wednesday (Charlie is available)
    const shift = await axios.post('/api/shifts', {
      locationId: loc1Id,
      requiredSkillId: bartenderSkillId,
      startTime: new Date('2026-04-01T12:00:00Z').toISOString(),
      endTime: new Date('2026-04-01T16:00:00Z').toISOString(),
      headcountNeeded: 1,
      status: 'published'
    }, { headers: { Authorization: `Bearer ${managerToken}` } });

    await axios.post(`/api/shifts/${shift.data.id}/assign`, {
      userId: charlieId
    }, { headers: { Authorization: `Bearer ${managerToken}` } });

    // 2. Charlie requests a swap with Frank
    const swapReq = await axios.post('/api/swaps/request', {
      shiftId: shift.data.id,
      targetUserId: frankId,
      reason: 'Doctor appointment'
    }, { headers: { Authorization: `Bearer ${charlieToken}` } });

    expect(swapReq.data.status).toBe('pending_peer');

    // 3. Frank accepts the swap
    await safePut(`/api/swaps/accept/${swapReq.data.id}`, {}, frankToken);

    // 4. Manager approves the swap
    const approval = await safePut(`/api/swaps/approve/${swapReq.data.id}`, {
      approve: true
    }, managerToken);

    expect(approval.data.status).toBe('approved');

    // 5. Verify the assignment has changed
    const updatedShift = await axios.get(`/api/shifts/${shift.data.id}`, {
        headers: { Authorization: `Bearer ${managerToken}` }
    });
    
    // Check assignments - Frank should be there, Charlie should not
    const assignedUserIds = updatedShift.data.assignments.map((a: any) => a.userId);
    expect(assignedUserIds).toContain(frankId);
    expect(assignedUserIds).not.toContain(charlieId);
  });
});
