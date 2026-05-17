#!/usr/bin/env node
/**
 * Production DB deploy (Railway / Docker). No bash/sh required.
 * Set FORCE_DB_RESET=1 once to wipe and reapply all migrations.
 */
const { execSync } = require('child_process');

function run(cmd) {
  console.log(`[db-deploy] ${cmd}`);
  execSync(cmd, { stdio: 'inherit', env: process.env });
}

const force =
  process.env.FORCE_DB_RESET === '1' ||
  process.env.FORCE_DB_RESET === 'true';

if (force) {
  console.log(
    '[db-deploy] FORCE_DB_RESET=1 — reset database and reapply all migrations (data loss).',
  );
  const resetEnv = {
    ...process.env,
    PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION:
      process.env.PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION ||
      'FORCE_DB_RESET: wipe database and reapply migrations',
  };
  console.log('[db-deploy] npx prisma migrate reset --force --skip-seed');
  require('child_process').execSync(
    'npx prisma migrate reset --force --skip-seed',
    { stdio: 'inherit', env: resetEnv },
  );
} else {
  console.log('[db-deploy] prisma migrate deploy');
  try {
    run('npx prisma migrate deploy');
  } catch {
    console.error('');
    console.error('[db-deploy] FAILED (e.g. P3009 failed migration on Railway).');
    console.error(
      '[db-deploy] Fix: set FORCE_DB_RESET=1 in Railway, redeploy once, then remove it.',
    );
    process.exit(1);
  }
}

console.log('[db-deploy] seed plans');
run('npm run db:seed');
console.log('[db-deploy] OK');
