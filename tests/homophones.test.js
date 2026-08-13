const test = require('node:test');
const assert = require('node:assert');
const { loadApp, plain } = require('./helpers/app');

function startHomophones(t) {
  const app = loadApp(t);
  const timers = app.fakeTimers();
  app.call('switchToGame', 'homophones');
  return { app, timers };
}

/* Replaces the round with known pairs and re-renders the first question. */
function useRound(app, pairs) {
  app.set('homoPairs', pairs);
  app.set('homoIndex', 0);
  app.set('homoScore', 0);
  app.set('homoAnswered', false);
  app.call('renderHomoQuestion');
}

const PAIR = { answer: 'hear', distractor: 'here', sentence: 'Can you ___ the thunder?' };

test('every homophone pair has a blank, two distinct words and no duplicates', (t) => {
  const app = loadApp(t);
  const pairs = plain(app.get('HOMOPHONE_PAIRS'));
  const seen = new Set();

  assert.ok(pairs.length >= 10, 'the pool must cover a full round');
  for (const { answer, distractor, sentence } of pairs) {
    assert.ok(sentence.includes('___'), `"${sentence}" has no blank`);
    assert.strictEqual(sentence.split('___').length, 2, `"${sentence}" has more than one blank`);
    assert.notStrictEqual(answer, distractor);
    assert.ok(!/\s/.test(answer) && !/\s/.test(distractor), 'words are single tokens');
    assert.ok(!sentence.toLowerCase().includes(` ${answer} `), 'the sentence must not give the answer away');
    assert.ok(!seen.has(sentence), `duplicate sentence: ${sentence}`);
    seen.add(sentence);
  }
});

test('generateHomoRound picks ten distinct pairs', (t) => {
  const app = loadApp(t);
  for (let i = 0; i < 20; i++) {
    const round = plain(app.call('generateHomoRound'));
    assert.strictEqual(round.length, 10);
    assert.strictEqual(new Set(round.map((p) => p.sentence)).size, 10);
  }
});

test('generateHomoRound leaves the source pool untouched', (t) => {
  const app = loadApp(t);
  const before = plain(app.get('HOMOPHONE_PAIRS'));
  app.call('generateHomoRound');
  assert.deepStrictEqual(plain(app.get('HOMOPHONE_PAIRS')), before);
});

test('renderSentence replaces the blank with a styled placeholder', (t) => {
  const { app } = startHomophones(t);
  app.call('renderSentence', 'Please come over ___ and sit.');
  assert.strictEqual(app.id('homophones-sentence').innerHTML,
    'Please come over <span class="sentence-blank">_____</span> and sit.');
});

test('both words are offered, in either order', (t) => {
  const { app } = startHomophones(t);
  const seen = new Set();

  for (const random of [0.1, 0.9]) {
    app.stubRandom([random]);
    useRound(app, [PAIR]);
    seen.add([app.id('word-btn-a').textContent, app.id('word-btn-b').textContent].join('|'));
  }

  assert.deepStrictEqual([...seen].sort(), ['hear|here', 'here|hear']);
  assert.strictEqual(app.id('homophones-progress').textContent, 'Question 1 of 10');
  assert.strictEqual(app.id('word-btn-a').disabled, false);
  assert.strictEqual(app.id('word-btn-b').disabled, false);
});

test('choosing the right word scores and fills the blank in green', (t) => {
  const { app } = startHomophones(t);
  app.stubRandom([0.9]);              // no swap: button A holds the answer
  useRound(app, [PAIR]);

  app.click(app.id('word-btn-a'));

  assert.strictEqual(app.get('homoScore'), 1);
  assert.strictEqual(app.id('homophones-feedback').textContent, 'Correct!');
  assert.ok(app.id('word-btn-a').classList.contains('word-correct'));
  assert.match(app.id('homophones-sentence').innerHTML, /class="sentence-filled fill-correct">hear</);
  assert.strictEqual(app.id('word-btn-a').disabled, true);
  assert.strictEqual(app.id('word-btn-b').disabled, true);
});

test('choosing the wrong word marks both buttons and names the answer', (t) => {
  const { app } = startHomophones(t);
  app.stubRandom([0.9]);
  useRound(app, [PAIR]);

  app.click(app.id('word-btn-b'));

  assert.strictEqual(app.get('homoScore'), 0);
  assert.strictEqual(app.id('homophones-feedback').textContent, 'The answer is "hear"');
  assert.ok(app.id('word-btn-a').classList.contains('word-correct'));
  assert.ok(app.id('word-btn-b').classList.contains('word-wrong'));
  assert.match(app.id('homophones-sentence').innerHTML, /fill-wrong">hear</);
});

test('a second tap on the same question is ignored', (t) => {
  const { app } = startHomophones(t);
  app.stubRandom([0.9]);
  useRound(app, [PAIR]);

  app.click(app.id('word-btn-a'));
  app.click(app.id('word-btn-b'));
  assert.strictEqual(app.get('homoScore'), 1);
});

test('the round advances after the reveal and finishes with a score', (t) => {
  const { app, timers } = startHomophones(t);
  app.stubRandom([0.9]);
  useRound(app, Array.from({ length: 10 }, () => PAIR));

  app.click(app.id('word-btn-a'));
  assert.strictEqual(app.get('homoIndex'), 0);
  timers.runPending();
  assert.strictEqual(app.get('homoIndex'), 1);
  assert.strictEqual(app.id('homophones-progress').textContent, 'Question 2 of 10');
  assert.strictEqual(app.id('homophones-feedback').textContent, '');

  for (let i = 1; i < 10; i++) {
    app.click(app.id('word-btn-a'));
    timers.runPending();
  }

  assert.strictEqual(app.get('homoScore'), 10);
  assert.ok(!app.id('win-overlay').classList.contains('hidden'));
  assert.strictEqual(app.id('win-heading').textContent, 'Great job!');
  assert.strictEqual(app.id('win-score').textContent, 'Score: 10 / 10');
});

test('a new game resets progress and hides the win overlay', (t) => {
  const { app } = startHomophones(t);
  app.set('homoIndex', 4);
  app.set('homoScore', 3);
  app.call('showWinScreen', 'Score: 3 / 10');

  app.call('homophonesNewGame');

  assert.strictEqual(app.get('homoIndex'), 0);
  assert.strictEqual(app.get('homoScore'), 0);
  assert.strictEqual(app.get('homoPairs').length, 10);
  assert.ok(app.id('win-overlay').classList.contains('hidden'));
});
