import axios from 'axios';
import { login, TEST_USERS } from '../support/test-helpers';

describe('Shift Swap Workflow (Requirement #5)', () => {
  let managerToken: string;
  let charlieToken: string;
  let daveToken: string;

  const loc1Id = '11111111-1111-4111-8111-111111111111';
  const charlieId = '33333333-3333-4333-8333-333333333332';
  const daveId = '33333333-3333-4333-8333-333333333333';
  const bartenderSkillId = '22222222-2222-4222-8222-222222222221';

  beforeAll(async () => {
    managerToken = await login(TEST_USERS.manager.email, TEST_USERS.manager.pass);
    charlieToken = await login('staff@coastaleats.com', 'password123');
    daveToken = await login('dave@coastaleats.com', 'password123');
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
    const shift = await axios.post('/api/shifts', {
      locationId: loc1Id,
      requiredSkillId: bartenderSkillId,
      startTime: new Date('2026-05-01T12:00:00Z').toISOString(),
      endTime: new Date('2026-05-01T16:00:00Z').toISOString(),
      headcountNeeded: 1,
      status: 'published'
    }, { headers: { Authorization: `Bearer ${managerToken}` } });

    await axios.post(`/api/shifts/${shift.data.id}/assign`, {
      userId: charlieId
    }, { headers: { Authorization: `Bearer ${managerToken}` } });

    // 2. Charlie requests a swap with Dave
    const swapReq = await axios.post('/api/swaps/request', {
      shiftId: shift.data.id,
      targetUserId: daveId,
      reason: 'Doctor appointment'
    }, { headers: { Authorization: `Bearer ${charlieToken}` } });

    expect(swapReq.data.status).toBe('pending_peer');

    // 3. Dave accepts the swap
    await safePut(`/api/swaps/accept/${swapReq.data.id}`, {}, daveToken);

    // 4. Manager approves the swap
    const approval = await safePut(`/api/swaps/approve/${swapReq.data.id}`, {
      approve: true
    }, managerToken);

    expect(approval.data.status).toBe('approved');

    // 5. Verify the assignment has changed
    const updatedShift = await axios.get(`/api/shifts/${shift.data.id}`, {
        headers: { Authorization: `Bearer ${managerToken}` }
    });
    
    // Check assignments - Dave should be there, Charlie should not
    const assignedUserIds = updatedShift.data.assignments.map((a: any) => a.userId);
    expect(assignedUserIds).toContain(daveId);
    expect(assignedUserIds).not.toContain(charlieId);
  });
});
