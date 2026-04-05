/* ────────────────────────────────────────────────
   Word Search — Game Engine
   ──────────────────────────────────────────────── */

const GRID_SIZE = 12;
const MIN_WORDS = 8;
const MAX_WORDS = 12;
const MAX_PLACE_ATTEMPTS = 200;
const MAX_GEN_ATTEMPTS = 10;

// Weighted fill letters (common English letters repeat more)
const FILL_LETTERS = 'EEEEAAAAIIIIOOOONNSSRRTTLLCCDDUUPPMMHHGGBBFFYYKKWWVVXZQJ';

const DIRECTIONS = [
  { dr: 0,  dc: 1  },
  { dr: 0,  dc: -1 },
  { dr: 1,  dc: 0  },
  { dr: -1, dc: 0  },
  { dr: 1,  dc: 1  },
  { dr: 1,  dc: -1 },
  { dr: -1, dc: 1  },
  { dr: -1, dc: -1 },
];

/* ── Category themes ── */
const CATEGORY_THEMES = {
  animals: {
    bgColor: '#fdf3e3',
    dark: false,
    items: ['🐘','🦒','🐧','🐬','🦁','🐯','🦊','🐻','🦋','🐦','🐸','🦓','🐊','🦏','🐆','🐒']
  },
  weather: {
    bgColor: '#e4f2fd',
    dark: false,
    items: ['⛅','🌩','🌈','🌪','🌧','❄️','⚡','☀️','💨','🌨','🌀','🌫','🌤','🌬','☁️','🌦']
  },
  school: {
    bgColor: '#fffde7',
    dark: false,
    items: ['📚','✏️','📐','📏','🎒','📝','🔬','🖊','📌','📓','🖍️','📎','✂️','🔭','📖','🏫']
  },
  sports: {
    bgColor: '#f1f8e9',
    dark: false,
    items: ['⚽','🏈','🏀','⚾','🏐','🎾','🏒','🎳','🥊','🏆','🥅','🎽','🏋️','🏊','🚴','🤸']
  },
  food: {
    bgColor: '#fff8f0',
    dark: false,
    items: ['🥪','🥦','🍝','🥞','🫐','🥒','🥑','🧁','🥨','🍕','🌮','🍜','🥗','🍓','🍎','🧆']
  },
  nature: {
    bgColor: '#f0faf3',
    dark: false,
    items: ['🍃','🌳','🌸','🌺','🌿','🍀','🌲','🌻','🌼','🦋','🌾','🍂','🌱','🪴','🍁','🌵']
  },
  space: {
    bgColor: '#0f0f2e',
    dark: true,
    items: ['🪐','⭐','💫','☄️','🌙','🌟','🚀','🛸','✨','🌌','🌠','💥','🔭','🌑','🪨','🛰️']
  },
  ocean: {
    bgColor: '#e0f4ff',
    dark: false,
    items: ['🐠','🦑','🦀','🐙','🦞','🌊','🪸','🐚','🐋','🦈','🐡','🦭','🪼','🐬','🌀','🐟']
  }
};

/* ── State ── */
let grid = [];
let placedWords = {};
let foundWords = new Set();
let foundCells = new Set();
let currentCategory = 'animals';
let currentHighlight = new Set();
let isSelecting = false;
let selectionStart = null;
let startTime = null;
let timerInterval = null;

/* ── DOM refs ── */
const bgLayer = document.getElementById('bg-layer');
const gridEl = document.getElementById('grid-container');
const wordListEl = document.getElementById('word-list');
const timerEl = document.getElementById('timer');
const categoryLabel = document.getElementById('category-label');
const winOverlay = document.getElementById('win-overlay');
const winTimeEl = document.getElementById('win-time');
const winScoreEl = document.getElementById('win-score');
const categoryModal = document.getElementById('category-modal');
const categoryGridEl = document.getElementById('category-grid');

/* ══════════════════════════════════════════════
   GRID GENERATION
   ══════════════════════════════════════════════ */

function initGrid() {
  grid = Array.from({ length: GRID_SIZE }, () => new Array(GRID_SIZE).fill(null));
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function selectWords(category) {
  const words = [...WORD_BANK[category].words];
  shuffle(words);
  const count = MIN_WORDS + Math.floor(Math.random() * (MAX_WORDS - MIN_WORDS + 1));
  return words.slice(0, count);
}

function canPlace(word, row, col, dir) {
  for (let i = 0; i < word.length; i++) {
    const r = row + i * dir.dr;
    const c = col + i * dir.dc;
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false;
    const existing = grid[r][c];
    if (existing !== null && existing !== word[i]) return false;
  }
  return true;
}

function writeWord(word, row, col, dir) {
  const cells = [];
  for (let i = 0; i < word.length; i++) {
    const r = row + i * dir.dr;
    const c = col + i * dir.dc;
    grid[r][c] = word[i];
    cells.push({ row: r, col: c });
  }
  placedWords[word] = cells;
}

function placeWord(word) {
  const candidates = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      for (const dir of DIRECTIONS) {
        candidates.push({ row, col, dir });
      }
    }
  }
  shuffle(candidates);
  // Limit attempts to avoid slowdown on a near-full grid
  const attempts = Math.min(candidates.length, MAX_PLACE_ATTEMPTS);
  for (let i = 0; i < attempts; i++) {
    const { row, col, dir } = candidates[i];
    if (canPlace(word, row, col, dir)) {
      writeWord(word, row, col, dir);
      return true;
    }
  }
  return false;
}

function fillGrid() {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === null) {
        grid[r][c] = FILL_LETTERS[Math.floor(Math.random() * FILL_LETTERS.length)];
      }
    }
  }
}

function generateGrid(category) {
  for (let attempt = 0; attempt < MAX_GEN_ATTEMPTS; attempt++) {
    initGrid();
    placedWords = {};

    const words = selectWords(category);
    // Longest first — harder to place, do them early
    words.sort((a, b) => b.length - a.length);

    for (const word of words) {
      placeWord(word); // skip if can't place — that's fine
    }

    if (Object.keys(placedWords).length >= MIN_WORDS) {
      fillGrid();
      return;
    }
  }
  // Fallback: just use however many words placed
  fillGrid();
}

/* ══════════════════════════════════════════════
   BACKGROUND
   ══════════════════════════════════════════════ */

function renderBackground(category) {
  const theme = CATEGORY_THEMES[category];
  if (!theme) return;

  // Swap body background color and dark-theme class
  document.body.style.setProperty('--color-bg', theme.bgColor);
  document.body.classList.toggle('theme-dark', theme.dark);

  // Rebuild scattered emoji
  bgLayer.innerHTML = '';
  const ITEM_COUNT = 22;
  const ANIMS = ['bg-float', 'bg-sway', 'bg-spin-slow'];

  for (let i = 0; i < ITEM_COUNT; i++) {
    const el = document.createElement('span');
    el.className = 'bg-item';

    const emoji = theme.items[Math.floor(Math.random() * theme.items.length)];
    el.textContent = emoji;

    // Random position across the full viewport
    const left = Math.random() * 100;
    const top = Math.random() * 110 - 5; // slightly off edges
    const size = 1.4 + Math.random() * 2.2; // 1.4–3.6rem
    const opacity = theme.dark
      ? 0.25 + Math.random() * 0.2   // brighter on dark bg
      : 0.10 + Math.random() * 0.12; // subtle on light bg
    const rot = Math.floor(Math.random() * 360);
    const anim = ANIMS[Math.floor(Math.random() * ANIMS.length)];
    const duration = 7 + Math.random() * 12; // 7–19s
    const delay = -(Math.random() * 15);      // start mid-animation

    el.style.cssText = `
      left: ${left}%;
      top: ${top}%;
      font-size: ${size}rem;
      opacity: ${opacity};
      --rot: ${rot}deg;
      animation: ${anim} ${duration.toFixed(1)}s ${delay.toFixed(1)}s ease-in-out infinite;
    `;

    bgLayer.appendChild(el);
  }
}

/* ══════════════════════════════════════════════
   RENDERING
   ══════════════════════════════════════════════ */

function renderGrid() {
  gridEl.innerHTML = '';
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.textContent = grid[r][c];
      cell.dataset.row = r;
      cell.dataset.col = c;
      gridEl.appendChild(cell);
    }
  }
}

function renderWordList() {
  wordListEl.innerHTML = '';
  for (const word of Object.keys(placedWords)) {
    const chip = document.createElement('span');
    chip.className = 'word-chip';
    chip.textContent = word;
    chip.dataset.word = word;
    wordListEl.appendChild(chip);
  }
}

function getCellEl(row, col) {
  return gridEl.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
}

function setHighlight(newSet) {
  // Remove from cells no longer highlighted
  for (const key of currentHighlight) {
    if (!newSet.has(key)) {
      const [r, c] = key.split(',').map(Number);
      const el = getCellEl(r, c);
      if (el) el.classList.remove('highlighted');
    }
  }
  // Add to new cells
  for (const key of newSet) {
    if (!currentHighlight.has(key)) {
      const [r, c] = key.split(',').map(Number);
      const el = getCellEl(r, c);
      if (el) el.classList.add('highlighted');
    }
  }
  currentHighlight = newSet;
}

function clearHighlight() {
  setHighlight(new Set());
}

function markCellFound(row, col) {
  const key = `${row},${col}`;
  foundCells.add(key);
  const el = getCellEl(row, col);
  if (el) {
    el.classList.remove('highlighted');
    el.classList.add('found');
  }
}

function markWordFound(word) {
  foundWords.add(word);
  for (const { row, col } of placedWords[word]) {
    markCellFound(row, col);
  }
  const chip = wordListEl.querySelector(`[data-word="${word}"]`);
  if (chip) chip.classList.add('found');
}

function flashMiss(cells) {
  for (const key of cells) {
    const [r, c] = key.split(',').map(Number);
    const el = getCellEl(r, c);
    if (!el) continue;
    el.classList.remove('highlighted');
    // Force reflow so animation restarts if triggered multiple times
    void el.offsetWidth;
    el.classList.add('miss');
    el.addEventListener('animationend', () => el.classList.remove('miss'), { once: true });
  }
}

/* ══════════════════════════════════════════════
   INTERACTION — POINTER EVENTS
   ══════════════════════════════════════════════ */

function computeLineCells(start, end) {
  const dr = end.row - start.row;
  const dc = end.col - start.col;
  if (dr === 0 && dc === 0) return [start];

  const steps = Math.max(Math.abs(dr), Math.abs(dc));
  const unitR = Math.round(dr / steps);
  const unitC = Math.round(dc / steps);

  const cells = [];
  for (let i = 0; i <= steps; i++) {
    cells.push({ row: start.row + i * unitR, col: start.col + i * unitC });
  }
  return cells;
}

function cellFromEvent(e) {
  // Use elementFromPoint to find cell even when pointer-captured on grid
  const el = document.elementFromPoint(e.clientX, e.clientY);
  if (!el || !el.classList.contains('cell')) return null;
  return { row: parseInt(el.dataset.row, 10), col: parseInt(el.dataset.col, 10) };
}

gridEl.addEventListener('pointerdown', (e) => {
  const cell = cellFromEvent(e);
  if (!cell) return;
  e.preventDefault();
  isSelecting = true;
  selectionStart = cell;
  gridEl.setPointerCapture(e.pointerId);
  const key = `${cell.row},${cell.col}`;
  setHighlight(new Set([key]));
});

gridEl.addEventListener('pointermove', (e) => {
  if (!isSelecting) return;
  const cell = cellFromEvent(e);
  if (!cell) return;
  const lineCells = computeLineCells(selectionStart, cell);
  const newSet = new Set(lineCells.map(c => `${c.row},${c.col}`));
  setHighlight(newSet);
});

gridEl.addEventListener('pointerup', (e) => {
  if (!isSelecting) return;
  isSelecting = false;
  validateSelection();
});

gridEl.addEventListener('pointercancel', () => {
  isSelecting = false;
  clearHighlight();
});

function validateSelection() {
  if (currentHighlight.size === 0) return;

  // Sort cells by row then col to extract word
  const cells = [...currentHighlight].map(key => {
    const [r, c] = key.split(',').map(Number);
    return { row: r, col: c };
  });
  // Reconstruct order from start to end using the direction
  // Use the first cell (selectionStart) and sort by distance along the direction
  const ordered = cells.sort((a, b) => {
    const da = Math.abs(a.row - selectionStart.row) + Math.abs(a.col - selectionStart.col);
    const db = Math.abs(b.row - selectionStart.row) + Math.abs(b.col - selectionStart.col);
    return da - db;
  });

  const word = ordered.map(({ row, col }) => grid[row][col]).join('');
  const wordRev = word.split('').reverse().join('');

  const match = Object.keys(placedWords).find(
    w => !foundWords.has(w) && (w === word || w === wordRev)
  );

  if (match) {
    clearHighlight();
    markWordFound(match);
    checkWin();
  } else {
    const missed = new Set(currentHighlight);
    clearHighlight();
    // Re-apply found state to any cells that were found (don't flash green cells red)
    flashMiss([...missed].filter(key => !foundCells.has(key)));
  }
}

/* ══════════════════════════════════════════════
   GAME FLOW
   ══════════════════════════════════════════════ */

function checkWin() {
  if (foundWords.size === Object.keys(placedWords).length) {
    setTimeout(showWinScreen, 350);
  }
}

function showWinScreen(scoreText = '') {
  stopTimer();
  const elapsed = Date.now() - startTime;
  winTimeEl.textContent = `Time: ${formatTime(elapsed)}`;
  winScoreEl.textContent = scoreText;
  winOverlay.classList.remove('hidden');
}

function startTimer() {
  startTime = Date.now();
  timerEl.textContent = '0:00';
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timerEl.textContent = formatTime(Date.now() - startTime);
  }, 1000);
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function newGame(category) {
  currentCategory = category;
  foundWords = new Set();
  foundCells = new Set();
  currentHighlight = new Set();
  isSelecting = false;

  const cat = WORD_BANK[category];
  categoryLabel.textContent = `${cat.emoji} ${cat.label}`;

  generateGrid(category);
  renderGrid();
  renderWordList();
  renderBackground(category);

  document.getElementById('win-heading').textContent = 'You found all the words!';
  winOverlay.classList.add('hidden');
  startTimer();
}

/* ══════════════════════════════════════════════
   CATEGORY MODAL
   ══════════════════════════════════════════════ */

function buildCategoryButtons() {
  categoryGridEl.innerHTML = '';
  for (const [key, cat] of Object.entries(WORD_BANK)) {
    const btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.innerHTML = `<span class="cat-emoji">${cat.emoji}</span><span>${cat.label}</span>`;
    btn.addEventListener('click', () => {
      closeCategoryModal();
      newGame(key);
    });
    categoryGridEl.appendChild(btn);
  }
}

function openCategoryModal() {
  categoryModal.classList.remove('hidden');
}

function closeCategoryModal() {
  categoryModal.classList.add('hidden');
}

/* ══════════════════════════════════════════════
   WIRING
   ══════════════════════════════════════════════ */

document.getElementById('btn-new').addEventListener('click', () => newGame(currentCategory));
document.getElementById('btn-category').addEventListener('click', openCategoryModal);
document.getElementById('btn-close-modal').addEventListener('click', closeCategoryModal);
document.getElementById('btn-play-again').addEventListener('click', () => {
  winOverlay.classList.add('hidden');
  if (activeGame === 'fractions')       fractionsNewGame();
  else if (activeGame === 'homophones') homophonesNewGame();
  else                                  newGame(currentCategory);
});

// Close modal on backdrop click
categoryModal.addEventListener('click', (e) => {
  if (e.target === categoryModal) closeCategoryModal();
});

/* ══════════════════════════════════════════════
   GAME HUB
   ══════════════════════════════════════════════ */

let activeGame = null; // null = on menu, 'wordsearch' | 'fractions'

const menuEl = document.getElementById('game-menu');
const gameWordSearchEl  = document.getElementById('game-wordsearch');
const gameFractionsEl   = document.getElementById('game-fractions');
const gameHomophonesEl  = document.getElementById('game-homophones');
const btnHomeEl         = document.getElementById('btn-home');

function showMenu() {
  stopTimer();
  winOverlay.classList.add('hidden');
  menuEl.classList.remove('hidden');
  gameWordSearchEl.classList.add('hidden');
  gameFractionsEl.classList.add('hidden');
  gameHomophonesEl.classList.add('hidden');
  btnHomeEl.classList.add('hidden');
  timerEl.classList.add('hidden');
  document.body.classList.remove('theme-dark');
  document.body.style.removeProperty('--color-bg');
  bgLayer.innerHTML = '';
  activeGame = null;
}

function switchToGame(gameKey) {
  menuEl.classList.add('hidden');
  btnHomeEl.classList.remove('hidden');
  timerEl.classList.remove('hidden');
  gameWordSearchEl.classList.toggle('hidden',  gameKey !== 'wordsearch');
  gameFractionsEl.classList.toggle('hidden',   gameKey !== 'fractions');
  gameHomophonesEl.classList.toggle('hidden',  gameKey !== 'homophones');
  activeGame = gameKey;
  if (gameKey === 'wordsearch')       newGame(currentCategory);
  else if (gameKey === 'homophones')  homophonesNewGame();
  else                                fractionsNewGame();
}

document.querySelectorAll('.game-pick-btn').forEach(btn => {
  btn.addEventListener('click', () => switchToGame(btn.dataset.game));
});

btnHomeEl.addEventListener('click', showMenu);

/* ══════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════ */

buildCategoryButtons();
showMenu();
