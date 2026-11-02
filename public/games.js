// games.js - Child-friendly, calm educational activities for ages 3–5
// Alphabet, Counting, Colors, Shapes, Animals, Basic Maths, Thali Builder,
// Good & Bad Touch Safety, Humane Manners, and Moral Stories with Life Lessons.

const LittleGames = (() => {
  let activeGame = null;

  // Speak text gently using Web Speech API in active language
  function speak(text) {
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 0.85; // Slow, clear, gentle pace for young toddlers
        utter.pitch = 1.05; // Warm, friendly pitch

        const lang = (window.I18N && window.I18N.currentLang()) || 'en';
        const langMap = {
          en: 'en-IN',
          hi: 'hi-IN',
          mr: 'mr-IN',
          ta: 'ta-IN',
          te: 'te-IN',
          kn: 'kn-IN',
          ml: 'ml-IN',
          bn: 'bn-IN'
        };
        utter.lang = langMap[lang] || 'en-IN';

        window.speechSynthesis.speak(utter);
      } catch (e) {
        console.warn('Speech synthesis unavailable:', e);
      }
    }
  }

  // Complete activity & record stars for child progress
  function completeActivity(gameId, type, title, stars = 1) {
    speak('Super job! You earned a shiny golden star!');
    if (window.LittleApp && typeof window.LittleApp.recordChildActivity === 'function') {
      window.LittleApp.recordChildActivity({
        activityId: gameId,
        activityType: type,
        title: title,
        starsEarned: stars
      });
    }
  }

  function closeCurrentGame() {
    const container = document.getElementById('gameActiveContainer');
    if (container) container.innerHTML = '';
    const grid = document.getElementById('gamesGridOverview');
    if (grid) grid.style.display = 'grid';
  }

  // ----------------------------------------------------
  // 1. ALPHABET & SOUNDS
  // ----------------------------------------------------
  const ALPHABET_ITEMS = [
    { char: 'A', word: 'Apple', icon: '🍎' },
    { char: 'B', word: 'Butterfly', icon: '🦋' },
    { char: 'C', word: 'Cow', icon: '🐄' },
    { char: 'D', word: 'Drum', icon: '🥁' },
    { char: 'E', word: 'Elephant', icon: '🐘' },
    { char: 'F', word: 'Fish', icon: '🐟' },
    { char: 'G', word: 'Guava', icon: '🍈' },
    { char: 'H', word: 'Hut', icon: '🏡' },
    { char: 'M', word: 'Mango', icon: '🥭' },
    { char: 'P', word: 'Peacock', icon: '🦚' },
    { char: 'S', word: 'Sun', icon: '☀️' },
    { char: 'T', word: 'Tree', icon: '🌳' }
  ];

  function startAlphabetGame(container) {
    container.innerHTML = `
      <div class="game-stage-container">
        <h3>🔤 Letters and Sounds Garden</h3>
        <p style="color: var(--text-secondary); margin-bottom: 14px;">Tap a friendly letter to hear its sound!</p>
        <div id="alphabetDisplay" style="font-size: 2.5rem; margin: 10px; height: 90px; display: flex; align-items: center; justify-content: center; background: var(--bg-warm-yellow); border-radius: var(--radius-md); border: 2px dashed var(--warm-gold-border);">
          <span>🍎 A for Apple</span>
        </div>
        <div class="game-board">
          ${ALPHABET_ITEMS.map((item, idx) => `
            <button class="game-bubble" onclick="LittleGames.tapLetter(${idx})">
              <span>${item.char}</span>
              <span style="font-size: 1.2rem;">${item.icon}</span>
            </button>
          `).join('')}
        </div>
        <button class="btn btn-secondary" onclick="LittleGames.closeCurrentGame()">Back to Play Area</button>
      </div>
    `;
    speak('Welcome to the Letters Garden! Tap a letter to play.');
  }

  function tapLetter(idx) {
    const item = ALPHABET_ITEMS[idx];
    const display = document.getElementById('alphabetDisplay');
    if (display) {
      display.innerHTML = `<span style="font-size: 2rem;">${item.icon} ${item.char} for ${item.word}</span>`;
    }
    speak(`${item.char} for ${item.word}`);
    completeActivity(`alphabet_${item.char}`, 'alphabet', `Learned letter ${item.char}`, 1);
  }

  // ----------------------------------------------------
  // 2. COUNTING ORCHARD (1 to 10)
  // ----------------------------------------------------
  let countTarget = 5;
  let currentCount = 0;

  function startCountingGame(container) {
    countTarget = Math.floor(Math.random() * 4) + 3; // 3 to 6
    currentCount = 0;

    container.innerHTML = `
      <div class="game-stage-container">
        <h3>🥭 Counting in the Mango Orchard</h3>
        <p style="color: var(--text-secondary);">Tap all the ripe mangoes on the tree! Count to <strong id="targetDisplay">${countTarget}</strong></p>
        <div style="font-size: 2rem; font-weight: 700; color: var(--pastel-peach-text); margin: 12px 0;">
          Count: <span id="countNumber">0</span> / ${countTarget}
        </div>
        <div class="game-board" id="countingOrchard">
          ${Array.from({ length: countTarget }).map((_, i) => `
            <button class="game-bubble" id="mango_${i}" onclick="LittleGames.tapMango(${i})">
              🥭
            </button>
          `).join('')}
        </div>
        <div id="countingCheer" style="margin-top: 14px; min-height: 30px; font-weight: 700; color: var(--pastel-green-text);"></div>
        <button class="btn btn-secondary" onclick="LittleGames.closeCurrentGame()">Back to Play Area</button>
      </div>
    `;
    speak(`Let us count ${countTarget} sweet mangoes together! Tap the first mango.`);
  }

  function tapMango(idx) {
    const el = document.getElementById(`mango_${idx}`);
    if (el && !el.classList.contains('matched')) {
      el.classList.add('matched');
      el.style.opacity = '0.4';
      el.disabled = true;
      currentCount++;
      document.getElementById('countNumber').textContent = currentCount;
      speak(String(currentCount));

      if (currentCount >= countTarget) {
        document.getElementById('countingCheer').innerHTML = '🎉 Fantastic counting! You found all the mangoes! ⭐';
        completeActivity('counting_orchard', 'counting', `Counted to ${countTarget}`, 2);
      }
    }
  }

  // ----------------------------------------------------
  // 3. COLORS & SHAPES
  // ----------------------------------------------------
  const SHAPES_DATA = [
    { name: 'Circle', match: 'Roti', shapeIcon: '⭕', itemIcon: '🫓', desc: 'Roti is round like a circle' },
    { name: 'Triangle', match: 'Samosa', shapeIcon: '🔺', itemIcon: '🥟', desc: 'Samosa has three sharp corners' },
    { name: 'Rectangle', match: 'Storybook', shapeIcon: '▭', itemIcon: '📖', desc: 'A storybook has two long and two short sides' },
    { name: 'Square', match: 'Carrom Board', shapeIcon: '⬛', itemIcon: '🔲', desc: 'Carrom board has four equal sides' }
  ];

  function startColorsShapes(container) {
    container.innerHTML = `
      <div class="game-stage-container">
        <h3>🎨 Shapes in Our Daily World</h3>
        <p style="color: var(--text-secondary); margin-bottom: 12px;">Match each shape to a familiar everyday object!</p>
        <div class="game-board">
          ${SHAPES_DATA.map((s, i) => `
            <div class="card" style="padding: 14px; text-align: center; cursor: pointer; border: 2px solid var(--warm-gold-border); min-width: 130px;" onclick="LittleGames.tapShape(${i})">
              <div style="font-size: 2.2rem;">${s.shapeIcon} ➔ ${s.itemIcon}</div>
              <div style="font-weight: 700; margin-top: 6px;">${s.name}</div>
              <div style="font-size: 0.85rem; color: var(--text-secondary);">${s.match}</div>
            </div>
          `).join('')}
        </div>
        <div id="shapeFeedback" style="min-height: 30px; font-weight: 700; color: var(--pastel-peach-text); margin: 12px 0;"></div>
        <button class="btn btn-secondary" onclick="LittleGames.closeCurrentGame()">Back to Play Area</button>
      </div>
    `;
    speak('Look around your home! Tap a shape to explore.');
  }

  function tapShape(idx) {
    const s = SHAPES_DATA[idx];
    const fb = document.getElementById('shapeFeedback');
    if (fb) fb.textContent = s.desc;
    speak(s.desc);
    completeActivity(`shape_${idx}`, 'shapes', `Explored shape ${s.name}`, 1);
  }

  // ----------------------------------------------------
  // 4. ANIMALS OF THE WORLD (Farm, Wild, Birds, Water)
  // ----------------------------------------------------
  const ANIMALS_DATA = [
    // Farm / Domestic
    { name: 'Cow', icon: '🐄', category: 'Farm Animal', sound: 'Moo moo!', fact: 'Gives wholesome fresh milk and loves eating sweet green grass.' },
    { name: 'Goat', icon: '🐐', category: 'Farm Animal', sound: 'Maa maa!', fact: 'Very agile, loves climbing small rocks and eating green leaves.' },
    { name: 'Dog', icon: '🐕', category: 'Friendly Pet', sound: 'Woof woof!', fact: 'A loyal best friend who wags tail when happy.' },
    { name: 'Cat', icon: '🐈', category: 'Friendly Pet', sound: 'Meow purr!', fact: 'Walks softly on little paws and loves taking cozy afternoon naps.' },
    { name: 'Horse', icon: '🐎', category: 'Farm Animal', sound: 'Neigh neigh!', fact: 'Runs very fast and has strong beautiful hooves.' },
    
    // Wild Animals
    { name: 'Elephant', icon: '🐘', category: 'Wild Gentle Giant', sound: 'Trumpet pawoo!', fact: 'Has a long helpful trunk to drink water and pick bananas.' },
    { name: 'Lion', icon: '🦁', category: 'Wild King', sound: 'Roar!', fact: 'Has a grand golden mane and rests with its pride.' },
    { name: 'Monkey', icon: '🐒', category: 'Wild Animal', sound: 'Chatter ooh ooh!', fact: 'Swings joyfully from tree to tree in the jungle.' },
    { name: 'Deer', icon: '🦌', category: 'Wild Animal', sound: 'Gentle whistle', fact: 'Has big gentle eyes and leaps gracefully through forests.' },

    // Birds
    { name: 'Peacock', icon: '🦚', category: 'National Bird', sound: 'May-awe!', fact: 'Dances joyfully with brilliant blue and green feathers when clouds gather.' },
    { name: 'Parrot', icon: '🦜', category: 'Bird', sound: 'Squawk squawk!', fact: 'Bright green with a cute red curved beak, loves sweet guavas.' },
    { name: 'Sparrow', icon: '🐦', category: 'Little Bird', sound: 'Chirp chirp!', fact: 'Tiny friendly bird hopping on balconies looking for grain seeds.' },
    { name: 'Duck', icon: '🦆', category: 'Water Bird', sound: 'Quack quack!', fact: 'Glides smoothly on village ponds with webbed feet.' },

    // Aquatic / Water Animals
    { name: 'Fish', icon: '🐟', category: 'Water Animal', sound: 'Splash splash!', fact: 'Breathes underwater and swims by swishing its colorful tail.' },
    { name: 'Turtle', icon: '🐢', category: 'Water Animal', sound: 'Gentle paddle', fact: 'Carries a strong round shell on its back for safety.' },
    { name: 'Frog', icon: '🐸', category: 'Water and Land', sound: 'Croak croak ribbit!', fact: 'Hops high near ponds and catches mosquitoes on summer nights.' },
    { name: 'Dolphin', icon: '🐬', category: 'Ocean Friend', sound: 'Click and whistle!', fact: 'Very smart ocean mammal that leaps playfully over blue waves.' }
  ];

  function startAnimalsGame(container) {
    container.innerHTML = `
      <div class="game-stage-container">
        <h3>🐾 Animals of the World</h3>
        <p style="color: var(--text-secondary); margin-bottom: 12px;">Tap an animal to hear its sound and discover what it loves!</p>
        <div id="animalInfoBox" style="background: var(--bg-warm-yellow); border: 2px dashed var(--warm-gold-border); border-radius: var(--radius-md); padding: 16px; margin: 12px 0; min-height: 80px; display: flex; align-items: center; justify-content: center;">
          <span style="font-size: 1.1rem; color: var(--text-secondary);">Tap an animal below to learn!</span>
        </div>
        <div class="game-board">
          ${ANIMALS_DATA.map((a, i) => `
            <button class="game-bubble" style="width: 100px; height: 95px;" onclick="LittleGames.tapAnimal(${i})">
              <span style="font-size: 2.2rem;">${a.icon}</span>
              <span style="font-size: 0.78rem; font-weight: 700; margin-top: 2px;">${a.name}</span>
            </button>
          `).join('')}
        </div>
        <button class="btn btn-secondary" onclick="LittleGames.closeCurrentGame()">Back to Play Area</button>
      </div>
    `;
    speak('Welcome to the animal world! Tap any animal to hear its sound.');
  }

  function tapAnimal(idx) {
    const a = ANIMALS_DATA[idx];
    const box = document.getElementById('animalInfoBox');
    if (box) {
      box.innerHTML = `
        <div style="text-align: center;">
          <div style="font-size: 1.3rem; font-weight: 700; color: var(--text-primary);">${a.icon} ${a.name} (${a.category})</div>
          <div style="font-size: 1.1rem; color: var(--pastel-peach-accent); font-weight: 700; margin: 4px 0;">Sound: "${a.sound}"</div>
          <div style="font-size: 0.95rem; color: var(--text-secondary);">${a.fact}</div>
        </div>
      `;
    }
    speak(`${a.name}. Says ${a.sound}. ${a.fact}`);
    completeActivity(`animal_${a.name.toLowerCase()}`, 'animals', `Met animal ${a.name}`, 1);
  }

  // ----------------------------------------------------
  // 5. BASIC MATHS FOR KIDS (Age-Based: 3, 4, 5)
  // ----------------------------------------------------
  let mathLevel = 4;
  let mathQuestion = null;

  function startMathsGame(container) {
    // Determine child age from active child or default to 4
    if (window.LittleApp && window.LittleApp.getActiveChild()) {
      mathLevel = window.LittleApp.getActiveChild().age || 4;
    }

    container.innerHTML = `
      <div class="game-stage-container">
        <h3>🧮 Basic Maths for Little Explorers</h3>
        <div style="display: flex; justify-content: center; gap: 8px; margin-bottom: 12px;">
          <button class="btn btn-sm ${mathLevel === 3 ? 'btn-primary' : 'btn-outline'}" onclick="LittleGames.setMathLevel(3)">Age 3 (More or Less)</button>
          <button class="btn btn-sm ${mathLevel === 4 ? 'btn-primary' : 'btn-outline'}" onclick="LittleGames.setMathLevel(4)">Age 4 (Add One More)</button>
          <button class="btn btn-sm ${mathLevel === 5 ? 'btn-primary' : 'btn-outline'}" onclick="LittleGames.setMathLevel(5)">Age 5 (Simple Adding)</button>
        </div>
        <div id="mathCardContainer" style="background: var(--bg-warm-yellow); border: 2px solid var(--warm-gold-border); border-radius: var(--radius-lg); padding: 20px; margin: 14px 0;"></div>
        <div id="mathFeedback" style="min-height: 32px; font-weight: 700; margin: 10px 0;"></div>
        <button class="btn btn-secondary" onclick="LittleGames.closeCurrentGame()">Back to Play Area</button>
      </div>
    `;
    generateMathQuestion();
  }

  function setMathLevel(lvl) {
    mathLevel = lvl;
    const container = document.getElementById('gameActiveContainer');
    if (container) startMathsGame(container);
  }

  function generateMathQuestion() {
    const card = document.getElementById('mathCardContainer');
    const fb = document.getElementById('mathFeedback');
    if (!card) return;
    if (fb) fb.innerHTML = '';

    if (mathLevel === 3) {
      // Comparison: Which has MORE?
      const countA = Math.floor(Math.random() * 2) + 1; // 1 or 2
      const countB = Math.floor(Math.random() * 3) + 3; // 3 to 5
      const isALarger = Math.random() > 0.5;
      const leftCount = isALarger ? countB : countA;
      const rightCount = isALarger ? countA : countB;
      const correctSide = leftCount > rightCount ? 'left' : 'right';

      mathQuestion = { correct: correctSide, prompt: 'Which side has MORE apples?' };

      card.innerHTML = `
        <h4 style="margin-bottom: 14px; font-size: 1.25rem;">🍎 Which side has MORE apples?</h4>
        <div style="display: flex; justify-content: space-around; gap: 14px; flex-wrap: wrap;">
          <button class="btn btn-outline" style="min-height: 100px; min-width: 130px; font-size: 1.8rem; display: flex; flex-direction: column; align-items: center;" onclick="LittleGames.answerMath('left')">
            <span>${'🍎'.repeat(leftCount)}</span>
            <span style="font-size: 0.9rem; font-weight: 700; margin-top: 6px;">Side A</span>
          </button>
          <button class="btn btn-outline" style="min-height: 100px; min-width: 130px; font-size: 1.8rem; display: flex; flex-direction: column; align-items: center;" onclick="LittleGames.answerMath('right')">
            <span>${'🍎'.repeat(rightCount)}</span>
            <span style="font-size: 0.9rem; font-weight: 700; margin-top: 6px;">Side B</span>
          </button>
        </div>
      `;
      speak('Which side has more apples? Tap the bigger group.');
    } else if (mathLevel === 4) {
      // Add 1 more!
      const start = Math.floor(Math.random() * 3) + 1; // 1 to 3
      const total = start + 1;
      mathQuestion = { correct: total, prompt: `You have ${start} little birds. 1 more joins! How many now?` };

      card.innerHTML = `
        <h4 style="margin-bottom: 12px; font-size: 1.2rem;">🕊️ You have ${start} little bird${start > 1 ? 's' : ''}. 1 more bird flies in! How many birds altogether?</h4>
        <div style="font-size: 2.2rem; margin: 12px 0;">
          ${'🕊️'.repeat(start)} + 🕊️ = ?
        </div>
        <div style="display: flex; justify-content: center; gap: 12px;">
          ${[total - 1, total, total + 1].sort(() => Math.random() - 0.5).map(opt => `
            <button class="btn btn-secondary btn-lg" style="font-size: 1.5rem; min-width: 70px;" onclick="LittleGames.answerMath(${opt})">
              ${opt}
            </button>
          `).join('')}
        </div>
      `;
      speak(mathQuestion.prompt);
    } else {
      // Age 5: Visual Addition (2 + 2 = 4)
      const num1 = Math.floor(Math.random() * 3) + 1;
      const num2 = Math.floor(Math.random() * 3) + 1;
      const sum = num1 + num2;
      mathQuestion = { correct: sum, prompt: `${num1} stars plus ${num2} stars. How many stars in all?` };

      card.innerHTML = `
        <h4 style="margin-bottom: 12px; font-size: 1.2rem;">⭐ Let us add: ${num1} + ${num2}</h4>
        <div style="font-size: 2rem; margin: 14px 0;">
          ${'⭐'.repeat(num1)} <strong style="color: var(--pastel-peach-accent);">+</strong> ${'⭐'.repeat(num2)}
        </div>
        <div style="display: flex; justify-content: center; gap: 12px;">
          ${[sum, sum - 1, sum + 1].filter(x => x > 0).sort(() => Math.random() - 0.5).map(opt => `
            <button class="btn btn-secondary btn-lg" style="font-size: 1.5rem; min-width: 70px;" onclick="LittleGames.answerMath(${opt})">
              ${opt}
            </button>
          `).join('')}
        </div>
      `;
      speak(mathQuestion.prompt);
    }
  }

  function answerMath(ans) {
    const fb = document.getElementById('mathFeedback');
    if (!fb || !mathQuestion) return;

    if (ans === mathQuestion.correct) {
      fb.innerHTML = '🎉 <strong style="color: var(--pastel-green-text);">Correct! Wonderful thinking! ⭐</strong>';
      speak('Correct! Wonderful thinking!');
      completeActivity(`math_level_${mathLevel}`, 'maths', `Solved math question`, 2);
      setTimeout(generateMathQuestion, 2000);
    } else {
      fb.innerHTML = '💡 <span style="color: var(--pastel-peach-text);">Give it another count! You can do it.</span>';
      speak('Give it another count! You can do it.');
    }
  }

  // ----------------------------------------------------
  // 6. GOOD TOUCH & BAD TOUCH (Safe Body Education)
  // ----------------------------------------------------
  const SAFETY_CONCEPTS = [
    {
      title: 'My Body Belongs to Me',
      icon: '🛡️',
      summary: 'Your body is completely yours and special.',
      lesson: 'Parts of your body covered by a swimsuit are private. Nobody is allowed to see or touch them, and you should never touch anyone else’s private parts.',
      voice: 'Your body belongs to you. Areas covered by your swimsuit are private and safe.'
    },
    {
      title: 'Safe Touches',
      icon: '🤗',
      summary: 'Touches that make you feel warm, happy, and safe.',
      lesson: 'A gentle hug from Mother or Father, holding Grandma’s hand to cross the road, high-fives with friends, or doctor check-ups with Mumma or Papa standing right beside you.',
      voice: 'Safe touches are warm hugs from parents and holding hands with family.'
    },
    {
      title: 'Unsafe Touches',
      icon: '✋',
      summary: 'Touches that make you feel uncomfortable, scared, or confused.',
      lesson: 'If anyone tries to touch your private parts, or asks you to keep a secret that makes you feel uneasy, that is an unsafe touch. Remember: it is NEVER your fault.',
      voice: 'If a touch makes you feel scared or uncomfortable, that is an unsafe touch.'
    },
    {
      title: 'The 3 Golden Safety Rules',
      icon: '🌟',
      summary: 'What to do right away if someone makes you uncomfortable:',
      lesson: '1. Say NO loudly and firmly!\n2. RUN to a safe open space.\n3. TELL a trusted adult from your Safety Circle (Mother, Father, Teacher, Grandmother).',
      voice: 'Rule 1: Say NO! Rule 2: Run away! Rule 3: Tell Mumma, Papa, or Teacher!'
    },
    {
      title: 'No Secrets with Family',
      icon: '🗣️',
      summary: 'Never keep bad secrets.',
      lesson: 'Good secrets are fun surprises like birthday gifts. Bad secrets make you feel scared or nervous. Always tell your trusted family member right away.',
      voice: 'Never keep a secret that makes you feel uneasy. Always tell Mumma or Papa.'
    }
  ];

  function startGoodBadTouchGame(container) {
    container.innerHTML = `
      <div class="game-stage-container">
        <h3>🛡️ My Safe Body and Gentle Boundaries</h3>
        <p style="color: var(--text-secondary); margin-bottom: 14px;">Empowering children aged 3 to 5 with safe touch knowledge and confidence.</p>
        <div id="safetyDetailBox" style="background: var(--bg-warm-yellow); border: 2px solid var(--pastel-green-border); border-radius: var(--radius-lg); padding: 18px; margin-bottom: 16px; text-align: left;">
          <h4 style="color: var(--pastel-green-text); margin-bottom: 6px;">🛡️ Safe Body Circle</h4>
          <p style="font-size: 1.05rem; line-height: 1.5; color: var(--text-primary);">Tap each shield card below to learn your body safety powers!</p>
        </div>
        <div class="game-board">
          ${SAFETY_CONCEPTS.map((sc, i) => `
            <div class="card" style="padding: 14px; text-align: center; cursor: pointer; border: 2px solid var(--border-subtle); min-width: 150px;" onclick="LittleGames.tapSafetyCard(${i})">
              <div style="font-size: 2.2rem; margin-bottom: 4px;">${sc.icon}</div>
              <div style="font-weight: 700; font-size: 0.95rem;">${sc.title}</div>
            </div>
          `).join('')}
        </div>
        <button class="btn btn-secondary" onclick="LittleGames.closeCurrentGame()">Back to Play Area</button>
      </div>
    `;
    speak('Your body belongs to you! Tap a card to learn the safety rules.');
  }

  function tapSafetyCard(idx) {
    const sc = SAFETY_CONCEPTS[idx];
    const box = document.getElementById('safetyDetailBox');
    if (box) {
      box.innerHTML = `
        <h4 style="color: var(--pastel-green-text); margin-bottom: 6px; font-size: 1.2rem;">${sc.icon} ${sc.title}</h4>
        <p style="font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">${sc.summary}</p>
        <p style="font-size: 0.98rem; color: var(--text-secondary); white-space: pre-line; line-height: 1.5;">${sc.lesson}</p>
      `;
    }
    speak(sc.voice);
    completeActivity(`safety_rule_${idx}`, 'safety', `Learned safety rule: ${sc.title}`, 2);
  }

  // ----------------------------------------------------
  // 7. HUMANE MANNERS & SOCIAL KINDNESS
  // ----------------------------------------------------
  const MANNERS_DATA = [
    {
      word: 'Please',
      icon: '🙏',
      when: 'When asking for help or a toy',
      story: 'Saying "Please may I have the ball" shows patience and respect.',
      voice: 'Please. Use please when asking for something kindly.'
    },
    {
      word: 'Thank You',
      icon: '💐',
      when: 'When receiving food, gift, or kindness',
      story: 'Saying "Thank You Mumma" when given lunch fills everyone’s heart with joy.',
      voice: 'Thank you. Say thank you when someone helps you or serves your meal.'
    },
    {
      word: 'Sorry',
      icon: '🤝',
      when: 'When an accident happens or someone feels hurt',
      story: 'Saying "I am sorry" and offering a gentle hug makes friends smile again.',
      voice: 'Sorry. Saying sorry when we make a mistake brings friends together.'
    },
    {
      word: 'Sharing Toys',
      icon: '🧸',
      when: 'Playing with friends and siblings',
      story: 'Taking turns playing with the red toy truck doubles the playtime fun!',
      voice: 'Sharing toys. Taking turns makes games twice as fun for everyone.'
    },
    {
      word: 'Gentle with Animals',
      icon: '🐾',
      when: 'Near street puppies, cows, or birds',
      story: 'We never throw stones or pull tails. We offer water and speak softly.',
      voice: 'Gentle with animals. Animals have feelings too. We treat them with love.'
    },
    {
      word: 'Tidying Up',
      icon: '🧹',
      when: 'After finished playing with toys',
      story: 'Putting blocks back into the basket keeps our home safe and clean.',
      voice: 'Tidying up. Putting toys back into the box helps Mother and Father.'
    }
  ];

  function startMannersGame(container) {
    container.innerHTML = `
      <div class="game-stage-container">
        <h3>🌱 Humane Manners and Kindness Garden</h3>
        <p style="color: var(--text-secondary); margin-bottom: 12px;">Discover the magic words and kind habits that bring peace to our families.</p>
        <div id="mannerDetailBox" style="background: var(--bg-warm-yellow); border: 2px dashed var(--warm-gold-border); border-radius: var(--radius-md); padding: 16px; margin: 12px 0; min-height: 70px; display: flex; align-items: center; justify-content: center;">
          <span style="font-size: 1.05rem; color: var(--text-secondary);">Tap any magic manner below!</span>
        </div>
        <div class="game-board">
          ${MANNERS_DATA.map((m, i) => `
            <button class="game-bubble" style="width: 110px; height: 95px;" onclick="LittleGames.tapManner(${i})">
              <span style="font-size: 2rem;">${m.icon}</span>
              <span style="font-size: 0.8rem; font-weight: 700; margin-top: 2px;">${m.word}</span>
            </button>
          `).join('')}
        </div>
        <button class="btn btn-secondary" onclick="LittleGames.closeCurrentGame()">Back to Play Area</button>
      </div>
    `;
    speak('Welcome to the kindness garden! Tap a magic word to practice.');
  }

  function tapManner(idx) {
    const m = MANNERS_DATA[idx];
    const box = document.getElementById('mannerDetailBox');
    if (box) {
      box.innerHTML = `
        <div style="text-align: center;">
          <div style="font-size: 1.3rem; font-weight: 700; color: var(--text-primary);">${m.icon} ${m.word}</div>
          <div style="font-size: 0.95rem; font-weight: 600; color: var(--pastel-peach-accent); margin: 4px 0;">When to use: ${m.when}</div>
          <div style="font-size: 0.95rem; color: var(--text-secondary);">${m.story}</div>
        </div>
      `;
    }
    speak(m.voice);
    completeActivity(`manner_${idx}`, 'manners', `Practiced manner: ${m.word}`, 1);
  }

  // ----------------------------------------------------
  // 8. MORAL STORIES WITH LIFE LESSONS & RHYMES
  // ----------------------------------------------------
  const MORAL_STORIES = [
    {
      title: 'The Generous Mango Tree',
      icon: '🌳',
      moral: 'Sharing and giving brings true happiness.',
      pages: [
        'In a village near the river, a tall leafy mango tree offered shade to travelers and sweet yellow mangoes to children.',
        'Little Raju sat under the tree every summer afternoon. The tree dropped ripe mangoes gently into his hands.',
        'Raju did not eat them all alone. He called his sister and neighbors, sharing the sweet fruit equally.',
        'The generous mango tree whispered with the breeze: "When you share sweet gifts, everyone’s smile shines brighter!"'
      ]
    },
    {
      title: 'Little Ant and the Helpful Dove',
      icon: '🕊️',
      moral: 'No act of kindness is ever too small; friends help friends.',
      pages: [
        'A tiny ant was drinking water from a clear stream when a sudden ripple washed her in. She called for help!',
        'A gentle white dove sitting on a neem branch saw her. Quickly, the dove plucked a broad green leaf and dropped it into the water.',
        'The ant climbed onto the leaf and floated safely to dry ground, thanking the kind dove with all her heart.',
        'Days later, when a hunter aimed a net toward the sleeping dove, the little ant bit his foot! The startled hunter dropped the net and the dove flew safely away.'
      ]
    },
    {
      title: 'Raju Speaks the Truth',
      icon: '🍯',
      moral: 'Honesty brings courage and peaceful sleep.',
      pages: [
        'While helping Grandmother in the kitchen, Raju accidentally knocked over a small clay pot of honey. Crash!',
        'For a moment, he felt scared and thought of blaming the pet kitten sitting by the door.',
        'Raju took a deep breath. He walked up to Grandmother and said gently: "Grandmother, I knocked the pot while reaching. I am sorry."',
        'Grandmother hugged Raju warmly: "Honey can be replaced, but truthfulness is pure gold. I am very proud of you."'
      ]
    },
    {
      title: 'The Patient Little Tortoise',
      icon: '🐢',
      moral: 'Steady patience and perseverance win the day.',
      pages: [
        'A speedy hare was laughing at a slow little tortoise crawling peacefully along the dirt road.',
        '"Let us race to the giant banyan tree!" challenged the hare. In a flash of dust, the hare dashed ahead.',
        'Confident of winning, the hare rested under a cool tamarind tree and fell fast asleep.',
        'Step by step, without stopping or giving up, the patient tortoise crawled steadily forward. When the hare awoke, the smiling tortoise had reached the banyan tree!'
      ]
    },
    {
      title: 'Rhyme: Machhli Jal Ki Rani Hai',
      icon: '🐟',
      moral: 'Gentle appreciation of nature and water life.',
      pages: [
        'Machhli jal ki rani hai, jeevan uska paani hai! 🌊',
        'Haath lagao toh darr jaayegi, baahar nikaalo toh mar jaayegi! 🐟',
        'Paani mein daalo toh tair jaayegi, saara paani pee jaayegi! 💦'
      ]
    },
    {
      title: 'Rhyme: Chanda Mama Door Ke',
      icon: '🌙',
      moral: 'Bedtime lullaby celebrating family and love.',
      pages: [
        'Chanda mama door ke, pue pakaayein boor ke! 🌕',
        'Aap khaayein thaali mein, munne ko dein pyaali mein! 🥣',
        'Pyaali gayi toot, munna gaya rooth! Laayenge nayi pyaaliyan, baja baja ke taaliyan! 👏'
      ]
    }
  ];

  let currentStoryIdx = 0;
  let currentStoryPage = 0;

  function startStoriesRhymes(container) {
    container.innerHTML = `
      <div class="game-stage-container">
        <h3>📖 Moral Stories and Beloved Rhymes</h3>
        <p style="color: var(--text-secondary); margin-bottom: 14px;">Select a gentle story with a meaningful life lesson:</p>
        <div class="game-board">
          ${MORAL_STORIES.map((s, i) => `
            <div class="card" style="padding: 16px; cursor: pointer; border: 2px solid var(--pastel-peach-border); min-width: 190px;" onclick="LittleGames.openStory(${i})">
              <div style="font-size: 2.2rem; margin-bottom: 6px;">${s.icon}</div>
              <div style="font-weight: 700; font-size: 1rem; color: var(--text-primary);">${s.title}</div>
              <div style="font-size: 0.82rem; color: var(--pastel-peach-accent); margin-top: 4px;">${s.moral}</div>
            </div>
          `).join('')}
        </div>
        <div id="storyPlayer" style="display: none; background: var(--bg-warm-yellow); border-radius: var(--radius-lg); padding: 20px; border: 2px solid var(--warm-gold-border); margin: 20px 0;">
          <h4 id="storyTitle" style="color: var(--text-primary); margin-bottom: 10px;"></h4>
          <p id="storyContent" style="font-size: 1.2rem; line-height: 1.6; min-height: 90px; color: var(--text-primary);"></p>
          <div id="storyMoral" style="font-weight: 700; color: var(--pastel-green-text); margin: 10px 0;"></div>
          <div style="display: flex; justify-content: center; gap: 10px; margin-top: 14px;">
            <button class="btn btn-outline btn-sm" onclick="LittleGames.prevStoryPage()">Previous</button>
            <button class="btn btn-primary btn-sm" onclick="LittleGames.nextStoryPage()">Next ➔</button>
          </div>
        </div>
        <button class="btn btn-secondary" onclick="LittleGames.closeCurrentGame()">Back to Play Area</button>
      </div>
    `;
    speak('Choose a peaceful moral story or joyful rhyme.');
  }

  function openStory(idx) {
    currentStoryIdx = idx;
    currentStoryPage = 0;
    const player = document.getElementById('storyPlayer');
    if (player) player.style.display = 'block';
    renderStoryPage();
  }

  function renderStoryPage() {
    const s = MORAL_STORIES[currentStoryIdx];
    document.getElementById('storyTitle').textContent = `${s.icon} ${s.title} (Page ${currentStoryPage + 1} of ${s.pages.length})`;
    const text = s.pages[currentStoryPage];
    document.getElementById('storyContent').textContent = text;
    
    const moralEl = document.getElementById('storyMoral');
    if (currentStoryPage === s.pages.length - 1) {
      moralEl.textContent = `🌟 Life Lesson: ${s.moral}`;
      completeActivity(`story_${currentStoryIdx}`, 'story', `Listened to ${s.title}`, 2);
    } else {
      moralEl.textContent = '';
    }
    speak(text);
  }

  function nextStoryPage() {
    const s = MORAL_STORIES[currentStoryIdx];
    if (currentStoryPage < s.pages.length - 1) {
      currentStoryPage++;
      renderStoryPage();
    }
  }

  function prevStoryPage() {
    if (currentStoryPage > 0) {
      currentStoryPage--;
      renderStoryPage();
    }
  }

  // ----------------------------------------------------
  // 9. THALI EXPLORER (Healthy Food Builder)
  // ----------------------------------------------------
  const THALI_FOODS = [
    { name: 'Moong Dal', icon: '🍲', healthy: true, reason: 'Gentle protein helps little muscles grow!' },
    { name: 'Palak / Spinach', icon: '🥬', healthy: true, reason: 'Dark green leaves make bright healthy eyes!' },
    { name: 'Fresh Banana', icon: '🍌', healthy: true, reason: 'Natural energy to run and play!' },
    { name: 'Boiled Egg', icon: '🥚', healthy: true, reason: 'Complete wholesome protein!' },
    { name: 'Warm Milk', icon: '🥛', healthy: true, reason: 'Calcium for strong teeth and bones!' },
    { name: 'Sugar Soda', icon: '🥤', healthy: false, reason: 'Too much sugar makes teeth ache. Clean water is much better!' },
    { name: 'Greasy Fried Chips', icon: '🍟', healthy: false, reason: 'Roasted chana or fresh fruit gives much cleaner energy!' }
  ];

  let thaliPlate = [];

  function startFoodExplorer(container) {
    thaliPlate = [];
    container.innerHTML = `
      <div class="game-stage-container">
        <h3>🍲 Healthy Thali Builder</h3>
        <p style="color: var(--text-secondary); margin-bottom: 12px;">Tap healthy, nourishing foods to fill the plate!</p>
        <div style="background: var(--bg-warm-yellow); border: 2.5px solid var(--pastel-green-border); border-radius: var(--radius-full); width: 190px; height: 190px; margin: 12px auto; display: flex; align-items: center; justify-content: center; flex-direction: column;">
          <div style="font-size: 0.9rem; font-weight: 700; color: var(--pastel-green-text);">Thali Plate</div>
          <div id="thaliItems" style="font-size: 1.8rem; display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; max-width: 150px;">
            🍽️
          </div>
        </div>
        <div id="foodTip" style="min-height: 36px; font-weight: 600; color: var(--text-primary); margin: 10px 0;"></div>
        <div class="game-board">
          ${THALI_FOODS.map((f, i) => `
            <button class="game-bubble" style="width: auto; min-width: 100px; height: 75px; padding: 6px 12px; font-size: 1.1rem;" onclick="LittleGames.tapThaliFood(${i})">
              <span>${f.icon}</span>
              <span style="font-size: 0.8rem; font-weight: 600;">${f.name}</span>
            </button>
          `).join('')}
        </div>
        <button class="btn btn-secondary" onclick="LittleGames.closeCurrentGame()">Back to Play Area</button>
      </div>
    `;
    speak('Welcome to the Thali Builder! Tap nourishing food to fill the plate.');
  }

  function tapThaliFood(idx) {
    const f = THALI_FOODS[idx];
    const tip = document.getElementById('foodTip');
    const plate = document.getElementById('thaliItems');

    if (f.healthy) {
      if (!thaliPlate.includes(f.name)) {
        thaliPlate.push(f.name);
      }
      plate.innerHTML = thaliPlate.map(name => {
        const item = THALI_FOODS.find(x => x.name === name);
        return item ? item.icon : '🍲';
      }).join(' ');

      tip.innerHTML = `✅ <strong>${f.name}</strong> added! ${f.reason}`;
      speak(`${f.name}. ${f.reason}`);

      if (thaliPlate.length >= 3) {
        tip.innerHTML = '🌟 <strong>Super Nourishing Thali Complete!</strong> You built a balanced plate! ⭐';
        completeActivity('thali_builder', 'nutrition_game', 'Completed Balanced Thali', 2);
      }
    } else {
      tip.innerHTML = `⚠️ <strong>${f.name}</strong>: ${f.reason}`;
      speak(`${f.name} is not as healthy. ${f.reason}`);
    }
  }

  // Master Game Launch Dispatcher
  function launchGame(gameName) {
    const grid = document.getElementById('gamesGridOverview');
    if (grid) grid.style.display = 'none';

    const container = document.getElementById('gameActiveContainer');
    if (!container) return;

    if (gameName === 'alphabet') startAlphabetGame(container);
    else if (gameName === 'counting') startCountingGame(container);
    else if (gameName === 'shapes') startColorsShapes(container);
    else if (gameName === 'animals') startAnimalsGame(container);
    else if (gameName === 'maths') startMathsGame(container);
    else if (gameName === 'safety') startGoodBadTouchGame(container);
    else if (gameName === 'manners') startMannersGame(container);
    else if (gameName === 'stories') startStoriesRhymes(container);
    else if (gameName === 'food') startFoodExplorer(container);
  }

  return {
    launchGame,
    closeCurrentGame,
    tapLetter,
    tapMango,
    tapShape,
    tapAnimal,
    setMathLevel,
    answerMath,
    tapSafetyCard,
    tapManner,
    openStory,
    nextStoryPage,
    prevStoryPage,
    tapThaliFood,
    speak
  };
})();

window.LittleGames = LittleGames;
