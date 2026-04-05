/* ────────────────────────────────────────────────
   Homophones — Game Engine
   Depends on globals from script.js:
     startTimer, stopTimer, showWinScreen, winOverlay
   ──────────────────────────────────────────────── */

const HOMOPHONE_ROUND_LENGTH = 10;

/* ══════════════════════════════════════════════
   WORD PAIR DATA
   Each entry: { answer, distractor, sentence }
   sentence uses ___ as the blank placeholder.
   ══════════════════════════════════════════════ */

const HOMOPHONE_PAIRS = [
  { answer: 'hear',    distractor: 'here',    sentence: 'Can you ___ the thunder outside?' },
  { answer: 'here',    distractor: 'hear',    sentence: 'Please come over ___ and sit down.' },
  { answer: 'write',   distractor: 'right',   sentence: 'Please ___ your name at the top of the page.' },
  { answer: 'right',   distractor: 'write',   sentence: 'Turn ___ at the corner by the fire station.' },
  { answer: 'buy',     distractor: 'by',      sentence: 'We need to ___ more apples at the store.' },
  { answer: 'by',      distractor: 'buy',     sentence: 'The book was written ___ a famous author.' },
  { answer: 'blew',    distractor: 'blue',    sentence: 'The strong wind ___ my hat right off my head.' },
  { answer: 'blue',    distractor: 'blew',    sentence: 'She wore a bright ___ jacket on the first day of school.' },
  { answer: 'brake',   distractor: 'break',   sentence: 'He pressed the ___ to slow the bicycle down the hill.' },
  { answer: 'break',   distractor: 'brake',   sentence: 'Be careful not to ___ the glass when you wash it.' },
  { answer: 'flour',   distractor: 'flower',  sentence: 'Add two cups of ___ to make the bread dough.' },
  { answer: 'flower',  distractor: 'flour',   sentence: 'She planted a red ___ in the garden near the porch.' },
  { answer: 'whole',   distractor: 'hole',    sentence: 'She ate the ___ sandwich in just three bites.' },
  { answer: 'hole',    distractor: 'whole',   sentence: 'The puppy dug a deep ___ in the backyard.' },
  { answer: 'meet',    distractor: 'meat',    sentence: "Let's ___ at the library after school today." },
  { answer: 'meat',    distractor: 'meet',    sentence: 'The sandwich had turkey ___ inside.' },
  { answer: 'knew',    distractor: 'new',     sentence: 'She ___ the answer before the teacher finished asking.' },
  { answer: 'new',     distractor: 'knew',    sentence: 'He got a ___ backpack for the start of the school year.' },
  { answer: 'won',     distractor: 'one',     sentence: 'Our team ___ the spelling bee championship!' },
  { answer: 'one',     distractor: 'won',     sentence: 'She has ___ older brother and two younger sisters.' },
  { answer: 'pear',    distractor: 'pair',    sentence: 'He ate a juicy ___ for his afternoon snack.' },
  { answer: 'pair',    distractor: 'pear',    sentence: 'She bought a new ___ of shoes for the hike.' },
  { answer: 'piece',   distractor: 'peace',   sentence: 'May I have a ___ of that apple pie?' },
  { answer: 'peace',   distractor: 'piece',   sentence: 'After the argument, the two friends made ___ with each other.' },
  { answer: 'plane',   distractor: 'plain',   sentence: 'The ___ landed smoothly on the runway after the long flight.' },
  { answer: 'plain',   distractor: 'plane',   sentence: 'She preferred a ___ cheese pizza with no extra toppings.' },
  { answer: 'rain',    distractor: 'reign',   sentence: "Don't forget your umbrella — it will ___ all afternoon." },
  { answer: 'road',    distractor: 'rode',    sentence: 'Be careful when crossing the busy ___ near the school.' },
  { answer: 'rode',    distractor: 'road',    sentence: 'She ___ her bicycle to the park every morning that summer.' },
  { answer: 'sale',    distractor: 'sail',    sentence: 'The bookstore is having a huge ___ this weekend.' },
  { answer: 'sail',    distractor: 'sale',    sentence: 'The boat began to ___ as the wind picked up speed.' },
  { answer: 'seen',    distractor: 'scene',   sentence: 'Have you ___ the new superhero movie yet?' },
  { answer: 'scene',   distractor: 'seen',    sentence: 'The last ___ of the play made the whole audience cheer.' },
  { answer: 'steel',   distractor: 'steal',   sentence: 'The bridge is built from thick, heavy ___ beams.' },
  { answer: 'steal',   distractor: 'steel',   sentence: 'It is wrong to ___ anything that does not belong to you.' },
  { answer: 'waist',   distractor: 'waste',   sentence: 'She tied a colorful belt around her ___.' },
  { answer: 'waste',   distractor: 'waist',   sentence: "Don't ___ your food — finish what is on your plate." },
  { answer: 'weak',    distractor: 'week',    sentence: 'After being sick for two days, he still felt tired and ___.' },
  { answer: 'week',    distractor: 'weak',    sentence: 'There are seven days in a ___.' },
  { answer: 'witch',   distractor: 'which',   sentence: 'The ___ in the story cast a spell on the entire village.' },
  { answer: 'which',   distractor: 'witch',   sentence: '___ book would you like to read first?' },
  { answer: 'wood',    distractor: 'would',   sentence: 'The old cabin was built from dark, rough ___.' },
  { answer: 'would',   distractor: 'wood',    sentence: 'She ___ love to visit the mountains during winter break.' },
  { answer: 'night',   distractor: 'knight',  sentence: 'Stars begin to appear in the sky late at ___.' },
  { answer: 'knight',  distractor: 'night',   sentence: 'The brave ___ in shining armor saved the kingdom.' },
  { answer: 'knot',    distractor: 'not',     sentence: 'The sailor tied a tight ___ in the rope so it would hold.' },
  { answer: 'son',     distractor: 'sun',     sentence: 'Her ___ just won first place in the science fair.' },
  { answer: 'sun',     distractor: 'son',     sentence: 'The ___ set slowly behind the mountains at the end of the day.' },
  { answer: 'deer',    distractor: 'dear',    sentence: 'A ___ leaped over the fence and vanished into the forest.' },
  { answer: 'sent',    distractor: 'cent',    sentence: 'She ___ a thank-you card to her grandmother in the mail.' },
  { answer: 'their',   distractor: 'there',   sentence: 'The students left ___ backpacks by the classroom door.' },
  { answer: 'there',   distractor: 'their',   sentence: 'Put the library books over ___ on the shelf.' },
  { answer: 'bear',    distractor: 'bare',    sentence: 'A grizzly ___ splashed through the river looking for fish.' },
  { answer: 'bare',    distractor: 'bear',    sentence: 'He walked across the warm sand in his ___ feet.' },
  { answer: 'tale',    distractor: 'tail',    sentence: 'Grandma told us a wonderful ___ about a brave young girl.' },
  { answer: 'tail',    distractor: 'tale',    sentence: 'The cat flicked its ___ back and forth while watching the bird.' },
];

/* ══════════════════════════════════════════════
   STATE
   ══════════════════════════════════════════════ */

let homoPairs    = [];
let homoIndex    = 0;
let homoScore    = 0;
let homoAnswered = false;

/* ══════════════════════════════════════════════
   ROUND GENERATION
   ══════════════════════════════════════════════ */

function generateHomoRound() {
  // Pick HOMOPHONE_ROUND_LENGTH distinct pairs at random
  const pool = [...HOMOPHONE_PAIRS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, HOMOPHONE_ROUND_LENGTH);
}

/* ══════════════════════════════════════════════
   DOM REFS
   ══════════════════════════════════════════════ */

const homoProgressEl = document.getElementById('homophones-progress');
const homoSentenceEl = document.getElementById('homophones-sentence');
const wordBtnA       = document.getElementById('word-btn-a');
const wordBtnB       = document.getElementById('word-btn-b');
const homoFeedbackEl = document.getElementById('homophones-feedback');

/* ══════════════════════════════════════════════
   RENDERING
   ══════════════════════════════════════════════ */

function renderSentence(sentence) {
  // Replace ___ with a styled blank element
  const parts = sentence.split('___');
  homoSentenceEl.innerHTML =
    parts[0] +
    '<span class="sentence-blank">_____</span>' +
    (parts[1] || '');
}

function renderHomoQuestion() {
  document.activeElement?.blur();
  const pair = homoPairs[homoIndex];

  renderSentence(pair.sentence);

  homoProgressEl.textContent = `Question ${homoIndex + 1} of ${HOMOPHONE_ROUND_LENGTH}`;

  // Randomly assign answer and distractor to the two buttons
  const swap = Math.random() < 0.5;
  wordBtnA.textContent = swap ? pair.distractor : pair.answer;
  wordBtnB.textContent = swap ? pair.answer     : pair.distractor;

  wordBtnA.disabled = false;
  wordBtnB.disabled = false;
  wordBtnA.className = 'word-btn';
  wordBtnB.className = 'word-btn';

  homoFeedbackEl.textContent = '';
  homoFeedbackEl.className = 'hidden';

  homoAnswered = false;
}

/* ══════════════════════════════════════════════
   INTERACTION
   ══════════════════════════════════════════════ */

function handleWordAnswer(chosenWord) {
  if (homoAnswered) return;
  homoAnswered = true;

  const pair    = homoPairs[homoIndex];
  const correct = chosenWord === pair.answer;
  if (correct) homoScore++;

  // Color buttons
  [wordBtnA, wordBtnB].forEach(btn => {
    btn.disabled = true;
    if (btn.textContent === pair.answer) {
      btn.classList.add('word-correct');
    } else if (btn.textContent === chosenWord && !correct) {
      btn.classList.add('word-wrong');
    }
  });

  // Fill the blank in the sentence with the correct word
  homoSentenceEl.innerHTML = homoPairs[homoIndex].sentence.replace(
    '___',
    `<span class="sentence-filled ${correct ? 'fill-correct' : 'fill-wrong'}">${pair.answer}</span>`
  );

  // Feedback bar
  if (correct) {
    homoFeedbackEl.textContent = 'Correct!';
    homoFeedbackEl.className = 'frac-feedback correct'; // reuse fractions styles
  } else {
    homoFeedbackEl.textContent = `The answer is "${pair.answer}"`;
    homoFeedbackEl.className = 'frac-feedback wrong';
  }

  setTimeout(() => {
    homoIndex++;
    if (homoIndex >= HOMOPHONE_ROUND_LENGTH) {
      document.getElementById('win-heading').textContent = 'Great job!';
      showWinScreen(`Score: ${homoScore} / ${HOMOPHONE_ROUND_LENGTH}`);
    } else {
      renderHomoQuestion();
    }
  }, 1400);
}

/* ══════════════════════════════════════════════
   GAME LIFECYCLE
   ══════════════════════════════════════════════ */

function homophonesNewGame() {
  homoPairs    = generateHomoRound();
  homoIndex    = 0;
  homoScore    = 0;
  homoAnswered = false;
  winOverlay.classList.add('hidden');
  document.getElementById('win-heading').textContent = 'Great job!';
  renderHomoQuestion();
  startTimer();
}

/* ══════════════════════════════════════════════
   WIRING
   ══════════════════════════════════════════════ */

wordBtnA.addEventListener('click', () => handleWordAnswer(wordBtnA.textContent));
wordBtnB.addEventListener('click', () => handleWordAnswer(wordBtnB.textContent));
