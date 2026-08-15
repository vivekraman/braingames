const test = require('node:test');
const assert = require('node:assert');
const { loadApp, plain } = require('./helpers/app');

function startGrammar(t) {
  const app = loadApp(t);
  const timers = app.fakeTimers();
  app.call('switchToGame', 'grammar');
  return { app, timers };
}

const words = (app) => [...app.document.querySelectorAll('.gram-word')];
const errorWords = (app) => [...app.document.querySelectorAll('.gram-word[data-error="true"]')];

test('parseGramToken leaves plain words alone', (t) => {
  const app = loadApp(t);
  assert.deepStrictEqual(plain(app.call('parseGramToken', 'Grandma,')),
    { text: 'Grandma,', isError: false, correct: null });
  // A star in the middle of a token is not a marker.
  assert.deepStrictEqual(plain(app.call('parseGramToken', 'fi*ve')),
    { text: 'fi*ve', isError: false, correct: null });
});

test('parseGramToken reads the mistake, its fix and trailing punctuation', (t) => {
  const app = loadApp(t);
  assert.deepStrictEqual(plain(app.call('parseGramToken', '*recieved:received*')),
    { text: 'recieved', isError: true, correct: 'received' });
  assert.deepStrictEqual(plain(app.call('parseGramToken', '*seen:saw*.')),
    { text: 'seen.', isError: true, correct: 'saw.' });
  // Underscores stand in for spaces in multi-word corrections.
  assert.deepStrictEqual(plain(app.call('parseGramToken', '*alot:a_lot*!')),
    { text: 'alot!', isError: true, correct: 'a lot!' });
  // A marker without a fix is still a mistake, just with no hint.
  assert.deepStrictEqual(plain(app.call('parseGramToken', '*gooder*')),
    { text: 'gooder', isError: true, correct: null });
});

test('every letter is well formed and has mistakes to find', (t) => {
  const app = loadApp(t);
  const letters = plain(app.get('GRAMMAR_LETTERS'));
  assert.ok(letters.length > 1, 'more than one letter is needed to avoid repeats');

  for (const letter of letters) {
    assert.ok(letter.paragraphs.length > 0);
    const markers = letter.paragraphs.join(' ').match(/\*[^*]*\*/g) || [];
    assert.ok(markers.length >= 5, 'each letter needs a handful of mistakes');
    for (const marker of markers) {
      assert.match(marker, /^\*[^\s*:]+(:[^\s*:]+)?\*$/, `malformed marker ${marker}`);
      const [wrong, correct] = marker.slice(1, -1).split(':');
      if (correct) assert.notStrictEqual(wrong, correct, `${marker} corrects nothing`);
    }
    // Stars must pair up, otherwise a mistake renders as literal text.
    assert.strictEqual((letter.paragraphs.join(' ').match(/\*/g) || []).length % 2, 0);
  }
});

test('renderGramParagraph tags mistakes and keeps the words spaced', (t) => {
  const app = loadApp(t);
  const p = app.call('renderGramParagraph', 'I *seen:saw* it here');

  assert.strictEqual(p.textContent, 'I seen it here');
  const spans = [...p.querySelectorAll('.gram-word')];
  assert.deepStrictEqual(spans.map((s) => s.textContent), ['I', 'seen', 'it', 'here']);
  assert.strictEqual(spans.filter((s) => s.dataset.error === 'true').length, 1);
  assert.strictEqual(spans[1].dataset.correct, 'saw');
  assert.strictEqual(spans[0].dataset.error, undefined);
});

test('a new game renders one letter and counts its mistakes', (t) => {
  const { app } = startGrammar(t);

  assert.strictEqual(app.document.querySelectorAll('.gram-paragraph').length,
    plain(app.get('GRAMMAR_LETTERS'))[app.get('gramLetterIdx')].paragraphs.length);
  assert.strictEqual(app.get('gramTotalErrors'), errorWords(app).length);
  assert.strictEqual(app.get('gramFoundCount'), 0);
  assert.strictEqual(app.id('grammar-progress').textContent,
    `Found 0 of ${app.get('gramTotalErrors')} mistakes`);
});

test('a new game never shows the same letter twice in a row', (t) => {
  const { app } = startGrammar(t);
  for (let i = 0; i < 30; i++) {
    const previous = app.get('gramLetterIdx');
    app.call('grammarNewGame');
    assert.notStrictEqual(app.get('gramLetterIdx'), previous);
  }
});

test('tapping a mistake marks it, shows the fix and bumps the count', (t) => {
  const { app } = startGrammar(t);
  const target = errorWords(app).find((span) => span.dataset.correct);

  app.click(target);

  assert.ok(target.classList.contains('gram-found'));
  assert.strictEqual(app.get('gramFoundCount'), 1);
  assert.match(app.id('grammar-progress').textContent, /^Found 1 of \d+ mistakes$/);
  assert.strictEqual(target.nextElementSibling.className, 'gram-hint');
  assert.strictEqual(target.nextElementSibling.textContent, ` (${target.dataset.correct})`);
});

test('tapping the same mistake again does not double count', (t) => {
  const { app } = startGrammar(t);
  const target = errorWords(app)[0];

  app.click(target);
  app.click(target);

  assert.strictEqual(app.get('gramFoundCount'), 1);
  assert.strictEqual(app.document.querySelectorAll('.gram-hint').length, 1);
});

test('tapping a correct word flashes a miss without scoring', (t) => {
  const { app } = startGrammar(t);
  const target = words(app).find((span) => span.dataset.error !== 'true');

  app.click(target);

  assert.ok(target.classList.contains('gram-miss'));
  assert.strictEqual(app.get('gramFoundCount'), 0);

  // The flash clears itself once the animation ends, ready for another try.
  target.dispatchEvent(new app.window.Event('animationend'));
  assert.ok(!target.classList.contains('gram-miss'));
});

test('finding every mistake wins the round', (t) => {
  const { app, timers } = startGrammar(t);
  const total = app.get('gramTotalErrors');

  errorWords(app).forEach((span) => app.click(span));
  assert.strictEqual(app.get('gramFoundCount'), total);
  assert.ok(app.id('win-overlay').classList.contains('hidden'), 'the win screen waits a beat');

  timers.runPending();
  assert.ok(!app.id('win-overlay').classList.contains('hidden'));
  assert.strictEqual(app.id('win-heading').textContent, 'Great editing!');
  assert.strictEqual(app.id('win-score').textContent, `Found all ${total} mistakes!`);
});

test('taps outside a word are ignored', (t) => {
  const { app } = startGrammar(t);
  app.click(app.id('grammar-letter-body'));
  assert.strictEqual(app.get('gramFoundCount'), 0);
});
