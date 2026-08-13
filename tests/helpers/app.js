/* Test harness: boots index.html in jsdom and runs the app scripts inside it.
   The game scripts are plain browser scripts, so their top-level functions and
   state live in the window's global lexical scope rather than on `window`
   itself — `get`/`set`/`evalIn` reach them, `window` covers the DOM. */

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..', '..');

const APP_SCRIPTS = [
  'words.js',
  'script.js',
  'fractions.js',
  'homophones.js',
  'wordle-words.js',
  'wordle.js',
  'grammar.js',
];

/* `t` is the node:test context; the window is closed when the test ends so its
   timers stop holding the process open. */
function loadApp(t, { scripts = APP_SCRIPTS, storage = {} } = {}) {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const dom = new JSDOM(html, {
    url: 'https://braingames.test/',
    runScripts: 'outside-only',
  });
  const { window } = dom;
  t.after(() => window.close());

  for (const [key, value] of Object.entries(storage)) {
    window.localStorage.setItem(key, value);
  }

  const context = dom.getInternalVMContext();
  const evalIn = (code) => vm.runInContext(code, context);

  for (const file of scripts) {
    const filename = path.join(ROOT, file);
    vm.runInContext(fs.readFileSync(filename, 'utf8'), context, { filename });
  }

  return {
    window,
    document: window.document,
    evalIn,
    get: (name) => evalIn(name),
    /* Same as get, but copied into plain host values for deepStrictEqual. */
    pget: (name) => plain(evalIn(name)),
    set: (name, value) => {
      window.__testValue = value;
      evalIn(`${name} = window.__testValue`);
      delete window.__testValue;
    },
    /* Calls a global function of the app with the given arguments. */
    call: (name, ...args) => evalIn(name).apply(window, args),
    $: (selector) => window.document.querySelector(selector),
    id: (elementId) => window.document.getElementById(elementId),
    click: (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })),
    /* Makes Math.random deterministic: the given values are returned in order
       and then cycle, so shuffles and picks become predictable. */
    stubRandom(values) {
      let i = 0;
      const next = () => values[i++ % values.length];
      window.__testRandom = next;
      evalIn('Math.random = window.__testRandom');
      return next;
    },
    /* Replaces window.setTimeout with a queue the test drives manually, so the
       1.4s inter-question delays don't have to be waited out. */
    fakeTimers() {
      const queue = [];
      window.setTimeout = (fn, delay = 0) => {
        queue.push({ fn, delay });
        return queue.length;
      };
      window.clearTimeout = () => {};
      window.setInterval = () => 0;
      window.clearInterval = () => {};
      return {
        queue,
        /* Runs the callbacks pending right now, oldest first. */
        runPending() {
          for (const t of queue.splice(0, queue.length)) t.fn();
        },
        /* Runs pending callbacks, including any they schedule in turn. */
        runAll(limit = 100) {
          let count = 0;
          while (queue.length && count++ < limit) queue.shift().fn();
        },
      };
    },
  };
}

/* Values built inside the jsdom realm have a different Array/Object prototype,
   which trips deepStrictEqual — this copies them into plain host values. */
function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

module.exports = { APP_SCRIPTS, ROOT, loadApp, plain };
