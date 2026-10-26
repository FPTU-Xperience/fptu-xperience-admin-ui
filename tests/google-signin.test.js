import test from 'node:test';
import assert from 'node:assert/strict';
import { bindGoogleSignIn } from '../src/services/google-signin.js';

test('StrictMode remount initializes Google once and only the mounted handler receives credentials', () => {
  let initialized = 0, deliver;
  const client = { initialize(options) { initialized++; deliver = options.callback; } };
  const seen = [];
  const first = bindGoogleSignIn(client, 'same-client', () => seen.push('old'));
  first();
  const last = bindGoogleSignIn(client, 'same-client', () => seen.push('current'));
  deliver({ credential: 'test-only' });
  assert.equal(initialized, 1);
  assert.deepEqual(seen, ['current']);
  last(); deliver({ credential: 'late' });
  assert.deepEqual(seen, ['current']);
});

test('an obsolete handler cleanup cannot disconnect the current Google callback', () => {
  let deliver;
  const client = { initialize(options) { deliver = options.callback; } };
  const seen = [];
  const obsolete = bindGoogleSignIn(client, 'same-client', () => seen.push('old'));
  const current = bindGoogleSignIn(client, 'same-client', () => seen.push('current'));
  obsolete(); deliver({ credential: 'test-only' });
  assert.deepEqual(seen, ['current']); current();
});
