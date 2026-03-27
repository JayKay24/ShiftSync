import axios from 'axios';
import { login, TEST_USERS, seedDatabase } from '../support/test-helpers';

describe('Notifications & Persistence (Requirement #7)', () => {
  let charlieToken: string;
  let daveToken: string;
  let managerToken: string;
  
  const loc1Id = '11111111-1111-4111-8111-111111111111';
  const charlieId = '33333333-3333-4333-8333-333333333332';
  const daveId = '33333333-3333-4333-8333-333333333333';
  const bartenderSkillId = '22222222-2222-4222-8222-222222222221';

  beforeAll(async () => {
    seedDatabase();
    charlieToken = await login(TEST_USERS.charlie.email, TEST_USERS.charlie.pass);
    daveToken = await login(TEST_USERS.dave.email, TEST_USERS.dave.pass);
    managerToken = await login(TEST_USERS.manager.email, TEST_USERS.manager.pass);
  });

  it('should generate and persist a notification for a swap request', async () => {
    // 1. Manager creates and assigns a shift to Charlie
    const shift = await axios.post('/api/shifts', {
      locationId: loc1Id,
      requiredSkillId: bartenderSkillId,
      startTime: new Date('2026-07-01T12:00:00Z').toISOString(),
      endTime: new Date('2026-07-01T16:00:00Z').toISOString(),
      headcountNeeded: 1,
      status: 'published'
    }, { headers: { Authorization: `Bearer ${managerToken}` } });

    await axios.post(`/api/shifts/${shift.data.id}/assign`, { userId: charlieId }, { headers: { Authorization: `Bearer ${managerToken}` } });

    // 2. Charlie requests a swap with Dave
    await axios.post('/api/swaps/request', {
      shiftId: shift.data.id,
      targetUserId: daveId,
      reason: 'Need to visit the dentist'
    }, { headers: { Authorization: `Bearer ${charlieToken}` } });

    // 3. Dave checks his notifications via GET
    const notifications = await axios.get('/api/notifications', {
      headers: { Authorization: `Bearer ${daveToken}` }
    });

    expect(notifications.status).toBe(200);
    expect(notifications.data.length).toBeGreaterThan(0);
    
    // Updated type to swap_request_update
    const swapNotif = notifications.data.find((n: any) => n.type === 'swap_request_update');
    expect(swapNotif).toBeDefined();
    expect(swapNotif.userId).toBe(daveId);
    expect(swapNotif.message).toContain('colleague');
    expect(swapNotif.isRead).toBe(false);

    // 4. Mark notification as read
    const readRes = await axios.post(`/api/notifications/${swapNotif.id}/read`, {}, {
      headers: { Authorization: `Bearer ${daveToken}` }
    });
    expect(readRes.status).toBe(201);

    // 5. Verify it is now read
    const updatedNotifications = await axios.get('/api/notifications', {
      headers: { Authorization: `Bearer ${daveToken}` }
    });
    const readNotif = updatedNotifications.data.find((n: any) => n.id === swapNotif.id);
    expect(readNotif.isRead).toBe(true);
  });
});
