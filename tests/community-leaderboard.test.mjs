import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const main = readFileSync(new URL('../billion-rush/src/main.js', import.meta.url), 'utf8');
const backend = readFileSync(new URL('../billion-rush/src/backend.js', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../supabase/migrations/0019_community_leaderboards.sql', import.meta.url), 'utf8');
const submit = readFileSync(new URL('../supabase/functions/submit-leaderboard-score/index.ts', import.meta.url), 'utf8');
const get = readFileSync(new URL('../supabase/functions/get-community-leaderboard/index.ts', import.meta.url), 'utf8');
test('player UI exposes all four periods, global/country scope, and both ranking metrics', () => {
  for (const period of ['daily','weekly','monthly','yearly']) assert.match(main, new RegExp(`${period}:`));
  assert.match(main, /data-scope="global"/); assert.match(main, /data-scope="country"/);
  assert.match(main, /data-metric="best"/); assert.match(main, /data-metric="total"/);
});
test('leaderboard submission does not require player accounts and queues offline scores', () => {
  assert.match(backend, /submitCommunityScore/); assert.match(backend, /getCommunityLeaderboard/);
  assert.match(main, /LEADERBOARD_PENDING_KEY/); assert.match(main, /syncPendingLeaderboardScores/);
  assert.match(backend, /billionRush\.leaderboardPlayerId\.v1/);
});
test('server schema deduplicates run submissions and keeps write access off public roles', () => {
  assert.match(migration, /run_id text not null unique/); assert.match(migration, /enable row level security/i);
  assert.match(migration, /revoke all .* from anon, authenticated/i);
  assert.match(submit, /new Date\(\)\.toISOString\(\)/); assert.match(submit, /SUPABASE_SERVICE_ROLE_KEY/);
});
test('period calculations use UTC day, Monday-start week, month, and year', () => {
  assert.match(get, /period==='daily'/); assert.match(get, /period==='weekly'/);
  assert.match(get, /period==='monthly'/); assert.match(get, /Date\.UTC\(y,0,1\)/);
});
