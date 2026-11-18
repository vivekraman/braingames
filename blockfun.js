/* ────────────────────────────────────────────────
   Block Fun — Game Engine
   Drag pieces onto the board; full rows/columns clear.
   ──────────────────────────────────────────────── */

// Board dimension. Everything (CSS sizing, line checks, save format) derives
// from this, so changing it (e.g. to 10) is the only edit needed.
const BF_SIZE = 8;
const BF_TRAY_SIZE = 3;
const BF_STORAGE_KEY = 'braingames_blockfun';
const BF_BEST_KEY = 'braingames_blockfun_best';

const BF_COLORS = [
  '#ef5350', // red
  '#ffa726', // orange
  '#fdd835', // yellow
  '#66bb6a', // green
  '#42a5f5', // blue
  '#7e57c2', // purple
  '#ec407a', // pink
  '#26c6da', // cyan
];

// Base shapes drawn as ASCII art ('#' = block). All rotations are generated
// automatically; mirror images that can't be reached by rotation (J, Z) are
// listed explicitly. Weight controls how often a shape is dealt.
const BF_BASE_SHAPES = [
  { art: ['#'],                       weight: 2   }, // single
  { art: ['##'],                      weight: 3   }, // line 2
  { art: ['###'],                     weight: 3   }, // line 3
  { art: ['####'],                    weight: 2   }, // line 4
  { art: ['#####'],                   weight: 1   }, // line 5
  { art: ['##', '##'],                weight: 3   }, // square 2×2
  { art: ['###', '###', '###'],       weight: 1   }, // square 3×3
  { art: ['#.', '##'],                weight: 3   }, // small corner
  { art: ['#.', '#.', '##'],          weight: 2   }, // L
  { art: ['.#', '.#', '##'],          weight: 2   }, // J
  { art: ['#..', '#..', '###'],       weight: 1   }, // big corner
  { art: ['###', '.#.'],              weight: 2   }, // T
  { art: ['.##', '##.'],              weight: 1.5 }, // S
  { art: ['##.', '.##'],              weight: 1.5 }, // Z
];

/* ── Shape helpers ── */

function bfParseArt(art) {
  const cells = [];
  art.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === '#') cells.push([r, c]); }));
  return cells;
}

function bfNormalize(cells) {
  const minR = Math.min(...cells.map(([r]) => r));
  const minC = Math.min(...cells.map(([, c]) => c));
  return cells
    .map(([r, c]) => [r - minR, c - minC])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

function bfRotate(cells) {
  return bfNormalize(cells.map(([r, c]) => [c, -r]));
}

function bfOrientations(cells) {
  const seen = new Set();
  const out = [];
  let cur = bfNormalize(cells);
  for (let i = 0; i < 4; i++) {
    const key = JSON.stringify(cur);
    if (!seen.has(key)) { seen.add(key); out.push(cur); }
    cur = bfRotate(cur);
  }
  return out;
}

const BF_SHAPES = BF_BASE_SHAPES.map(s => ({
  weight: s.weight,
  orientations: bfOrientations(bfParseArt(s.art)),
}));
const BF_TOTAL_WEIGHT = BF_SHAPES.reduce((sum, s) => sum + s.weight, 0);

function bfRandomPiece() {
  let roll = Math.random() * BF_TOTAL_WEIGHT;
  let shape = BF_SHAPES[BF_SHAPES.length - 1];
  for (const s of BF_SHAPES) {
    roll -= s.weight;
    if (roll < 0) { shape = s; break; }
  }
  const cells = shape.orientations[Math.floor(Math.random() * shape.orientations.length)];
  return { cells, color: Math.floor(Math.random() * BF_COLORS.length) };
}

/* ── State ── */
let bfBoard = [];        // bfBoard[r][c] = color index, or -1 if empty
let bfTray = [];         // BF_TRAY_SIZE entries: piece or null (already used)
let bfScore = 0;
let bfBest = 0;
let bfStreak = 0;        // consecutive placements that cleared at least one line
let bfGameOver = false;
let bfNewBest = false;   // this game has beaten the previous best score
let bfDrag = null;       // active drag info

/* ── DOM refs ── */
const bfBoardEl  = document.getElementById('blockfun-board');
const bfTrayEl   = document.getElementById('blockfun-tray');
const bfScoreEl  = document.getElementById('blockfun-score');
const bfBestEl   = document.getElementById('blockfun-best');
const bfPopupEl  = document.getElementById('blockfun-popup');
const bfResultEl = document.getElementById('blockfun-result');

document.documentElement.style.setProperty('--bf-size', BF_SIZE);

/* ══════════════════════════════════════════════
   BOARD LOGIC
   ══════════════════════════════════════════════ */

function bfEmptyBoard() {
  return Array.from({ length: BF_SIZE }, () => Array(BF_SIZE).fill(-1));
}

function bfCanPlace(board, cells, row, col) {
  return cells.every(([dr, dc]) => {
    const r = row + dr, c = col + dc;
    return r >= 0 && r < BF_SIZE && c >= 0 && c < BF_SIZE && board[r][c] === -1;
  });
}

function bfFitsAnywhere(board, cells) {
  for (let r = 0; r < BF_SIZE; r++)
    for (let c = 0; c < BF_SIZE; c++)
      if (bfCanPlace(board, cells, r, c)) return true;
  return false;
}

function bfFullLines(board) {
  const rows = [], cols = [];
  for (let i = 0; i < BF_SIZE; i++) {
    if (board[i].every(v => v !== -1)) rows.push(i);
    if (board.every(row => row[i] !== -1)) cols.push(i);
  }
  return { rows, cols };
}

// Set of "r,c" keys for every cell in the given full rows/cols
function bfLineCells({ rows, cols }) {
  const keys = new Set();
  for (const r of rows) for (let c = 0; c < BF_SIZE; c++) keys.add(`${r},${c}`);
  for (const c of cols) for (let r = 0; r < BF_SIZE; r++) keys.add(`${r},${c}`);
  return keys;
}

function bfRefillTray() {
  // Deal a fresh set, preferring one where at least one piece can be placed.
  let set;
  for (let attempt = 0; attempt < 30; attempt++) {
    set = Array.from({ length: BF_TRAY_SIZE }, bfRandomPiece);
    if (set.some(p => bfFitsAnywhere(bfBoard, p.cells))) break;
  }
  bfTray = set;
}

function bfHasMove() {
  return bfTray.some(p => p && bfFitsAnywhere(bfBoard, p.cells));
}

/* ══════════════════════════════════════════════
   RENDER
   ══════════════════════════════════════════════ */

// preview: { cells: Set<"r,c">, color, clear: Set<"r,c"> } | null
// cleared: Map<"r,c", colorIndex> of cells that were just cleared (animated)
function bfRenderBoard(preview = null, cleared = null) {
  bfBoardEl.innerHTML = '';
  for (let r = 0; r < BF_SIZE; r++) {
    for (let c = 0; c < BF_SIZE; c++) {
      const key = `${r},${c}`;
      const cell = document.createElement('div');
      cell.className = 'bf-cell';
      const v = bfBoard[r][c];
      if (v !== -1) {
        cell.classList.add('filled');
        cell.style.setProperty('--c', BF_COLORS[v]);
      } else if (preview && preview.cells.has(key)) {
        cell.classList.add('preview');
        cell.style.setProperty('--c', BF_COLORS[preview.color]);
      }
      if (preview && preview.clear.has(key)) {
        cell.classList.add('will-clear');
        cell.style.setProperty('--c', BF_COLORS[preview.color]);
      }
      if (cleared && cleared.has(key)) {
        const burst = document.createElement('div');
        burst.className = 'bf-burst';
        burst.style.setProperty('--c', BF_COLORS[cleared.get(key)]);
        burst.style.animationDelay = `${(r + c) * 15}ms`;
        cell.appendChild(burst);
      }
      bfBoardEl.appendChild(cell);
    }
  }
}

function bfBuildPieceEl(piece, className) {
  const el = document.createElement('div');
  el.className = className;
  const h = Math.max(...piece.cells.map(([r]) => r)) + 1;
  const w = Math.max(...piece.cells.map(([, c]) => c)) + 1;
  el.style.gridTemplateRows = `repeat(${h}, var(--cell))`;
  el.style.gridTemplateColumns = `repeat(${w}, var(--cell))`;
  for (const [r, c] of piece.cells) {
    const b = document.createElement('div');
    b.className = 'bf-block';
    b.style.gridRow = r + 1;
    b.style.gridColumn = c + 1;
    b.style.setProperty('--c', BF_COLORS[piece.color]);
    el.appendChild(b);
  }
  return el;
}

function bfRenderTray() {
  bfTrayEl.innerHTML = '';
  bfTray.forEach((piece, i) => {
    const slot = document.createElement('div');
    slot.className = 'bf-slot';
    slot.dataset.slot = i;
    if (piece) {
      const pieceEl = bfBuildPieceEl(piece, 'bf-piece');
      if (!bfFitsAnywhere(bfBoard, piece.cells)) slot.classList.add('no-fit');
      slot.appendChild(pieceEl);
    }
    bfTrayEl.appendChild(slot);
  });
}

function bfRenderScore() {
  bfScoreEl.textContent = bfScore;
  bfBestEl.textContent = bfBest;
}

function bfShowPopup(text) {
  bfPopupEl.textContent = text;
  bfPopupEl.classList.remove('show');
  void bfPopupEl.offsetWidth; // restart animation
  bfPopupEl.classList.add('show');
}

function bfShowResult() {
  bfResultEl.innerHTML =
    `<div class="bf-result-box">` +
      `<div class="bf-result-title">No more moves!</div>` +
      `<div class="bf-result-score">${bfScore}</div>` +
      `<div class="bf-result-best">${bfNewBest ? '🏆 New best score!' : `Best: ${bfBest}`}</div>` +
      `<button id="blockfun-again">Play Again</button>` +
    `</div>`;
  bfResultEl.classList.remove('hidden');
  document.getElementById('blockfun-again').addEventListener('click', bfStartNewGame);
}

/* ══════════════════════════════════════════════
   MOVES
   ══════════════════════════════════════════════ */

function bfPlace(slot, row, col) {
  const piece = bfTray[slot];
  for (const [dr, dc] of piece.cells) bfBoard[row + dr][col + dc] = piece.color;
  bfTray[slot] = null;

  const lines = bfFullLines(bfBoard);
  const cleared = new Map();
  for (const key of bfLineCells(lines)) {
    const [r, c] = key.split(',').map(Number);
    cleared.set(key, bfBoard[r][c]);
  }
  for (const key of cleared.keys()) {
    const [r, c] = key.split(',').map(Number);
    bfBoard[r][c] = -1;
  }

  // Scoring: 1 point per block placed. Clearing n lines at once earns
  // 10 × (1 + 2 + … + n), multiplied by the current combo streak.
  let points = piece.cells.length;
  const n = lines.rows.length + lines.cols.length;
  if (n > 0) {
    bfStreak++;
    const bonus = 10 * (n * (n + 1) / 2) * bfStreak;
    points += bonus;
    let msg = `+${points}`;
    if (n > 1) msg = `${n} lines! ${msg}`;
    if (bfStreak > 1) msg += ` · Combo ×${bfStreak}`;
    bfShowPopup(msg);
  } else {
    bfStreak = 0;
  }
  bfScore += points;
  if (bfScore > bfBest) {
    bfBest = bfScore;
    bfNewBest = true;
    localStorage.setItem(BF_BEST_KEY, String(bfBest));
  }

  if (bfTray.every(p => !p)) bfRefillTray();

  bfRenderBoard(null, cleared);
  bfRenderTray();
  bfRenderScore();

  if (!bfHasMove()) {
    bfGameOver = true;
    stopTimer();
    // Let the clear animation and last placement register before the overlay
    setTimeout(() => { if (bfGameOver) bfShowResult(); }, 600);
  }
  bfSaveState();
}

/* ══════════════════════════════════════════════
   DRAG & DROP
   ══════════════════════════════════════════════ */

// Returns the board cell under the ghost's top-left block, or null.
function bfDropTarget() {
  const cells = bfBoardEl.children;
  const first = cells[0].getBoundingClientRect();
  const pitch = cells[1].getBoundingClientRect().left - first.left; // cell + gap
  const g = bfDrag.ghost.getBoundingClientRect();
  const col = Math.round((g.left - first.left) / pitch);
  const row = Math.round((g.top - first.top) / pitch);
  const cellsOf = bfTray[bfDrag.slot].cells;
  return bfCanPlace(bfBoard, cellsOf, row, col) ? { row, col } : null;
}

function bfUpdatePreview() {
  const target = bfDropTarget();
  const prev = bfDrag.target;
  if (target?.row === prev?.row && target?.col === prev?.col) return;
  bfDrag.target = target;

  if (!target) { bfRenderBoard(); return; }

  const piece = bfTray[bfDrag.slot];
  const cells = new Set(piece.cells.map(([dr, dc]) => `${target.row + dr},${target.col + dc}`));
  // Simulate the placement to highlight lines that would clear
  const sim = bfBoard.map(row => row.slice());
  for (const [dr, dc] of piece.cells) sim[target.row + dr][target.col + dc] = piece.color;
  const clear = bfLineCells(bfFullLines(sim));
  bfRenderBoard({ cells, color: piece.color, clear });
}

function bfMoveGhost(x, y) {
  bfDrag.ghost.style.left = `${x - bfDrag.offX}px`;
  bfDrag.ghost.style.top  = `${y - bfDrag.offY}px`;
  bfUpdatePreview();
}

function bfEndDrag(drop) {
  if (!bfDrag) return;
  const { slot, ghost, slotEl, target } = bfDrag;
  bfDrag = null;
  ghost.remove();
  slotEl.classList.remove('dragging');
  if (drop && target) bfPlace(slot, target.row, target.col);
  else bfRenderBoard();
}

bfTrayEl.addEventListener('pointerdown', (e) => {
  if (bfGameOver || bfDrag || activeGame !== 'blockfun') return;
  const slotEl = e.target.closest('.bf-slot');
  if (!slotEl) return;
  const slot = Number(slotEl.dataset.slot);
  const piece = bfTray[slot];
  if (!piece) return;
  e.preventDefault();

  const ghost = bfBuildPieceEl(piece, 'bf-piece bf-ghost');
  document.body.appendChild(ghost);
  const w = ghost.offsetWidth, h = ghost.offsetHeight;
  // On touch, hold the piece above the finger so it stays visible
  const offY = e.pointerType === 'mouse' ? h / 2 : h + 30;

  bfDrag = { slot, slotEl, ghost, offX: w / 2, offY, target: null, pointerId: e.pointerId };
  slotEl.classList.add('dragging');
  slotEl.setPointerCapture(e.pointerId);
  bfMoveGhost(e.clientX, e.clientY);
});

bfTrayEl.addEventListener('pointermove', (e) => {
  if (!bfDrag || e.pointerId !== bfDrag.pointerId) return;
  e.preventDefault();
  bfMoveGhost(e.clientX, e.clientY);
});

bfTrayEl.addEventListener('pointerup', (e) => {
  if (!bfDrag || e.pointerId !== bfDrag.pointerId) return;
  bfEndDrag(true);
});

bfTrayEl.addEventListener('pointercancel', () => bfEndDrag(false));
bfTrayEl.addEventListener('lostpointercapture', () => bfEndDrag(false));

/* ══════════════════════════════════════════════
   STATE PERSISTENCE
   ══════════════════════════════════════════════ */

function bfSaveState() {
  localStorage.setItem(BF_STORAGE_KEY, JSON.stringify({
    size: BF_SIZE,
    board: bfBoard,
    tray: bfTray,
    score: bfScore,
    streak: bfStreak,
    gameOver: bfGameOver,
    newBest: bfNewBest,
  }));
}

function bfLoadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(BF_STORAGE_KEY));
    // Discard saves from a different board size
    if (!saved || saved.size !== BF_SIZE || !Array.isArray(saved.board)) return null;
    return saved;
  } catch { return null; }
}

/* ══════════════════════════════════════════════
   GAME LIFECYCLE
   ══════════════════════════════════════════════ */

function bfNewGame() {
  bfBest = Number(localStorage.getItem(BF_BEST_KEY)) || 0;
  const saved = bfLoadState();
  if (!saved) { bfStartNewGame(); return; }

  bfBoard    = saved.board;
  bfTray     = saved.tray;
  bfScore    = saved.score || 0;
  bfStreak   = saved.streak || 0;
  bfGameOver = !!saved.gameOver;
  bfNewBest  = !!saved.newBest;

  bfResultEl.classList.add('hidden');
  bfRenderBoard();
  bfRenderTray();
  bfRenderScore();
  if (bfGameOver) bfShowResult();
}

function bfStartNewGame() {
  bfEndDrag(false);
  bfBoard    = bfEmptyBoard();
  bfScore    = 0;
  bfStreak   = 0;
  bfGameOver = false;
  bfNewBest  = false;
  bfRefillTray();

  bfResultEl.classList.add('hidden');
  bfResultEl.innerHTML = '';
  bfRenderBoard();
  bfRenderTray();
  bfRenderScore();
  bfSaveState();
}

document.getElementById('btn-blockfun-new').addEventListener('click', () => {
  if (!bfGameOver && bfScore > 0 &&
      !confirm('Start a new game? Your current progress will be lost.')) return;
  bfStartNewGame();
});
