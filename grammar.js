/* ────────────────────────────────────────────────
   Grammar Fix-It — Game Engine
   Depends on globals from script.js:
     startTimer, stopTimer, showWinScreen, winOverlay
   ──────────────────────────────────────────────── */

/* ══════════════════════════════════════════════
   LETTER DATA
   Wrap a word in *word* to mark it as a mistake, or
   *wrong:correct* to also record the fix (shown as a
   small hint once the player finds it). Markers must
   be a single whitespace-free token — any trailing
   punctuation goes outside the stars, e.g.
   "*recieved:received* it". If the correction has
   multiple words, join them with an underscore, e.g.
   "*alot:a_lot*".
   ══════════════════════════════════════════════ */

const GRAMMAR_LETTERS = [
  {
    paragraphs: [
      "Dear Grandma,",
      "Thank you so much for the birthday present. I *recieved:received* it on Saturday and I was so happy! The sweater is my *favorit:favorite* color and it fits great.",
      "Me and my brother *goed:went* to the park to celebrate. There *was:were* so many kids there that we had to wait for a turn on the swings. I *seen:saw* my friend Jake and we played tag.",
      "I don't have *no:any* other sweater as warm as this one, so I will wear it *alot:a_lot* this winter.",
      "Thank you again for the wonderful gift. I can't wait to see you at *there:their* house next month.",
      "Love,",
      "Emma"
    ]
  },
  {
    paragraphs: [
      "Dear Coach Reyes,",
      "I am writing to say I am sorry for *missin:missing* practice on Tuesday. I should *of:have* told you sooner that I was sick.",
      "My mom said I had a *feever:fever* and could not go to school, so I stayed in bed all day.",
      "I *no:know* the team has a big game this weekend, and I promise I will be *their:there* early to warm up.",
      "Me and my teammates *was:were* excited for the tournament before I got sick. I hope to feel *gooder:better* soon so I can help the team win.",
      "Sincerely,",
      "Marcus"
    ]
  },
  {
    paragraphs: [
      "Dear Sophie,",
      "Guess what? I *finaly:finally* went to summer camp last week! It was the most *funnest:fun* week of my whole life.",
      "On the first day, we *swimmed:swam* in the lake and I *catched:caught* a huge fish with my bare hands!",
      "There were *alot:a_lot* of kids from *diffrent:different* states. My favorite camper was a girl who *don't:doesn't* like bugs at all, just like me!",
      "I hope you can come with me next summer *then:than* stay home like always.",
      "Your best friend,",
      "Maya"
    ]
  },
  {
    paragraphs: [
      "Dear Mr. Thompson,",
      "I can't *beleive:believe* we get to go to the science museum next week! I have never *saw:seen* a real dinosaur skeleton before.",
      "My little sister *want:wants* to come too, but the trip is only for our *clas:class*.",
      "Could you tell us what time the bus *leave:leaves* on Friday morning?",
      "I already packed my lunch so I won't *forgetted:forget* it in the morning.",
      "Me and my friends *is:are* so excited for this trip. Thank you for *planing:planning* it for our class.",
      "Sincerely,",
      "Owen"
    ]
  },
  {
    paragraphs: [
      "Dear Mom and Dad,",
      "Camp is going great! Yesterday we hiked up a big hill and I *seen:saw* a deer, but it ran away too fast for me to take a picture.",
      "My cabin has three other *kid:kids* in it and we all get along really well.",
      "Yesterday I *eated:ate* the best spaghetti I have ever had in the dining hall.",
      "I don't have *no:any* bug bites yet, which is pretty lucky since the mosquitoes are everywhere!",
      "The counselors said the campfire *was:were* the biggest one they have ever built. Me and my friend *is:are* going to make friendship bracelets tomorrow.",
      "I miss you *alot:a_lot* and I can't wait to tell you everything when I get home.",
      "Love,",
      "Katie"
    ]
  },
  {
    paragraphs: [
      "Dear Aunt Rosa,",
      "Thank you for helping me pick out my new puppy last weekend! He is the cutest dog I have ever *saw:seen*.",
      "I named him Buddy because he *don't:doesn't* stop wagging his tail. He *sleeped:slept* in my room the first night and didn't cry at all.",
      "My mom said Buddy is *gooder:better* behaved than most puppies his age.",
      "Buddy has already learned to sit and *shaked:shake* hands, which took *alot:a_lot* of practice.",
      "I can't wait for you to meet him again. *Its:It's* going to be so much fun when you visit next month.",
      "Love,",
      "Diego"
    ]
  },
  {
    paragraphs: [
      "Dear Uncle Jamal,",
      "Thank you for taking me to the zoo last Saturday! It was *definately:definitely* the best day of my summer.",
      "My favorite animal was the elephant *becuase:because* it sprayed water everywhere.",
      "We *seen:saw* three baby tigers playing in the grass, and I *taked:took* about twenty pictures of them.",
      "There *is:are* so many cool animals at that zoo that we could not see them all in one day.",
      "I don't want to wait *to:too* long before we go back again.",
      "I hope we can go again sooner *then:than* my birthday.",
      "Thanks again for a great day!",
      "Love,",
      "Nia"
    ]
  },
  {
    paragraphs: [
      "Dear Principal Adams,",
      "My class thinks the school should get *alot:a_lot* more books for the library. We *doesn't:don't* have enough books about space and animals.",
      "Me and my classmates *has:have* been asking the librarian for new books every week, but she says there is not enough money right now.",
      "Maybe the school could have a book drive where families *brings:bring* books they don't need anymore.",
      "I *no:know* this would make a big difference for kids who *loves:love* to read like me.",
      "Thank you for reading my idea. I hope you will *thinked:think* about it.",
      "Sincerely,",
      "Jordan"
    ]
  },
  {
    paragraphs: [
      "Dear Carlos,",
      "I can't *beleive:believe* you are moving next month. You have been my best *freind:friend* since kindergarten, and I don't know what I will do without you.",
      "Me and you *has:have* had so many fun times together, like the time we *builded:built* a fort in your backyard.",
      "I hope your new school is *gooder:better* than ours, but nobody there could ever be as funny as you.",
      "Please *right:write* to me every week so I don't miss *nothing:anything* that happens in your new town.",
      "We should plan a visit for winter break so we can hang out *agian:again*.",
      "Your best friend,",
      "Ben"
    ]
  },
  {
    paragraphs: [
      "Dear Ms. Patel,",
      "I love coming to the library every week, but there *isn't:aren't* enough graphic novels on the shelf for kids in my class.",
      "Me and my friends *has:have* been asking for more of the Dog Man books, but the library only *have:has* two copies.",
      "Some kids don't *never:ever* get a turn to check them out because they are always gone.",
      "I *no:know* buying new books costs money, so maybe families could donate books they *dont:don't* need anymore.",
      "Thank you for taking the time to *reading:read* my letter.",
      "Sincerely,",
      "Ava"
    ]
  },
  {
    paragraphs: [
      "Dear Diego,",
      "My birthday sleepover is on Friday, and I really hope you can *comed:come*! We are going to watch movies and *eated:eat* a giant pizza.",
      "My mom *buyed:bought* a bunch of snacks and a new board game that sounds *real:really* fun to play.",
      "You should bring a sleeping bag because we might *sleeped:sleep* outside in the tent if it doesn't rain.",
      "Me and my brother *has:have* been setting up the tent this weekend so it will be ready *befor:before* everyone gets here.",
      "I hope you *dont:don't* forget to ask your mom if you can stay the whole night.",
      "Your cousin,",
      "Leo"
    ]
  },
  {
    paragraphs: [
      "Dear Mr. Alvarez,",
      "Thank you so much for watching Biscuit while my family was on vacation. I *no:know* he can be a *handfull:handful* sometimes!",
      "My mom said you *taked:took* him on a walk every single day and even *gived:gave* him a bath before we got home.",
      "Biscuit *don't:doesn't* usually like strangers, so it means a lot that he trusted you so quickly.",
      "We *brung:brought* you some cookies to say thank you for being such a great neighbor.",
      "I hope we can ask you again the next time we take a trip.",
      "Sincerely,",
      "Grace"
    ]
  },
  {
    paragraphs: [
      "Dear Ms. Kim,",
      "I am sorry I missed class yesterday. I had a really bad *coff:cough* and a sore *throte:throat*, so my mom kept me home.",
      "I *dont:don't* have the homework from yesterday because I was asleep all day.",
      "My sister said you *give:gave* everyone a worksheet about fractions. Could you tell me what page it is on?",
      "I promise I will *finished:finish* all my missing work by Monday.",
      "Me and my mom *is:are* going to the doctor today just to make sure I feel better soon.",
      "Sincerely,",
      "Noah"
    ]
  },
  {
    paragraphs: [
      "Dear Grandpa,",
      "Thank you for taking me fishing last weekend! It was the *bestest:best* day we have had together in a long time.",
      "I *catched:caught* three fish all by myself, and you helped me reel in the biggest one.",
      "I didn't know how to bait a hook before, but now I *knowed:know* exactly what to do, and it *don't:doesn't* seem hard anymore.",
      "Next time we go, I *hopes:hope* we can visit the lake near your house again.",
      "Me and you *makes:make* a really good fishing team, Grandpa!",
      "Love,",
      "Ruby"
    ]
  },
  {
    paragraphs: [
      "Dear Coach Diaz,",
      "I have been practicing my backstroke every day *becuase:because* I really want to do good at the meet next Saturday.",
      "My time has gotten *fasterer:faster* every week, and I *dont:don't* get as tired as I used to.",
      "Me and my teammates *swum:swam* two extra laps after practice yesterday just to build up our *strengh:strength*.",
      "I *no:know* I still need to work on my flip turns before the big meet.",
      "Thank you for always *helpping:helping* me get *gooder:better* at swimming.",
      "Sincerely,",
      "Ethan"
    ]
  },
  {
    paragraphs: [
      "Dear Mia,",
      "You will never *beleive:believe* what I got for my birthday, a brand new video game with *alot:a_lot* of cool levels!",
      "Me and my brother *has:have* been playing it every single day after homework is done.",
      "The graphics are the most amazing I have ever *saw:seen*.",
      "There *is:are* twelve different worlds to explore, and each one is harder than the last.",
      "You should come over this weekend so we can *played:play* it together.",
      "I *hopes:hope* you can come!",
      "Your friend,",
      "Zoe"
    ]
  },
  {
    paragraphs: [
      "Dear Aunt Priya,",
      "Starting at my new school was *scarey:scary* at first, but I am already making new friends.",
      "My teacher, Mr. Diaz, is really nice, and he *don't:doesn't* give too much homework, which is great.",
      "I *maked:made* a friend named Oliver who sits next to me in math class.",
      "The cafeteria food here is way *gooder:better* than my old school, especially the pizza on Fridays.",
      "I still miss my old friends *alot:a_lot*, but I think this new school is going to be great.",
      "Me and my new friends *is:are* joining the soccer team together next month.",
      "Love,",
      "Tyler"
    ]
  },
  {
    paragraphs: [
      "Dear School Newspaper,",
      "I think our cafeteria needs *alot:a_lot* of new lunch options *becuase:because* the food is the same every single week.",
      "Me and my friends *doesn't:don't* like that there is only one vegetarian choice, and it *dont:doesn't* change very often.",
      "Last week I *seen:saw* a survey that *say:said* most kids want more fruit and less fried food.",
      "I *no:know* changing the whole menu takes time, but even one new item a month would make a lot of kids happy.",
      "Thank you for reading my letter and sharing my idea with the principal.",
      "Sincerely,",
      "Ella"
    ]
  },
  {
    paragraphs: [
      "Dear Sam,",
      "My first day of fifth grade was *realy:really* fun! I *seen:saw* a bunch of my old friends from fourth grade in my class.",
      "My teacher, Mrs. Lopez, *dont:doesn't* let us use phones in class, but she lets us use tablets for reading time.",
      "At lunch, me and my friends *sitted:sat* together at the same table we always sit at.",
      "I *no:know* this year is going to be harder than last year, but I'm ready for it.",
      "I hope you *has:have* a great first day at your school too!",
      "Your cousin,",
      "Jack"
    ]
  },
  {
    paragraphs: [
      "Dear Grandma and Grandpa,",
      "Thank you for having our whole family over for Thanksgiving. The turkey was the *bestest:best* one I have ever had!",
      "Me and my cousins *runned:ran* around the backyard for hours until it got dark.",
      "I *eated:ate* so much pumpkin pie that I didn't have room for seconds.",
      "Grandpa taught me how to whittle a little wooden bird, and I *taked:took* it home to show my friends.",
      "We all *was:were* so full and happy by the end of the night.",
      "My cousins said *there:they're* coming back again next Thanksgiving too!",
      "Love,",
      "Lily"
    ]
  }
];

/* ══════════════════════════════════════════════
   STATE
   ══════════════════════════════════════════════ */

let gramLetterIdx   = -1;
let gramTotalErrors = 0;
let gramFoundCount  = 0;

/* ══════════════════════════════════════════════
   DOM REFS
   ══════════════════════════════════════════════ */

const gramProgressEl = document.getElementById('grammar-progress');
const gramBodyEl     = document.getElementById('grammar-letter-body');

/* ══════════════════════════════════════════════
   PARSING & RENDERING
   ══════════════════════════════════════════════ */

function parseGramToken(raw) {
  const m = raw.match(/^\*([^*]+)\*([.,!?;:'")]*)$/);
  if (!m) return { text: raw, isError: false, correct: null };
  const [, inner, trailing] = m;
  const [wrong, correct] = inner.split(':');
  // Underscores stand in for spaces in multi-word corrections (e.g. "a_lot"),
  // since the marker itself must stay a single whitespace-free token.
  return {
    text: wrong + trailing,
    isError: true,
    correct: correct ? correct.replace(/_/g, ' ') + trailing : null
  };
}

function renderGramParagraph(text) {
  const p = document.createElement('p');
  p.className = 'gram-paragraph';
  const rawTokens = text.split(/\s+/).filter(Boolean);
  rawTokens.forEach((raw, i) => {
    const tok = parseGramToken(raw);
    const span = document.createElement('span');
    span.className = 'gram-word';
    span.textContent = tok.text;
    if (tok.isError) {
      span.dataset.error = 'true';
      if (tok.correct) span.dataset.correct = tok.correct;
    }
    p.appendChild(span);
    if (i < rawTokens.length - 1) p.appendChild(document.createTextNode(' '));
  });
  return p;
}

function renderGramLetter(letter) {
  gramBodyEl.innerHTML = '';
  letter.paragraphs.forEach(text => {
    gramBodyEl.appendChild(renderGramParagraph(text));
  });
  gramTotalErrors = gramBodyEl.querySelectorAll('.gram-word[data-error="true"]').length;
  gramFoundCount  = 0;
  updateGramProgress();
}

function updateGramProgress() {
  gramProgressEl.textContent = `Found ${gramFoundCount} of ${gramTotalErrors} mistakes`;
}

/* ══════════════════════════════════════════════
   INTERACTION
   ══════════════════════════════════════════════ */

function handleGramWordTap(span) {
  if (span.dataset.error === 'true') {
    if (span.classList.contains('gram-found')) return;
    span.classList.add('gram-found');
    gramFoundCount++;
    updateGramProgress();

    if (span.dataset.correct) {
      const hint = document.createElement('span');
      hint.className = 'gram-hint';
      hint.textContent = ` (${span.dataset.correct})`;
      span.after(hint);
    }

    if (gramFoundCount >= gramTotalErrors) {
      setTimeout(() => {
        document.getElementById('win-heading').textContent = 'Great editing!';
        showWinScreen(`Found all ${gramTotalErrors} mistakes!`);
      }, 700);
    }
  } else {
    if (span.classList.contains('gram-miss')) return;
    span.classList.add('gram-miss');
    span.addEventListener('animationend', () => span.classList.remove('gram-miss'), { once: true });
  }
}

gramBodyEl.addEventListener('click', (e) => {
  const span = e.target.closest('.gram-word');
  if (!span || !gramBodyEl.contains(span)) return;
  handleGramWordTap(span);
});

/* ══════════════════════════════════════════════
   GAME LIFECYCLE
   ══════════════════════════════════════════════ */

function grammarNewGame() {
  let idx;
  do {
    idx = Math.floor(Math.random() * GRAMMAR_LETTERS.length);
  } while (GRAMMAR_LETTERS.length > 1 && idx === gramLetterIdx);
  gramLetterIdx = idx;

  renderGramLetter(GRAMMAR_LETTERS[idx]);
  winOverlay.classList.add('hidden');
  document.getElementById('win-heading').textContent = 'Great editing!';
  startTimer();
}
