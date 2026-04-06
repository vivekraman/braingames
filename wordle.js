/* ────────────────────────────────────────────────
   Wordle (4-letter) — Game Engine
   ──────────────────────────────────────────────── */

const WORDLE_ROWS = 6;
const WORDLE_COLS = 4;
const FLIP_HALF = 150; // ms for each half of tile flip

/* ── Keyboard layout ── */
const KB_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['ENTER','Z','X','C','V','B','N','M','⌫']
];

/* ── State ── */
let wordleAnswer = '';
let wordleGuesses = [];       // submitted guesses
let wordleInput = '';         // current row input (0–4 chars)
let wordleGameOver = false;
let wordleKeyStates = {};     // letter → 'correct'|'present'|'absent'

/* ── DOM refs (cached after first newGame call) ── */
let wBoardEl, wResultEl, wKeyboardEl;

/* ══════════════════════════════════════════════
   RENDER
   ══════════════════════════════════════════════ */

function wordleRenderBoard() {
  wBoardEl.innerHTML = '';
  for (let r = 0; r < WORDLE_ROWS; r++) {
    const row = document.createElement('div');
    row.className = 'wordle-row';
    row.id = `wrow-${r}`;
    for (let c = 0; c < WORDLE_COLS; c++) {
      const tile = document.createElement('div');
      tile.className = 'wordle-tile';
      tile.id = `wtile-${r}-${c}`;
      row.appendChild(tile);
    }
    wBoardEl.appendChild(row);
  }
}

function wordleRenderKeyboard() {
  wKeyboardEl.innerHTML = '';
  for (const row of KB_ROWS) {
    const rowEl = document.createElement('div');
    rowEl.className = 'wordle-key-row';
    for (const key of row) {
      const btn = document.createElement('button');
      const isWide = key === 'ENTER' || key === '⌫';
      btn.className = 'wordle-key' + (isWide ? ' wide' : '');
      btn.textContent = key;
      btn.dataset.key = key;
      btn.addEventListener('click', () => wordleHandleKey(key));
      rowEl.appendChild(btn);
    }
    wKeyboardEl.appendChild(rowEl);
  }
}

function wTile(row, col) {
  return document.getElementById(`wtile-${row}-${col}`);
}

function wKeyEl(letter) {
  return wKeyboardEl ? wKeyboardEl.querySelector(`[data-key="${letter}"]`) : null;
}

/* ══════════════════════════════════════════════
   INPUT HANDLING
   ══════════════════════════════════════════════ */

function wordleHandleKey(key) {
  if (wordleGameOver) return;

  if (key === '⌫' || key === 'Backspace') {
    if (wordleInput.length > 0) {
      wordleInput = wordleInput.slice(0, -1);
      wordleUpdateRow();
    }
    return;
  }

  if (key === 'ENTER' || key === 'Enter') {
    wordleSubmit();
    return;
  }

  if (/^[A-Za-z]$/.test(key) && wordleInput.length < WORDLE_COLS) {
    wordleInput += key.toUpperCase();
    wordleUpdateRow();
    // Pop animation on the newly filled tile
    const tile = wTile(wordleGuesses.length, wordleInput.length - 1);
    if (tile) {
      tile.classList.remove('pop');
      void tile.offsetWidth; // reflow to restart animation
      tile.classList.add('pop');
    }
  }
}

function wordleUpdateRow() {
  const row = wordleGuesses.length;
  for (let c = 0; c < WORDLE_COLS; c++) {
    const tile = wTile(row, c);
    if (!tile) continue;
    const letter = wordleInput[c] || '';
    tile.textContent = letter;
    tile.classList.toggle('filled', letter !== '');
  }
}

/* ══════════════════════════════════════════════
   GUESS SCORING & REVEAL
   ══════════════════════════════════════════════ */

function wordleScore(guess, answer) {
  const result = Array(WORDLE_COLS).fill('absent');
  const remaining = answer.split('');

  // Pass 1: exact position matches
  for (let i = 0; i < WORDLE_COLS; i++) {
    if (guess[i] === answer[i]) {
      result[i] = 'correct';
      remaining[i] = null;
    }
  }
  // Pass 2: correct letter, wrong position
  for (let i = 0; i < WORDLE_COLS; i++) {
    if (result[i] === 'correct') continue;
    const j = remaining.indexOf(guess[i]);
    if (j !== -1) {
      result[i] = 'present';
      remaining[j] = null;
    }
  }
  return result;
}

function wordleRevealRow(row, scores, onComplete) {
  for (let c = 0; c < WORDLE_COLS; c++) {
    const tile = wTile(row, c);
    const delay = c * FLIP_HALF;

    // Fold down
    setTimeout(() => tile.classList.add('flip-in'), delay);

    // Swap color at the midpoint
    setTimeout(() => {
      tile.classList.remove('flip-in', 'filled', 'pop');
      tile.classList.add(scores[c], 'flip-out');
    }, delay + FLIP_HALF);

    // Remove animation class when done
    setTimeout(() => tile.classList.remove('flip-out'), delay + FLIP_HALF * 2);
  }

  const totalMs = (WORDLE_COLS - 1) * FLIP_HALF + FLIP_HALF * 2 + 50;
  setTimeout(onComplete, totalMs);
}

function wordleUpdateKeyStates(guess, scores) {
  const PRIORITY = { absent: 0, present: 1, correct: 2 };
  for (let i = 0; i < WORDLE_COLS; i++) {
    const letter = guess[i];
    const state = scores[i];
    const current = wordleKeyStates[letter];
    if (!current || PRIORITY[state] > PRIORITY[current]) {
      wordleKeyStates[letter] = state;
      const el = wKeyEl(letter);
      if (el) {
        el.classList.remove('correct', 'present', 'absent');
        el.classList.add(state);
      }
    }
  }
}

/* ══════════════════════════════════════════════
   SUBMIT
   ══════════════════════════════════════════════ */

function wordleSubmit() {
  if (wordleInput.length < WORDLE_COLS) return;

  if (!WORDLE_VALID.has(wordleInput)) {
    wordleShakeRow(wordleGuesses.length);
    wordleShowToast('Not in word list');
    return;
  }

  const guess = wordleInput;
  const scores = wordleScore(guess, wordleAnswer);
  const row = wordleGuesses.length;

  wordleGuesses.push(guess);
  wordleInput = '';

  wordleRevealRow(row, scores, () => {
    wordleUpdateKeyStates(guess, scores);

    if (scores.every(s => s === 'correct')) {
      wordleGameOver = true;
      wordleBounceRow(row, () => wordleShowResult(true));
    } else if (wordleGuesses.length >= WORDLE_ROWS) {
      wordleGameOver = true;
      setTimeout(() => wordleShowResult(false), 300);
    }
  });
}

/* ══════════════════════════════════════════════
   ANIMATIONS & FEEDBACK
   ══════════════════════════════════════════════ */

function wordleShakeRow(row) {
  const rowEl = document.getElementById(`wrow-${row}`);
  if (!rowEl) return;
  rowEl.classList.remove('shake');
  void rowEl.offsetWidth;
  rowEl.classList.add('shake');
  rowEl.addEventListener('animationend', () => rowEl.classList.remove('shake'), { once: true });
}

function wordleBounceRow(row, onComplete) {
  for (let c = 0; c < WORDLE_COLS; c++) {
    const tile = wTile(row, c);
    if (!tile) continue;
    tile.style.animationDelay = `${c * 100}ms`;
    tile.classList.add('bounce');
    tile.addEventListener('animationend', () => {
      tile.classList.remove('bounce');
      tile.style.animationDelay = '';
    }, { once: true });
  }
  setTimeout(onComplete, WORDLE_COLS * 100 + 500 + 200);
}

function wordleShowToast(msg) {
  let toast = document.getElementById('wordle-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'wordle-toast';
    wBoardEl.parentNode.insertBefore(toast, wResultEl);
  }
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.add('hidden'), 1400);
}

/* ══════════════════════════════════════════════
   WIN / LOSS
   ══════════════════════════════════════════════ */

function wordleShowResult(won) {
  stopTimer();
  const elapsed = Date.now() - startTime;
  const timeStr = formatTime(elapsed);

  if (won) {
    const n = wordleGuesses.length;
    wResultEl.innerHTML =
      `<span class="result-icon">🎉</span>`+
      `<strong>Got it in ${n}/6!</strong>`+
      `&nbsp;·&nbsp;${timeStr}`+
      `<button id="wordle-again">Play Again</button>`;
  } else {
    wResultEl.innerHTML =
      `<span class="result-icon">❌</span>`+
      `The word was <strong>${wordleAnswer}</strong>`+
      `<button id="wordle-again">Play Again</button>`;
  }

  wResultEl.className = won ? 'wordle-result win' : 'wordle-result loss';
  document.getElementById('wordle-again').addEventListener('click', wordleNewGame);
}

/* ══════════════════════════════════════════════
   GAME LIFECYCLE
   ══════════════════════════════════════════════ */

function wordleNewGame() {
  // Cache DOM refs on first call
  wBoardEl    = document.getElementById('wordle-board');
  wResultEl   = document.getElementById('wordle-result');
  wKeyboardEl = document.getElementById('wordle-keyboard');

  // Reset state
  const answers = window.WORDLE_ANSWERS;
  wordleAnswer   = answers[Math.floor(Math.random() * answers.length)];
  wordleGuesses  = [];
  wordleInput    = '';
  wordleGameOver = false;
  wordleKeyStates = {};

  // Render
  wordleRenderBoard();
  wordleRenderKeyboard();
  wResultEl.className = 'wordle-result hidden';
  wResultEl.innerHTML = '';

  const toast = document.getElementById('wordle-toast');
  if (toast) toast.classList.add('hidden');

  startTimer();
}

/* ── Physical keyboard support ── */
document.addEventListener('keydown', (e) => {
  if (activeGame !== 'wordle') return;
  // Ignore modifier combos
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  wordleHandleKey(e.key);
});
