const test = require('node:test');
const assert = require('node:assert');
const { loadApp, plain } = require('./helpers/app');

const DENOMINATORS = [2, 3, 4, 5, 6, 8, 10, 12];

function startFractions(t) {
  const app = loadApp(t);
  const timers = app.fakeTimers();
  app.call('switchToGame', 'fractions');
  return { app, timers };
}

/* Replaces the round with a known set of pairs and re-renders question one. */
function useRound(app, pairs) {
  app.set('fracPairs', pairs);
  app.set('fracIndex', 0);
  app.set('fracScore', 0);
  app.set('fracAnswered', false);
  app.call('renderQuestion');
}

const value = ({ n, d }) => n / d;

test('randomFraction only produces proper fractions from the allowed denominators', (t) => {
  const app = loadApp(t);
  for (let i = 0; i < 300; i++) {
    const { n, d } = plain(app.call('randomFraction'));
    assert.ok(DENOMINATORS.includes(d), `unexpected denominator ${d}`);
    assert.ok(n >= 1 && n < d, `${n}/${d} is not a proper fraction`);
  }
});

test('makeEqualPair produces two different-looking but equal fractions', (t) => {
  const app = loadApp(t);
  for (let i = 0; i < 200; i++) {
    const pair = plain(app.call('makeEqualPair'));
    assert.strictEqual(pair.answer, 'eq');
    assert.strictEqual(value(pair.left), value(pair.right));
    assert.ok(pair.left.d <= 12 && pair.right.d <= 12, 'denominators stay within the allowed range');
  }
});

test('makeEqualPair falls back to 1/2 vs 2/4 when no multiple fits', (t) => {
  const app = loadApp(t);
  app.stubRandom([0.99]);   // largest denominator (12) and largest multiplier: never fits
  assert.deepStrictEqual(plain(app.call('makeEqualPair')), {
    left: { n: 1, d: 2 }, right: { n: 2, d: 4 }, answer: 'eq',
  });
});

test('makeUnequalPair honours the requested comparison', (t) => {
  const app = loadApp(t);
  for (let i = 0; i < 200; i++) {
    const lt = plain(app.call('makeUnequalPair', 'lt'));
    assert.strictEqual(lt.answer, 'lt');
    assert.ok(value(lt.left) < value(lt.right), `${lt.left.n}/${lt.left.d} should be smaller`);

    const gt = plain(app.call('makeUnequalPair', 'gt'));
    assert.strictEqual(gt.answer, 'gt');
    assert.ok(value(gt.left) > value(gt.right), `${gt.left.n}/${gt.left.d} should be larger`);
  }
});

test('makeUnequalPair falls back to a hardcoded pair when every draw is equal', (t) => {
  const app = loadApp(t);
  app.stubRandom([0]);      // always 1/2 vs 1/2, i.e. never unequal
  assert.deepStrictEqual(plain(app.call('makeUnequalPair', 'lt')),
    { left: { n: 1, d: 3 }, right: { n: 2, d: 3 }, answer: 'lt' });
  assert.deepStrictEqual(plain(app.call('makeUnequalPair', 'gt')),
    { left: { n: 3, d: 4 }, right: { n: 1, d: 4 }, answer: 'gt' });
});

test('generateRound yields ten questions with a fixed answer mix', (t) => {
  const app = loadApp(t);
  for (let i = 0; i < 20; i++) {
    const pairs = plain(app.call('generateRound'));
    assert.strictEqual(pairs.length, 10);
    const counts = pairs.reduce((acc, p) => ({ ...acc, [p.answer]: (acc[p.answer] || 0) + 1 }), {});
    assert.deepStrictEqual(counts, { eq: 3, lt: 4, gt: 3 });
    for (const pair of pairs) {
      const expected = value(pair.left) < value(pair.right) ? 'lt'
        : value(pair.left) > value(pair.right) ? 'gt' : 'eq';
      assert.strictEqual(pair.answer, expected, 'the stated answer matches the actual comparison');
    }
  }
});

test('a new game renders the first question with fresh buttons', (t) => {
  const { app } = startFractions(t);

  assert.strictEqual(app.get('fracIndex'), 0);
  assert.strictEqual(app.get('fracScore'), 0);
  assert.strictEqual(app.id('fractions-progress').textContent, 'Question 1 of 10');
  assert.strictEqual(app.id('fraction-compare-result').textContent, '?');
  assert.ok(app.id('win-overlay').classList.contains('hidden'));
  assert.match(app.id('fraction-left').innerHTML, /frac-numerator/);
  for (const btn of app.document.querySelectorAll('.cmp-btn')) {
    assert.strictEqual(btn.disabled, false);
    assert.strictEqual(btn.className, 'cmp-btn');
  }
});

test('a correct answer scores a point and marks the right button', (t) => {
  const { app } = startFractions(t);
  useRound(app, [{ left: { n: 1, d: 4 }, right: { n: 1, d: 2 }, answer: 'lt' }]);

  app.click(app.$('.cmp-btn[data-answer="lt"]'));

  assert.strictEqual(app.get('fracScore'), 1);
  assert.strictEqual(app.id('fraction-compare-result').textContent, '<');
  assert.ok(app.id('fraction-compare-result').classList.contains('result-correct'));
  assert.strictEqual(app.id('fractions-feedback').textContent, 'Correct!');
  assert.ok(app.$('.cmp-btn[data-answer="lt"]').classList.contains('cmp-correct'));
  for (const btn of app.document.querySelectorAll('.cmp-btn')) assert.strictEqual(btn.disabled, true);
});

test('a wrong answer reveals the right one and flags the choice made', (t) => {
  const { app } = startFractions(t);
  useRound(app, [{ left: { n: 1, d: 4 }, right: { n: 1, d: 2 }, answer: 'lt' }]);

  app.click(app.$('.cmp-btn[data-answer="gt"]'));

  assert.strictEqual(app.get('fracScore'), 0);
  assert.strictEqual(app.id('fractions-feedback').textContent, 'The answer is  <');
  assert.ok(app.id('fractions-feedback').classList.contains('wrong'));
  assert.ok(app.$('.cmp-btn[data-answer="lt"]').classList.contains('cmp-correct'));
  assert.ok(app.$('.cmp-btn[data-answer="gt"]').classList.contains('cmp-wrong'));
  assert.ok(app.id('fraction-compare-result').classList.contains('result-wrong'));
});

test('only the first answer to a question counts', (t) => {
  const { app } = startFractions(t);
  useRound(app, [{ left: { n: 1, d: 2 }, right: { n: 2, d: 4 }, answer: 'eq' }]);

  app.click(app.$('.cmp-btn[data-answer="eq"]'));
  app.click(app.$('.cmp-btn[data-answer="lt"]'));
  assert.strictEqual(app.get('fracScore'), 1);
});

test('answering advances to the next question after the reveal delay', (t) => {
  const { app, timers } = startFractions(t);
  useRound(app, [
    { left: { n: 1, d: 4 }, right: { n: 1, d: 2 }, answer: 'lt' },
    { left: { n: 3, d: 4 }, right: { n: 1, d: 2 }, answer: 'gt' },
  ]);

  app.click(app.$('.cmp-btn[data-answer="lt"]'));
  assert.strictEqual(app.get('fracIndex'), 0, 'the reveal is still on screen');

  timers.runPending();
  assert.strictEqual(app.get('fracIndex'), 1);
  assert.strictEqual(app.id('fractions-progress').textContent, 'Question 2 of 10');
  assert.strictEqual(app.id('fraction-compare-result').textContent, '?');
  assert.strictEqual(app.id('fractions-feedback').textContent, '');
});

test('the round ends on the tenth question with the score on the win screen', (t) => {
  const { app, timers } = startFractions(t);
  const pair = { left: { n: 1, d: 4 }, right: { n: 1, d: 2 }, answer: 'lt' };
  useRound(app, Array.from({ length: 10 }, () => pair));

  for (let i = 0; i < 10; i++) {
    app.click(app.$('.cmp-btn[data-answer="lt"]'));
    timers.runPending();
  }

  assert.strictEqual(app.get('fracScore'), 10);
  assert.ok(!app.id('win-overlay').classList.contains('hidden'));
  assert.strictEqual(app.id('win-heading').textContent, 'Nice work!');
  assert.strictEqual(app.id('win-score').textContent, 'Score: 10 / 10');
  assert.match(app.id('win-time').textContent, /^Time: \d+:\d{2}$/);
});

test('Play Again restarts the fractions round', (t) => {
  const { app, timers } = startFractions(t);
  app.set('fracIndex', 7);
  app.set('fracScore', 5);
  app.call('showWinScreen', 'Score: 5 / 10');

  app.click(app.id('btn-play-again'));
  timers.runPending();

  assert.strictEqual(app.get('fracIndex'), 0);
  assert.strictEqual(app.get('fracScore'), 0);
  assert.ok(app.id('win-overlay').classList.contains('hidden'));
});
