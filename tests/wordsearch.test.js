const test = require('node:test');
const assert = require('node:assert');
const { loadApp, plain } = require('./helpers/app');

const STORAGE_KEY = 'braingames_wordsearch';
const GRID_SIZE = 12;

function startWordSearch(t, options) {
  const app = loadApp(t, options);
  const timers = app.fakeTimers();
  app.call('switchToGame', 'wordsearch');
  return { app, timers };
}

/* Reads a placed word back out of the grid along its recorded cells. */
function readCells(grid, cells) {
  return cells.map(({ row, col }) => grid[row][col]).join('');
}

function setSelection(app, cells) {
  app.set('selectionStart', cells[0]);
  app.set('currentHighlight', new Set(cells.map((c) => `${c.row},${c.col}`)));
}

test('every word bank entry fits the grid and is plain uppercase', (t) => {
  const app = loadApp(t);
  const bank = plain(app.window.WORD_BANK);

  for (const [key, category] of Object.entries(bank)) {
    assert.ok(category.label && category.emoji, `${key} needs a label and emoji`);
    assert.ok(category.words.length >= 12, `${key} needs enough words for a puzzle`);
    assert.strictEqual(new Set(category.words).size, category.words.length, `${key} has duplicates`);
    for (const word of category.words) {
      assert.match(word, /^[A-Z]+$/, `${word} must be uppercase letters only`);
      assert.ok(word.length <= GRID_SIZE, `${word} does not fit in a ${GRID_SIZE}-cell line`);
      assert.ok(word.length >= 4, `${word} is too short to hunt for`);
    }
  }
});

test('every word bank category has a matching background theme', (t) => {
  const app = loadApp(t);
  const themes = plain(app.get('CATEGORY_THEMES'));
  for (const key of Object.keys(plain(app.window.WORD_BANK))) {
    assert.ok(themes[key], `${key} has no theme`);
    assert.match(themes[key].bgColor, /^#[0-9a-f]{6}$/i);
    assert.ok(themes[key].items.length > 0);
  }
});

test('initGrid produces an empty square grid', (t) => {
  const app = loadApp(t);
  app.call('initGrid');
  const grid = plain(app.get('grid'));
  assert.strictEqual(grid.length, GRID_SIZE);
  for (const row of grid) {
    assert.strictEqual(row.length, GRID_SIZE);
    assert.ok(row.every((cell) => cell === null));
  }
});

test('shuffle keeps every element', (t) => {
  const app = loadApp(t);
  const shuffled = plain(app.call('shuffle', [1, 2, 3, 4, 5, 6, 7, 8]));
  assert.deepStrictEqual([...shuffled].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8]);
});

test('selectWords picks 8 to 12 distinct words from the category', (t) => {
  const app = loadApp(t);
  const bank = plain(app.window.WORD_BANK).animals.words;
  for (let i = 0; i < 30; i++) {
    const words = plain(app.call('selectWords', 'animals'));
    assert.ok(words.length >= 8 && words.length <= 12, `unexpected count ${words.length}`);
    assert.strictEqual(new Set(words).size, words.length);
    for (const word of words) assert.ok(bank.includes(word));
  }
});

test('canPlace rejects runs that leave the grid or clash with a letter', (t) => {
  const app = loadApp(t);
  app.call('initGrid');
  const right = { dr: 0, dc: 1 };
  const down = { dr: 1, dc: 0 };

  assert.strictEqual(app.call('canPlace', 'CAT', 0, 0, right), true);
  assert.strictEqual(app.call('canPlace', 'CAT', 0, GRID_SIZE - 2, right), false);
  assert.strictEqual(app.call('canPlace', 'CAT', GRID_SIZE - 1, 0, down), false);
  assert.strictEqual(app.call('canPlace', 'CAT', 0, 1, { dr: 0, dc: -1 }), false);

  app.call('writeWord', 'CAT', 0, 0, right);
  assert.strictEqual(app.call('canPlace', 'COT', 0, 0, down), true, 'sharing the C is fine');
  assert.strictEqual(app.call('canPlace', 'DOG', 0, 0, down), false, 'D cannot overwrite the C');
});

test('writeWord lays the letters out and records their cells', (t) => {
  const app = loadApp(t);
  app.call('initGrid');
  app.set('placedWords', {});
  app.call('writeWord', 'CAT', 2, 3, { dr: 1, dc: 1 });

  const grid = plain(app.get('grid'));
  const cells = plain(app.get('placedWords')).CAT;
  assert.deepStrictEqual(cells, [{ row: 2, col: 3 }, { row: 3, col: 4 }, { row: 4, col: 5 }]);
  assert.strictEqual(readCells(grid, cells), 'CAT');
});

test('placeWord reports failure when nothing fits', (t) => {
  const app = loadApp(t);
  app.call('initGrid');
  app.set('placedWords', {});
  assert.strictEqual(app.call('placeWord', 'CAT'), true);
  assert.strictEqual(app.call('placeWord', 'A'.repeat(GRID_SIZE + 1)), false);
});

test('generateGrid places at least eight words and fills the rest with letters', (t) => {
  const app = loadApp(t);
  for (const category of Object.keys(plain(app.window.WORD_BANK))) {
    app.call('generateGrid', category);
    const grid = plain(app.get('grid'));
    const placed = plain(app.get('placedWords'));

    assert.ok(Object.keys(placed).length >= 8, `${category} placed too few words`);
    for (const [word, cells] of Object.entries(placed)) {
      assert.strictEqual(readCells(grid, cells), word, `${word} is not readable in the grid`);
    }
    for (const row of grid) {
      assert.strictEqual(row.length, GRID_SIZE);
      assert.ok(row.every((cell) => /^[A-Z]$/.test(cell)), 'no empty cells are left');
    }
  }
});

test('computeLineCells walks straight and diagonal runs, in any direction', (t) => {
  const app = loadApp(t);
  const line = (start, end) => plain(app.call('computeLineCells', start, end));

  assert.deepStrictEqual(line({ row: 1, col: 1 }, { row: 1, col: 1 }), [{ row: 1, col: 1 }]);
  assert.deepStrictEqual(line({ row: 0, col: 0 }, { row: 0, col: 2 }),
    [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }]);
  assert.deepStrictEqual(line({ row: 2, col: 0 }, { row: 0, col: 0 }),
    [{ row: 2, col: 0 }, { row: 1, col: 0 }, { row: 0, col: 0 }]);
  assert.deepStrictEqual(line({ row: 0, col: 0 }, { row: 2, col: 2 }),
    [{ row: 0, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 2 }]);
  assert.deepStrictEqual(line({ row: 2, col: 2 }, { row: 0, col: 4 }),
    [{ row: 2, col: 2 }, { row: 1, col: 3 }, { row: 0, col: 4 }]);
  // An off-axis drag snaps onto the dominant axis rather than returning nothing.
  assert.deepStrictEqual(line({ row: 0, col: 0 }, { row: 1, col: 3 }),
    [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }]);
});

test('a new game renders the grid, the word chips and the background', (t) => {
  const { app } = startWordSearch(t);

  assert.strictEqual(app.document.querySelectorAll('#grid-container .cell').length, GRID_SIZE ** 2);
  const chips = [...app.document.querySelectorAll('.word-chip')];
  assert.deepStrictEqual(chips.map((c) => c.dataset.word), Object.keys(plain(app.get('placedWords'))));
  assert.strictEqual(app.document.querySelectorAll('#bg-layer .bg-item').length, 22);
  assert.match(app.id('category-label').textContent, /\S/);
  assert.ok(app.id('win-overlay').classList.contains('hidden'));
});

test('a dark theme category flips the body class', (t) => {
  const { app } = startWordSearch(t);
  app.call('newGame', 'space');
  assert.ok(app.document.body.classList.contains('theme-dark'));
  app.call('newGame', 'animals');
  assert.ok(!app.document.body.classList.contains('theme-dark'));
});

test('selecting a placed word marks the cells and the chip as found', (t) => {
  const { app } = startWordSearch(t);
  const [word, cells] = Object.entries(plain(app.get('placedWords')))[0];

  setSelection(app, cells);
  app.call('validateSelection');

  assert.ok(plain([...app.get('foundWords')]).includes(word));
  assert.ok(app.$(`[data-word="${word}"]`).classList.contains('found'));
  for (const { row, col } of cells) {
    assert.ok(app.$(`.cell[data-row="${row}"][data-col="${col}"]`).classList.contains('found'));
  }
  assert.strictEqual(app.get('currentHighlight').size, 0);
});

test('a word also counts when it is selected backwards', (t) => {
  const { app } = startWordSearch(t);
  const [word, cells] = Object.entries(plain(app.get('placedWords')))[0];

  setSelection(app, [...cells].reverse());
  app.call('validateSelection');
  assert.ok(plain([...app.get('foundWords')]).includes(word));
});

test('a wrong selection flashes a miss and stays unfound', (t) => {
  const { app } = startWordSearch(t);
  const grid = Array.from({ length: GRID_SIZE }, () => new Array(GRID_SIZE).fill('X'));
  app.set('grid', grid);
  app.set('placedWords', { QUIZ: [{ row: 0, col: 0 }] });
  app.call('renderGrid');

  setSelection(app, [{ row: 0, col: 0 }, { row: 0, col: 1 }]);
  app.call('validateSelection');

  assert.strictEqual(app.get('foundWords').size, 0);
  assert.ok(app.$('.cell[data-row="0"][data-col="1"]').classList.contains('miss'));
  assert.strictEqual(app.get('currentHighlight').size, 0);
});

test('an empty selection is a no-op', (t) => {
  const { app } = startWordSearch(t);
  app.set('currentHighlight', new Set());
  app.call('validateSelection');
  assert.strictEqual(app.get('foundWords').size, 0);
});

test('highlighting adds and removes the class as the drag moves', (t) => {
  const { app } = startWordSearch(t);
  const cell = (row, col) => app.$(`.cell[data-row="${row}"][data-col="${col}"]`);

  app.call('setHighlight', new app.window.Set(['0,0', '0,1']));
  assert.ok(cell(0, 0).classList.contains('highlighted'));
  assert.ok(cell(0, 1).classList.contains('highlighted'));

  app.call('setHighlight', new app.window.Set(['0,0']));
  assert.ok(cell(0, 0).classList.contains('highlighted'));
  assert.ok(!cell(0, 1).classList.contains('highlighted'));

  app.call('clearHighlight');
  assert.ok(!cell(0, 0).classList.contains('highlighted'));
});

test('a pointer drag across the grid selects the line of cells', (t) => {
  const { app } = startWordSearch(t);
  const cells = Object.values(plain(app.get('placedWords')))[0];
  // The grid uses elementFromPoint, which jsdom has no layout for: map the
  // synthetic coordinates back onto cells instead.
  const at = new Map();
  cells.forEach(({ row, col }, i) => {
    at.set(i, app.$(`.cell[data-row="${row}"][data-col="${col}"]`));
  });
  app.document.elementFromPoint = (x) => at.get(x);
  app.id('grid-container').setPointerCapture = () => {};

  // jsdom has no PointerEvent; a MouseEvent of the same type reaches the same
  // listeners and carries the coordinates the handlers read.
  const pointer = (type, x) => app.id('grid-container').dispatchEvent(
    new app.window.MouseEvent(type, { bubbles: true, clientX: x, clientY: 0 }));

  pointer('pointerdown', 0);
  assert.strictEqual(app.get('isSelecting'), true);
  pointer('pointermove', cells.length - 1);
  assert.strictEqual(app.get('currentHighlight').size, cells.length);
  pointer('pointerup', cells.length - 1);
  assert.strictEqual(app.get('isSelecting'), false);
  assert.strictEqual(app.get('foundWords').size, 1);
});

test('finding every word clears the save and shows the win screen', (t) => {
  const { app, timers } = startWordSearch(t);

  for (const cells of Object.values(plain(app.get('placedWords')))) {
    setSelection(app, cells);
    app.call('validateSelection');
  }

  assert.strictEqual(app.window.localStorage.getItem(STORAGE_KEY), null);
  timers.runPending();
  assert.ok(!app.id('win-overlay').classList.contains('hidden'));
  assert.match(app.id('win-time').textContent, /^Time: \d+:\d{2}$/);
});

test('progress is saved as words are found', (t) => {
  const { app } = startWordSearch(t);
  const [word, cells] = Object.entries(plain(app.get('placedWords')))[0];

  setSelection(app, cells);
  app.call('validateSelection');

  const saved = JSON.parse(app.window.localStorage.getItem(STORAGE_KEY));
  assert.strictEqual(saved.category, app.get('currentCategory'));
  assert.deepStrictEqual(saved.foundWords, [word]);
  assert.deepStrictEqual(saved.foundCells, cells.map(({ row, col }) => `${row},${col}`));
  assert.strictEqual(saved.grid.length, GRID_SIZE);
});

test('a saved puzzle is restored with its found words intact', (t) => {
  const grid = Array.from({ length: GRID_SIZE }, () => new Array(GRID_SIZE).fill('X'));
  'CAT'.split('').forEach((letter, i) => { grid[0][i] = letter; });
  const { app } = startWordSearch(t, {
    storage: {
      [STORAGE_KEY]: JSON.stringify({
        category: 'weather',
        grid,
        placedWords: { CAT: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }] },
        foundWords: ['CAT'],
        foundCells: ['0,0', '0,1', '0,2'],
      }),
    },
  });

  assert.strictEqual(app.get('currentCategory'), 'weather');
  assert.strictEqual(app.$('.cell[data-row="0"][data-col="0"]').textContent, 'C');
  assert.ok(app.$('.cell[data-row="0"][data-col="2"]').classList.contains('found'));
  assert.ok(app.$('[data-word="CAT"]').classList.contains('found'));
  assert.match(app.id('category-label').textContent, /Weather/);
});

test('a corrupt save is discarded and a fresh puzzle generated', (t) => {
  const { app } = startWordSearch(t, { storage: { [STORAGE_KEY]: 'not json at all' } });

  assert.ok(Object.keys(plain(app.get('placedWords'))).length >= 8);
  assert.strictEqual(app.get('foundWords').size, 0);
  // The unreadable entry has been replaced by a save for the fresh puzzle.
  assert.deepStrictEqual(plain(app.call('loadWordSearchState')).foundWords, []);

  app.window.localStorage.setItem(STORAGE_KEY, '{"grid": ');
  assert.strictEqual(app.call('loadWordSearchState'), null);

  app.call('clearWordSearchState');
  assert.strictEqual(app.call('loadWordSearchState'), null);
});

test('starting a new puzzle resets found state', (t) => {
  const { app } = startWordSearch(t);
  const cells = Object.values(plain(app.get('placedWords')))[0];
  setSelection(app, cells);
  app.call('validateSelection');

  app.click(app.id('btn-new'));

  assert.strictEqual(app.get('foundWords').size, 0);
  assert.strictEqual(app.get('foundCells').size, 0);
  assert.strictEqual(app.document.querySelectorAll('.cell.found').length, 0);
});
