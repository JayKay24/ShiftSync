import axios from 'axios';
import { login, TEST_USERS, seedDatabase } from '../support/test-helpers';

describe('Manager Location-Based Access Control', () => {
  let bobToken: string;   // Manager for NY
  let dianaToken: string; // Manager for LA
  
  const locNY = '11111111-1111-4111-8111-111111111111'; // Downtown
  const locUptown = '11111111-1111-4111-8111-111111111112'; // Uptown
  const locLA = '11111111-1111-4111-8111-111111111113'; // Beach Grill (Diana only)

  beforeAll(async () => {
    seedDatabase();
    bobToken = await login(TEST_USERS.manager.email, TEST_USERS.manager.pass);
    // Diana is in seed.ts but not in TEST_USERS constant
  });

  async function loginDiana() {
     return login('diana.manager@coastaleats.com', 'password123');
  }

  it('should restrict managers to only see their assigned locations', async () => {
    const bobLocations = await axios.get('/api/shifts/locations', { headers: { Authorization: `Bearer ${bobToken}` } });
    const bobLocIds = bobLocations.data.map((l: any) => l.id);
    expect(bobLocIds).toContain(locNY);
    expect(bobLocIds).toContain(locUptown);
    expect(bobLocIds).not.toContain(locLA);

    const dianaTokenVal = await loginDiana();
    const dianaLocations = await axios.get('/api/shifts/locations', { headers: { Authorization: `Bearer ${dianaTokenVal}` } });
    const dianaLocIds = dianaLocations.data.map((l: any) => l.id);
    expect(dianaLocIds).toContain(locLA);
    expect(dianaLocIds).not.toContain(locNY);
    expect(dianaLocIds).not.toContain(locUptown);
  });

  it('should restrict managers to only see staff certified for their locations', async () => {
    // Charlie is certified for NY.
    // Let's assume some staff is only LA. (Grace is LA in seed.ts)
    const bobStaff = await axios.get('/api/shifts/staff', { headers: { Authorization: `Bearer ${bobToken}` } });
    const bobStaffNames = bobStaff.data.map((s: any) => s.firstName);
    expect(bobStaffNames).toContain('Charlie');
    expect(bobStaffNames).not.toContain('Grace');

    const dianaTokenVal = await loginDiana();
    const dianaStaff = await axios.get('/api/shifts/staff', { headers: { Authorization: `Bearer ${dianaTokenVal}` } });
    const dianaStaffNames = dianaStaff.data.map((s: any) => s.firstName);
    expect(dianaStaffNames).toContain('Grace');
    expect(dianaStaffNames).not.toContain('Charlie');
  });

  it('should filter analytics based on manager locations', async () => {
    // In seed.ts, Bob manages NY, Diana manages LA.
    // Charlie is NY. Grace is LA.
    
    // Bob should see Charlie in analytics but not Grace.
    const bobDist = await axios.get('/api/analytics/distribution', { headers: { Authorization: `Bearer ${bobToken}` } });
    const bobUserIds = bobDist.data.map((d: any) => d.firstName);
    expect(bobUserIds).toContain('Charlie');
    expect(bobUserIds).not.toContain('Grace');

    const dianaTokenVal = await loginDiana();
    const dianaDist = await axios.get('/api/analytics/distribution', { headers: { Authorization: `Bearer ${dianaTokenVal}` } });
    const dianaUserIds = dianaDist.data.map((d: any) => d.firstName);
    expect(dianaUserIds).toContain('Grace');
    expect(dianaUserIds).not.toContain('Charlie');
  });

  it('should filter dashboard stats based on manager locations', async () => {
    // Bob: NY/Uptown. Diana: Beach Grill.
    const bobStats = await axios.get('/api/shifts/stats', { headers: { Authorization: `Bearer ${bobToken}` } });
    // Based on seed.ts:
    // Charlie is NY. Dave is Uptown. (Wait, seed Dave is Downtown/Uptown cert?)
    // In seed.ts:
    // Charlie: Loc 1, 2
    // Dave: Loc 1, 2
    // Eva: Loc 1
    // Frank: Loc 1
    // Grace: Loc 3
    // Heidi: Loc 3
    
    // Bob manages Loc 1, 2. So Bob should see 4 staff (Charlie, Dave, Eva, Frank).
    expect(bobStats.data.totalStaff).toBe(4);

    const dianaTokenVal = await loginDiana();
    const dianaStats = await axios.get('/api/shifts/stats', { headers: { Authorization: `Bearer ${dianaTokenVal}` } });
    // Diana manages Loc 3. She should see 2 staff (Grace, Heidi).
    expect(dianaStats.data.totalStaff).toBe(2);
  });
});
