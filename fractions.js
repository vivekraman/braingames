/* ────────────────────────────────────────────────
   Fractions Comparison — Game Engine
   Depends on globals from script.js:
     timerEl, startTimer, stopTimer, formatTime,
     showWinScreen, winOverlay
   ──────────────────────────────────────────────── */

const FRAC_DENOMINATORS = [2, 3, 4, 5, 6, 8, 10, 12];
const FRAC_ROUND_LENGTH = 10;

/* ══════════════════════════════════════════════
   FRACTION GENERATION
   ══════════════════════════════════════════════ */

function randomFraction() {
  const d = FRAC_DENOMINATORS[Math.floor(Math.random() * FRAC_DENOMINATORS.length)];
  const n = 1 + Math.floor(Math.random() * (d - 1)); // proper fraction: n < d
  return { n, d };
}

function makeEqualPair() {
  // Multiply a base fraction by 2, 3, or 4 to get an equivalent
  for (let tries = 0; tries < 20; tries++) {
    const f = randomFraction();
    const mult = 2 + Math.floor(Math.random() * 3); // 2, 3, or 4
    if (f.d * mult <= 12) {
      // Randomly assign which side gets the multiplied form
      const swap = Math.random() < 0.5;
      return {
        left:   swap ? { n: f.n * mult, d: f.d * mult } : { n: f.n, d: f.d },
        right:  swap ? { n: f.n, d: f.d } : { n: f.n * mult, d: f.d * mult },
        answer: 'eq'
      };
    }
  }
  // Fallback: use 1/2 vs 2/4
  return {
    left:  { n: 1, d: 2 },
    right: { n: 2, d: 4 },
    answer: 'eq'
  };
}

function makeUnequalPair(wantAnswer) {
  // wantAnswer: 'lt' (left < right) or 'gt' (left > right)
  for (let tries = 0; tries < 50; tries++) {
    const left  = randomFraction();
    const right = randomFraction();
    // Compare via cross-multiplication
    const leftVal  = left.n  * right.d;
    const rightVal = right.n * left.d;
    if (leftVal === rightVal) continue; // accidentally equal, try again
    const actual = leftVal < rightVal ? 'lt' : 'gt';
    if (actual === wantAnswer) return { left, right, answer: wantAnswer };
  }
  // Hardcoded fallback
  if (wantAnswer === 'lt') return { left: { n: 1, d: 3 }, right: { n: 2, d: 3 }, answer: 'lt' };
  return { left: { n: 3, d: 4 }, right: { n: 1, d: 4 }, answer: 'gt' };
}

function generateRound() {
  // Forced balanced distribution then shuffle
  const eqCount = 3;
  const ltCount = 4;
  const gtCount = 3;

  const pairs = [];
  for (let i = 0; i < eqCount; i++) pairs.push(makeEqualPair());
  for (let i = 0; i < ltCount; i++) pairs.push(makeUnequalPair('lt'));
  for (let i = 0; i < gtCount; i++) pairs.push(makeUnequalPair('gt'));

  // Fisher-Yates shuffle
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  return pairs;
}

/* ══════════════════════════════════════════════
   STATE
   ══════════════════════════════════════════════ */

let fracPairs = [];
let fracIndex = 0;
let fracScore = 0;
let fracAnswered = false;

/* ══════════════════════════════════════════════
   RENDERING
   ══════════════════════════════════════════════ */

function renderFraction(container, frac) {
  container.innerHTML =
    `<span class="frac-numerator">${frac.n}</span>` +
    `<span class="frac-bar"></span>` +
    `<span class="frac-denominator">${frac.d}</span>`;
}

function renderQuestion() {
  document.activeElement?.blur();
  const pair = fracPairs[fracIndex];

  renderFraction(document.getElementById('fraction-left'),  pair.left);
  renderFraction(document.getElementById('fraction-right'), pair.right);

  const resultEl = document.getElementById('fraction-compare-result');
  resultEl.textContent = '?';
  resultEl.className = 'compare-result';

  const feedbackEl = document.getElementById('fractions-feedback');
  feedbackEl.textContent = '';
  feedbackEl.className = 'hidden';

  document.getElementById('fractions-progress').textContent =
    `Question ${fracIndex + 1} of ${FRAC_ROUND_LENGTH}`;

  document.querySelectorAll('.cmp-btn').forEach(btn => {
    btn.disabled = false;
    btn.className = 'cmp-btn';
  });

  fracAnswered = false;
}

/* ══════════════════════════════════════════════
   INTERACTION
   ══════════════════════════════════════════════ */

function handleAnswer(chosen) {
  if (fracAnswered) return;
  fracAnswered = true;

  const pair = fracPairs[fracIndex];
  const correct = chosen === pair.answer;
  if (correct) fracScore++;

  const symbolMap = { lt: '<', eq: '=', gt: '>' };

  // Color the buttons
  document.querySelectorAll('.cmp-btn').forEach(btn => {
    btn.disabled = true;
    if (btn.dataset.answer === pair.answer) {
      btn.classList.add('cmp-correct');
    } else if (btn.dataset.answer === chosen && !correct) {
      btn.classList.add('cmp-wrong');
    }
  });

  // Show correct symbol between fractions
  const resultEl = document.getElementById('fraction-compare-result');
  resultEl.textContent = symbolMap[pair.answer];
  resultEl.className = 'compare-result ' + (correct ? 'result-correct' : 'result-wrong');

  // Feedback message
  const feedbackEl = document.getElementById('fractions-feedback');
  if (correct) {
    feedbackEl.textContent = 'Correct!';
    feedbackEl.className = 'frac-feedback correct';
  } else {
    feedbackEl.textContent = `The answer is  ${symbolMap[pair.answer]}`;
    feedbackEl.className = 'frac-feedback wrong';
  }

  // Advance after short delay
  setTimeout(() => {
    fracIndex++;
    if (fracIndex >= FRAC_ROUND_LENGTH) {
      document.getElementById('win-heading').textContent = 'Nice work!';
      showWinScreen(`Score: ${fracScore} / ${FRAC_ROUND_LENGTH}`);
    } else {
      renderQuestion();
    }
  }, 1400);
}

/* ══════════════════════════════════════════════
   GAME LIFECYCLE
   ══════════════════════════════════════════════ */

function fractionsNewGame() {
  fracPairs    = generateRound();
  fracIndex    = 0;
  fracScore    = 0;
  fracAnswered = false;
  winOverlay.classList.add('hidden');
  document.getElementById('win-heading').textContent = 'Nice work!';
  renderQuestion();
  startTimer();
}

/* ══════════════════════════════════════════════
   WIRING
   ══════════════════════════════════════════════ */

document.querySelectorAll('.cmp-btn').forEach(btn => {
  btn.addEventListener('click', () => handleAnswer(btn.dataset.answer));
});
