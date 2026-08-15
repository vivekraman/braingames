const test = require('node:test');
const assert = require('node:assert');
const { loadApp, plain } = require('./helpers/app');

const STORAGE_KEY = 'braingames_wordle';

/* Boots the app, enters the Wordle screen with a fixed answer and fake timers. */
function startWordle(t, { answer = 'BOAT', storage } = {}) {
  const app = loadApp(t, storage ? { storage } : undefined);
  const timers = app.fakeTimers();
  app.call('switchToGame', 'wordle');
  if (answer) {
    app.set('wordleAnswer', answer);
    app.call('wordleRestoreBoard');
  }
  return { app, timers };
}

function type(app, letters) {
  for (const letter of letters) app.call('wordleHandleKey', letter);
}

function tileRow(app, row) {
  return [0, 1, 2, 3].map((col) => app.id(`wtile-${row}-${col}`));
}

function rowLetters(app, row) {
  return tileRow(app, row).map((tile) => tile.textContent);
}

function rowStates(app, row) {
  return tileRow(app, row).map((tile) =>
    ['correct', 'present', 'absent'].find((state) => tile.classList.contains(state)) || null);
}

test('wordleScore marks exact hits before misplaced letters', (t) => {
  const app = loadApp(t);
  const score = (guess, answer) => plain(app.call('wordleScore', guess, answer));

  assert.deepStrictEqual(score('BOAT', 'BOAT'), ['correct', 'correct', 'correct', 'correct']);
  assert.deepStrictEqual(score('TAOB', 'BOAT'), ['present', 'present', 'present', 'present']);
  assert.deepStrictEqual(score('SLIP', 'BOAT'), ['absent', 'absent', 'absent', 'absent']);
  assert.deepStrictEqual(score('BOLD', 'BOAT'), ['correct', 'correct', 'absent', 'absent']);
});

test('wordleScore does not credit a repeated guess letter twice', (t) => {
  const app = loadApp(t);
  const score = (guess, answer) => plain(app.call('wordleScore', guess, answer));

  // One L in the answer, two in the guess: only the first unmatched one is present.
  assert.deepStrictEqual(score('LLAM', 'CALM'), ['present', 'absent', 'present', 'correct']);
  // Letters already consumed by an exact match are not available for pass 2.
  assert.deepStrictEqual(score('BOOT', 'BOAT'), ['correct', 'correct', 'absent', 'correct']);
  // Two of the same letter in the answer can both be scored.
  assert.deepStrictEqual(score('KEEP', 'FEED'), ['absent', 'correct', 'correct', 'absent']);
});

test('typing fills tiles left to right and parks the cursor on the last column', (t) => {
  const { app } = startWordle(t);
  type(app, 'BO');

  assert.deepStrictEqual(rowLetters(app, 0), ['B', 'O', '', '']);
  assert.strictEqual(app.get('wordleCursor'), 2);

  type(app, 'ATX');
  assert.deepStrictEqual(app.pget('wordleInput'), ['B', 'O', 'A', 'X']);
  assert.strictEqual(app.get('wordleCursor'), 3);
});

test('lowercase and non-letter keys are normalised or ignored', (t) => {
  const { app } = startWordle(t);
  type(app, 'bo');
  app.call('wordleHandleKey', 'Shift');
  app.call('wordleHandleKey', '1');
  assert.deepStrictEqual(app.pget('wordleInput'), ['B', 'O', null, null]);
});

test('backspace clears the current cell, then steps back', (t) => {
  const { app } = startWordle(t);
  type(app, 'BOAT');

  app.call('wordleHandleKey', '⌫');           // clears the filled last column
  assert.deepStrictEqual(app.pget('wordleInput'), ['B', 'O', 'A', null]);
  assert.strictEqual(app.get('wordleCursor'), 3);

  app.call('wordleHandleKey', 'Backspace');   // cell empty, so move left and clear
  assert.deepStrictEqual(app.pget('wordleInput'), ['B', 'O', null, null]);
  assert.strictEqual(app.get('wordleCursor'), 2);

  app.set('wordleCursor', 0);
  app.call('wordleHandleKey', '⌫');
  app.call('wordleHandleKey', '⌫');           // at column 0 there is nowhere to go
  assert.strictEqual(app.get('wordleCursor'), 0);
});

test('tapping a tile in the active row moves the cursor there', (t) => {
  const { app } = startWordle(t);
  type(app, 'BOAT');
  app.click(app.id('wtile-0-1'));
  assert.strictEqual(app.get('wordleCursor'), 1);

  app.click(app.id('wtile-2-3'));             // a future row is not editable
  assert.strictEqual(app.get('wordleCursor'), 1);

  type(app, 'U');
  assert.deepStrictEqual(app.pget('wordleInput'), ['B', 'U', 'A', 'T']);
});

test('an incomplete or unknown guess is not submitted', (t) => {
  const { app } = startWordle(t);

  type(app, 'BOA');
  app.call('wordleHandleKey', 'ENTER');
  assert.deepStrictEqual(app.pget('wordleGuesses'), []);

  type(app, 'X');                             // BOAX is not a real word
  app.call('wordleHandleKey', 'ENTER');
  assert.deepStrictEqual(app.pget('wordleGuesses'), []);
  assert.strictEqual(app.id('wordle-toast').textContent, 'Not in word list');
  assert.ok(app.id('wrow-0').classList.contains('shake'));
});

test('a valid guess is revealed, scored on the keyboard, and clears the row', (t) => {
  const { app, timers } = startWordle(t, { answer: 'BOAT' });

  type(app, 'BOLD');
  app.call('wordleHandleKey', 'ENTER');
  assert.deepStrictEqual(app.pget('wordleGuesses'), ['BOLD']);
  assert.deepStrictEqual(app.pget('wordleInput'), [null, null, null, null]);
  assert.strictEqual(app.get('wordleCursor'), 0);

  timers.runAll();
  assert.deepStrictEqual(rowStates(app, 0), ['correct', 'correct', 'absent', 'absent']);
  assert.deepStrictEqual(app.pget('wordleKeyStates'), { B: 'correct', O: 'correct', L: 'absent', D: 'absent' });
  assert.ok(app.$('#wordle-keyboard [data-key="B"]').classList.contains('correct'));
  assert.ok(app.$('#wordle-keyboard [data-key="L"]').classList.contains('absent'));
});

test('keyboard letter state only ever improves', (t) => {
  const { app } = startWordle(t, { answer: 'BOAT' });

  app.call('wordleUpdateKeyStates', 'TTTT', ['absent', 'present', 'correct', 'absent']);
  assert.strictEqual(app.pget('wordleKeyStates').T, 'correct');

  app.call('wordleUpdateKeyStates', 'TTTT', ['absent', 'absent', 'absent', 'absent']);
  assert.strictEqual(app.pget('wordleKeyStates').T, 'correct');
});

test('guessing the answer ends the game and shows the win result', (t) => {
  const { app, timers } = startWordle(t, { answer: 'BOAT' });

  type(app, 'BOAT');
  app.call('wordleHandleKey', 'ENTER');
  timers.runAll();

  assert.strictEqual(app.get('wordleGameOver'), true);
  assert.ok(app.id('wordle-result').classList.contains('win'));
  assert.match(app.id('wordle-result').textContent, /Got it in 1\/6!/);
  assert.strictEqual(app.get('timerInterval'), null);

  type(app, 'CAKE');                          // input is frozen after the game ends
  assert.deepStrictEqual(app.pget('wordleInput'), [null, null, null, null]);
});

test('running out of rows reveals the answer as a loss', (t) => {
  const { app, timers } = startWordle(t, { answer: 'BOAT' });

  for (let i = 0; i < 6; i++) {
    type(app, 'CAKE');
    app.call('wordleHandleKey', 'ENTER');
    timers.runAll();
  }

  assert.strictEqual(app.get('wordleGuesses').length, 6);
  assert.strictEqual(app.get('wordleGameOver'), true);
  assert.ok(app.id('wordle-result').classList.contains('loss'));
  assert.match(app.id('wordle-result').textContent, /The word was BOAT/);
});

test('progress is saved to localStorage as it happens', (t) => {
  const { app, timers } = startWordle(t, { answer: 'BOAT' });

  type(app, 'CAKE');
  app.call('wordleHandleKey', 'ENTER');
  timers.runAll();
  type(app, 'BO');

  const saved = JSON.parse(app.window.localStorage.getItem(STORAGE_KEY));
  assert.deepStrictEqual(saved.guesses, ['CAKE']);
  assert.deepStrictEqual(saved.input, ['B', 'O', null, null]);
  assert.strictEqual(saved.answer, 'BOAT');
  assert.strictEqual(saved.gameOver, false);
});

test('a saved game is restored with tiles, keyboard and cursor intact', (t) => {
  const { app } = startWordle(t, {
    answer: null,
    storage: {
      [STORAGE_KEY]: JSON.stringify({
        answer: 'BOAT',
        guesses: ['BOLD'],
        input: ['C', 'A', null, null],
        gameOver: false,
        keyStates: {},
      }),
    },
  });

  assert.strictEqual(app.get('wordleAnswer'), 'BOAT');
  assert.deepStrictEqual(rowLetters(app, 0), ['B', 'O', 'L', 'D']);
  assert.deepStrictEqual(rowStates(app, 0), ['correct', 'correct', 'absent', 'absent']);
  assert.deepStrictEqual(rowLetters(app, 1), ['C', 'A', '', '']);
  assert.strictEqual(app.get('wordleCursor'), 2);

  // Key states are recomputed from the guesses rather than trusting the save.
  assert.deepStrictEqual(app.pget('wordleKeyStates'), { B: 'correct', O: 'correct', L: 'absent', D: 'absent' });
  assert.ok(app.$('#wordle-keyboard [data-key="O"]').classList.contains('correct'));
});

test('a legacy string input in the save is normalised to an array', (t) => {
  const { app } = startWordle(t, {
    answer: null,
    storage: {
      [STORAGE_KEY]: JSON.stringify({
        answer: 'BOAT', guesses: [], input: 'CA', gameOver: false, keyStates: {},
      }),
    },
  });

  assert.deepStrictEqual(app.pget('wordleInput'), ['C', 'A', null, null]);
  assert.strictEqual(app.get('wordleCursor'), 2);
});

test('a corrupt save is ignored in favour of a fresh game', (t) => {
  const { app } = startWordle(t, { answer: null, storage: { [STORAGE_KEY]: '{not json' } });

  assert.strictEqual(app.call('wordleLoadState'), null);
  assert.deepStrictEqual(app.pget('wordleGuesses'), []);
  assert.ok(app.window.WORDLE_ANSWERS.includes(app.get('wordleAnswer')));
});

test('a finished game is restored straight to its result banner', (t) => {
  const { app } = startWordle(t, {
    answer: null,
    storage: {
      [STORAGE_KEY]: JSON.stringify({
        answer: 'BOAT',
        guesses: ['CAKE', 'BOLD', 'BOAT'],
        input: [null, null, null, null],
        gameOver: true,
        keyStates: {},
      }),
    },
  });

  assert.ok(app.id('wordle-result').classList.contains('win'));
  assert.match(app.id('wordle-result').textContent, /Got it in 3\/6!/);
});

test('the new-game button confirms before discarding progress', (t) => {
  const { app } = startWordle(t, { answer: 'BOAT' });
  type(app, 'BO');

  let asked = 0;
  app.window.confirm = () => { asked++; return false; };
  app.click(app.id('btn-wordle-new'));
  assert.strictEqual(asked, 1);
  assert.deepStrictEqual(app.pget('wordleInput'), ['B', 'O', null, null]);

  app.window.confirm = () => true;
  app.click(app.id('btn-wordle-new'));
  assert.deepStrictEqual(app.pget('wordleInput'), [null, null, null, null]);
  assert.strictEqual(app.window.localStorage.getItem(STORAGE_KEY), null);
});

test('a fresh game clears the saved state and rebuilds the board', (t) => {
  const { app } = startWordle(t, { answer: 'BOAT' });
  app.call('wordleStartNewGame');

  assert.strictEqual(app.window.localStorage.getItem(STORAGE_KEY), null);
  assert.strictEqual(app.document.querySelectorAll('.wordle-tile').length, 24);
  assert.strictEqual(app.document.querySelectorAll('.wordle-key').length, 28);
  assert.ok(app.id('wordle-result').classList.contains('hidden'));
  assert.strictEqual(app.get('wordleAnswer').length, 4);
});

test('physical keydown only reaches Wordle while it is the active game', (t) => {
  const { app } = startWordle(t, { answer: 'BOAT' });
  const press = (key, init = {}) =>
    app.document.dispatchEvent(new app.window.KeyboardEvent('keydown', { key, ...init }));

  press('b');
  assert.deepStrictEqual(app.pget('wordleInput'), ['B', null, null, null]);

  press('o', { ctrlKey: true });              // modifier combos are shortcuts, not input
  assert.deepStrictEqual(app.pget('wordleInput'), ['B', null, null, null]);

  app.call('showMenu');
  press('o');
  assert.deepStrictEqual(app.pget('wordleInput'), ['B', null, null, null]);
});
