import { readFileSync } from 'node:fs';
import assert from 'node:assert';
import test from 'node:test';

const source = readFileSync('Frontend/src/hooks/useRealtimeNotifications.js', 'utf8');

test('guards realtime subscription when admin profile has no company id', () => {
  assert.match(source, /if \(!profile\.company_id\) \{/);
  assert.match(source, /console\.warn\('useTicketsRealtime: profile\.company_id is missing, skipping realtime subscription'\)/);
  assert.match(source, /filter: `company_id=eq\.\$\{profile\.company_id\}`/);
});

test('company id guard runs before creating the Supabase channel', () => {
  const guardIndex = source.indexOf('if (!profile.company_id)');
  const channelIndex = source.indexOf("supabase\n      .channel('tickets-realtime-dashboard')");

  assert.notStrictEqual(guardIndex, -1);
  assert.notStrictEqual(channelIndex, -1);
  assert.ok(guardIndex < channelIndex);
});
