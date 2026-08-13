const test = require('node:test');
const assert = require('node:assert');
const { loadApp } = require('./helpers/app');

test('boots on the menu with every game hidden', (t) => {
  const app = loadApp(t);
  assert.strictEqual(app.get('activeGame'), null);
  assert.ok(!app.id('game-menu').classList.contains('hidden'));
  for (const el of ['game-wordsearch', 'game-fractions', 'game-homophones', 'game-wordle', 'game-grammar']) {
    assert.ok(app.id(el).classList.contains('hidden'), `${el} should start hidden`);
  }
});

test('switchToGame reveals only the chosen game and starts it', (t) => {
  const app = loadApp(t);
  app.fakeTimers();
  app.call('switchToGame', 'fractions');

  assert.strictEqual(app.get('activeGame'), 'fractions');
  assert.ok(app.id('game-menu').classList.contains('hidden'));
  assert.ok(!app.id('game-fractions').classList.contains('hidden'));
  assert.ok(app.id('game-wordle').classList.contains('hidden'));
  assert.match(app.id('fractions-progress').textContent, /Question 1 of 10/);
});

test('menu buttons switch games and Home returns to the menu', (t) => {
  const app = loadApp(t);
  app.fakeTimers();

  app.click(app.$('.game-pick-btn[data-game="homophones"]'));
  assert.strictEqual(app.get('activeGame'), 'homophones');

  app.click(app.id('btn-home'));
  assert.strictEqual(app.get('activeGame'), null);
  assert.ok(app.id('btn-home').classList.contains('hidden'));
  assert.ok(app.id('timer').classList.contains('hidden'));
  assert.strictEqual(app.id('bg-layer').innerHTML, '');
});

test('formatTime renders mm:ss with a padded seconds field', (t) => {
  const app = loadApp(t);
  assert.strictEqual(app.call('formatTime', 0), '0:00');
  assert.strictEqual(app.call('formatTime', 9000), '0:09');
  assert.strictEqual(app.call('formatTime', 65_500), '1:05');
  assert.strictEqual(app.call('formatTime', 600_000), '10:00');
});

test('startTimer resets the display and stopTimer clears the interval', (t) => {
  const app = loadApp(t);
  app.call('startTimer');
  assert.strictEqual(app.id('timer').textContent, '0:00');
  assert.notStrictEqual(app.get('timerInterval'), null);
  app.call('stopTimer');
  assert.strictEqual(app.get('timerInterval'), null);
});

test('category modal opens, closes, and starts a new game on pick', (t) => {
  const app = loadApp(t);
  const modal = app.id('category-modal');
  const buttons = app.document.querySelectorAll('#category-grid .cat-btn');
  assert.strictEqual(buttons.length, Object.keys(app.window.WORD_BANK).length);

  app.click(app.id('btn-category'));
  assert.ok(!modal.classList.contains('hidden'));
  app.click(app.id('btn-close-modal'));
  assert.ok(modal.classList.contains('hidden'));

  app.click(app.id('btn-category'));
  app.click(buttons[1]);
  assert.ok(modal.classList.contains('hidden'));
  assert.strictEqual(app.get('currentCategory'), Object.keys(app.window.WORD_BANK)[1]);
});
