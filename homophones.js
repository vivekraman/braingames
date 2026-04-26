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

  // ── Harder pairs ──
  { answer: 'altar',      distractor: 'alter',      sentence: 'The bride walked slowly toward the ___ at the front of the church.' },
  { answer: 'alter',      distractor: 'altar',      sentence: 'The tailor had to ___ the jacket because it was too large.' },
  { answer: 'cereal',     distractor: 'serial',     sentence: 'She poured a bowl of ___ and added fresh blueberries on top.' },
  { answer: 'serial',     distractor: 'cereal',     sentence: 'Each episode of the ___ drama ended on a tense cliffhanger.' },
  { answer: 'chord',      distractor: 'cord',       sentence: 'The pianist played a rich opening ___ that filled the concert hall.' },
  { answer: 'cord',       distractor: 'chord',      sentence: 'He tied the parcel tightly with a piece of rough brown ___.' },
  { answer: 'cite',       distractor: 'site',       sentence: 'The judge asked the lawyer to ___ the exact law she was referencing.' },
  { answer: 'site',       distractor: 'cite',       sentence: 'The ancient ruins are an important archaeological ___.' },
  { answer: 'coarse',     distractor: 'course',     sentence: 'The sculptor used ___ sandpaper to smooth the rough edges of the wood.' },
  { answer: 'course',     distractor: 'coarse',     sentence: 'She enrolled in an advanced astronomy ___ at the university.' },
  { answer: 'complement', distractor: 'compliment', sentence: 'A squeeze of lemon was the perfect ___ to the grilled salmon.' },
  { answer: 'compliment', distractor: 'complement', sentence: 'He paid her a sincere ___ on the quality of her presentation.' },
  { answer: 'council',    distractor: 'counsel',    sentence: 'The city ___ voted unanimously to approve the new park downtown.' },
  { answer: 'counsel',    distractor: 'council',    sentence: 'Her lawyer offered wise ___ before the hearing began.' },
  { answer: 'flea',       distractor: 'flee',       sentence: 'The dog kept scratching because of a stubborn ___ bite on its back.' },
  { answer: 'flee',       distractor: 'flea',       sentence: 'The frightened deer began to ___ through the forest at full speed.' },
  { answer: 'groan',      distractor: 'grown',      sentence: 'The audience let out a long ___ at the terrible pun.' },
  { answer: 'grown',      distractor: 'groan',      sentence: 'The oak tree had ___ so tall that its branches touched the roof.' },
  { answer: 'hoarse',     distractor: 'horse',      sentence: 'After hours of cheering, her voice became raspy and ___.' },
  { answer: 'horse',      distractor: 'hoarse',     sentence: 'The cowboy saddled his ___ and galloped across the open plain.' },
  { answer: 'idol',       distractor: 'idle',       sentence: 'The ancient temple housed a golden ___ that the villagers worshipped.' },
  { answer: 'idle',       distractor: 'idol',       sentence: 'The factory machines sat ___ during the long power outage.' },
  { answer: 'lessen',     distractor: 'lesson',     sentence: 'Taking slow, deep breaths can help ___ feelings of anxiety.' },
  { answer: 'lesson',     distractor: 'lessen',     sentence: 'The piano ___ lasted exactly forty-five minutes each week.' },
  { answer: 'medal',      distractor: 'meddle',     sentence: 'The gymnast proudly wore her gold ___ around her neck at the ceremony.' },
  { answer: 'meddle',     distractor: 'medal',      sentence: 'He tended to ___ in other people\'s business without being asked.' },
  { answer: 'miner',      distractor: 'minor',      sentence: 'The coal ___ emerged from the shaft covered in black dust.' },
  { answer: 'minor',      distractor: 'miner',      sentence: 'The spelling mistake was a ___ error that was simple to fix.' },
  { answer: 'passed',     distractor: 'past',       sentence: 'The racing car ___ all the others on the final lap to win.' },
  { answer: 'past',       distractor: 'passed',     sentence: 'In the ___, people relied on oil lamps to light their homes at night.' },
  { answer: 'patience',   distractor: 'patients',   sentence: 'Learning a new instrument requires a great deal of ___.' },
  { answer: 'patients',   distractor: 'patience',   sentence: 'The nurse brought evening meals to all the ___ in the ward.' },
  { answer: 'pause',      distractor: 'paws',       sentence: 'There was a long ___ before the judge announced the winner.' },
  { answer: 'paws',       distractor: 'pause',      sentence: 'The bear stood on its hind legs and waved its ___ in the air.' },
  { answer: 'pedal',      distractor: 'peddle',     sentence: 'She pressed the brake ___ firmly as the traffic light turned red.' },
  { answer: 'peddle',     distractor: 'pedal',      sentence: 'The merchant tried to ___ his handmade goods at every market in town.' },
  { answer: 'pray',       distractor: 'prey',       sentence: 'The congregation gathered to ___ together before the evening meal.' },
  { answer: 'prey',       distractor: 'pray',       sentence: 'The hawk swooped down silently on its unsuspecting ___.' },
  { answer: 'principal',  distractor: 'principle',  sentence: 'The school ___ announced that Friday would be a half day.' },
  { answer: 'principle',  distractor: 'principal',  sentence: 'She refused to cheat because honesty was a core ___ she lived by.' },
  { answer: 'soar',       distractor: 'sore',       sentence: 'The glider began to ___ silently on the warm rising air currents.' },
  { answer: 'sore',       distractor: 'soar',       sentence: 'His legs were stiff and ___ the morning after the long hike.' },
  { answer: 'sole',       distractor: 'soul',       sentence: 'The worn ___ of her boot finally split after the mountain trek.' },
  { answer: 'soul',       distractor: 'sole',       sentence: 'The old blues singer poured his heart and ___ into every song he played.' },
  { answer: 'stationary', distractor: 'stationery', sentence: 'The bus remained ___ for ten minutes while the engine cooled down.' },
  { answer: 'stationery', distractor: 'stationary', sentence: 'She chose elegant floral ___ to write her thank-you notes on.' },
  { answer: 'taut',       distractor: 'taught',     sentence: 'The tightrope walker made sure the wire was perfectly ___ before crossing.' },
  { answer: 'taught',     distractor: 'taut',       sentence: 'Mrs. Rivera ___ us how to solve equations in maths last term.' },
  { answer: 'throne',     distractor: 'thrown',     sentence: 'The queen sat on her jewelled ___ and addressed the royal court.' },
  { answer: 'thrown',     distractor: 'throne',     sentence: 'The jockey was ___ from the horse when it stumbled on the bend.' },
  { answer: 'vain',       distractor: 'vein',       sentence: 'It was ___ to keep arguing — no one was going to change their mind.' },
  { answer: 'vein',       distractor: 'vain',       sentence: 'The nurse carefully located the ___ before inserting the needle.' },
  { answer: 'wade',       distractor: 'weighed',    sentence: 'They had to ___ through shallow water to reach the small island.' },
  { answer: 'weighed',    distractor: 'wade',       sentence: 'The shopkeeper ___ the fruit carefully before announcing the price.' },
  { answer: 'wail',       distractor: 'whale',      sentence: 'The toddler began to ___ when her ice cream fell off the cone.' },
  { answer: 'whale',      distractor: 'wail',       sentence: 'The enormous blue ___ surfaced slowly beside the research vessel.' },
  { answer: 'stair',      distractor: 'stare',      sentence: 'She sat on the bottom ___ and pulled on her boots before heading out.' },
  { answer: 'stare',      distractor: 'stair',      sentence: 'It is considered rude to ___ at strangers in public.' },
  { answer: 'rap',        distractor: 'wrap',       sentence: 'There was a sharp ___ at the door just before midnight.' },
  { answer: 'wrap',       distractor: 'rap',        sentence: 'She used colourful paper to ___ each gift before the party.' },
  { answer: 'feat',       distractor: 'feet',       sentence: 'Climbing that sheer cliff face was an incredible athletic ___.' },
  { answer: 'feet',       distractor: 'feat',       sentence: 'The swimming pool is exactly fifty ___ from one end to the other.' },
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
