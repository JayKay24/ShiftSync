import axios from 'axios';

export async function login(email: string, pass: string) {
  const res = await axios.post('/api/auth/login', { email, pass });
  return res.data.access_token;
}

export const TEST_USERS = {
  admin: { email: 'admin@coastaleats.com', pass: 'password123' },
  manager: { email: 'manager@coastaleats.com', pass: 'password123' },
  staff: { email: 'staff@coastaleats.com', pass: 'password123' },
};
