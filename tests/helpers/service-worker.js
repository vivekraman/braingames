/* Test harness for sw.js: runs the service worker in a VM context with a
   minimal stand-in for the ServiceWorkerGlobalScope (self, caches, fetch),
   so its install/activate/fetch handlers can be driven directly. */

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..', '..');

function makeCache(store = {}) {
  const cache = {
    store,
    added: [],
    async addAll(assets) {
      cache.added.push(assets);
      for (const asset of assets) store[asset] = { body: asset };
    },
    async put(request, response) {
      store[String(request)] = response;
    },
    async match(request) {
      return store[String(request)];
    },
  };
  return cache;
}

function loadServiceWorker() {
  const caches = new Map();
  const listeners = new Map();
  const pending = [];
  const networkRequests = [];
  let network = (url) => { throw new Error(`unexpected request for ${url}`); };

  const sw = {
    networkRequests,
    skipWaitingCalls: 0,
    claimCalls: 0,
    cacheNames: () => [...caches.keys()],
    cache: (name) => caches.get(name),
    seedCache(name, store = {}) {
      caches.set(name, makeCache(store));
      return caches.get(name);
    },
    setNetwork(fn) { network = fn; },
    /* A response that records how often it was cloned for the cache. */
    makeResponse(body) {
      const response = { body, cloned: 0 };
      response.clone = () => { response.cloned += 1; return { body }; };
      return response;
    },
    /* Awaits the promises the worker passed to waitUntil/respondWith. */
    async settle() {
      while (pending.length) await pending.shift();
    },
    async dispatch(type, event = {}) {
      const promises = [];
      const fullEvent = {
        ...event,
        waitUntil: (promise) => { promises.push(promise); pending.push(promise); },
        respondWith: (promise) => { promises.push(promise); pending.push(promise); },
      };
      for (const listener of listeners.get(type) || []) listener(fullEvent);
      return (await Promise.all(promises)).at(-1);
    },
    /* Dispatches a fetch event for a URL and returns what the worker responded
       with. Requests stringify to their URL, which is all sw.js needs. */
    fetchEvent(url) {
      return sw.dispatch('fetch', { request: { url, toString: () => url } });
    },
  };

  const self = {
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(listener);
    },
    skipWaiting() { sw.skipWaitingCalls += 1; },
    clients: { claim() { sw.claimCalls += 1; } },
  };

  const context = vm.createContext({
    self,
    Promise,
    caches: {
      async open(name) {
        if (!caches.has(name)) caches.set(name, makeCache());
        return caches.get(name);
      },
      async keys() { return [...caches.keys()]; },
      async delete(name) { return caches.delete(name); },
      async match(request) {
        for (const cache of caches.values()) {
          const hit = await cache.match(request);
          if (hit) return hit;
        }
        return undefined;
      },
    },
    async fetch(request) {
      const url = String(request.url ?? request);
      networkRequests.push(url);
      return network(url);
    },
  });

  const filename = path.join(ROOT, 'sw.js');
  vm.runInContext(fs.readFileSync(filename, 'utf8'), context, { filename });

  sw.cacheName = vm.runInContext('CACHE', context);
  sw.assets = vm.runInContext('PRECACHE_ASSETS', context);
  return sw;
}

module.exports = { loadServiceWorker };
