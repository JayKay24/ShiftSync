import axios from 'axios';
import { execSync } from 'child_process';

export async function login(email: string, pass: string) {
  const res = await axios.post('/api/auth/login', { email, pass });
  return res.data.access_token;
}

export function seedDatabase() {
  console.log('Seeding database for test...');
  execSync('npm run db:seed', { stdio: 'inherit' });
}

export const TEST_USERS = {
  admin: { email: 'admin@coastaleats.com', pass: 'password123' },
  manager: { email: 'manager@coastaleats.com', pass: 'password123' },
  charlie: { email: 'staff@coastaleats.com', pass: 'password123' },
  dave: { email: 'dave@coastaleats.com', pass: 'password123' },
};
