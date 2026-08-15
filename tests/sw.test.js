const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert');
const { ROOT } = require('./helpers/app');
const { loadServiceWorker } = require('./helpers/service-worker');

test('every pre-cached asset exists in the repository', () => {
  const { assets } = loadServiceWorker();
  for (const asset of assets) {
    if (asset === './') continue;
    assert.ok(fs.existsSync(path.join(ROOT, asset)), `${asset} is missing`);
  }
});

test('install pre-caches the asset list and takes over immediately', async () => {
  const sw = loadServiceWorker();

  await sw.dispatch('install');

  assert.deepStrictEqual(sw.cacheNames(), [sw.cacheName]);
  assert.deepStrictEqual(sw.cache(sw.cacheName).added, [sw.assets]);
  assert.strictEqual(sw.skipWaitingCalls, 1);
});

test('activate deletes caches from previous versions and claims clients', async () => {
  const sw = loadServiceWorker();
  sw.seedCache('wordsearch-v4');
  sw.seedCache('wordsearch-v3');
  sw.seedCache(sw.cacheName);

  await sw.dispatch('activate');

  assert.deepStrictEqual(sw.cacheNames(), [sw.cacheName]);
  assert.strictEqual(sw.claimCalls, 1);
});

test('icons and the favicon are served from the cache when it has them', async () => {
  const sw = loadServiceWorker();
  const cached = { body: 'cached icon' };
  sw.seedCache(sw.cacheName, { 'https://braingames.test/icon-192.png': cached });

  const response = await sw.fetchEvent('https://braingames.test/icon-192.png');

  assert.strictEqual(response, cached);
  assert.deepStrictEqual(sw.networkRequests, []);
});

test('an uncached icon falls through to the network', async () => {
  const sw = loadServiceWorker();
  const fresh = { body: 'network favicon' };
  sw.setNetwork(() => fresh);

  const response = await sw.fetchEvent('https://braingames.test/favicon.ico');

  assert.strictEqual(response, fresh);
  assert.deepStrictEqual(sw.networkRequests, ['https://braingames.test/favicon.ico']);
});

test('other assets come from the network and refresh the cache', async () => {
  const sw = loadServiceWorker();
  sw.seedCache(sw.cacheName, { 'https://braingames.test/script.js': { body: 'stale' } });
  sw.setNetwork(() => sw.makeResponse('fresh script'));

  const response = await sw.fetchEvent('https://braingames.test/script.js');

  assert.strictEqual(response.body, 'fresh script');
  assert.strictEqual(response.cloned, 1, 'the response body is cloned before caching');
  await sw.settle();
  assert.strictEqual(sw.cache(sw.cacheName).store['https://braingames.test/script.js'].body,
    'fresh script');
});

test('a failing network request falls back to the cached copy', async () => {
  const sw = loadServiceWorker();
  const cached = { body: 'offline copy' };
  sw.seedCache(sw.cacheName, { 'https://braingames.test/index.html': cached });
  sw.setNetwork(() => { throw new Error('offline'); });

  const response = await sw.fetchEvent('https://braingames.test/index.html');

  assert.strictEqual(response, cached);
});

test('an offline request for something never cached resolves to nothing', async () => {
  const sw = loadServiceWorker();
  sw.setNetwork(() => { throw new Error('offline'); });

  assert.strictEqual(await sw.fetchEvent('https://braingames.test/unknown.js'), undefined);
});
