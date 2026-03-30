import { waitForPortOpen } from '@nx/node/utils';
import { execSync } from 'child_process';

/* eslint-disable */
var __TEARDOWN_MESSAGE__: string;

module.exports = async function () {
  // Start services that that the app needs to run (e.g. database, docker-compose, etc.).
  console.log('\nSetting up...\n');

  const host = process.env.HOST ?? 'localhost';
  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await waitForPortOpen(port, { host });

  console.log('--- GLOBAL SEEDING (ONCE) ---');
  try {
    execSync('npm run db:seed -- --full', { stdio: 'inherit', env: { ...process.env, NODE_ENV: 'test' } });
  } catch (e) {
    console.error('Global seed failed', e);
    throw e;
  }

  // Hint: Use `globalThis` to pass variables to global teardown.
  globalThis.__TEARDOWN_MESSAGE__ = '\nTearing down...\n';
};
