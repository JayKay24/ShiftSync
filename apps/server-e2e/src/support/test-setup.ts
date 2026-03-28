/* eslint-disable */
import axios from 'axios';

module.exports = async function () {
  // Increase timeout for slow seeding
  jest.setTimeout(30000);

  // Configure axios for tests to use.
  const host = process.env.HOST ?? 'localhost';
  const port = process.env.PORT ?? '3001';
  axios.defaults.baseURL = `http://${host}:${port}`;
};
