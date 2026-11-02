// health_service.js - Reviewed pediatric sickness and caregiver health guide for children aged 3–5
// Tailored for community health, Anganwadi awareness, and evidence-based supportive home care.

const COMMON_SICKNESSES = [
  {
    id: 'cold_cough',
    name: 'Common Cold & Cough',
    hindiName: 'सर्दी और खांसी',
    icon: '🤧',
    category: 'Respiratory',
    keywords: ['cold', 'cough', 'runny nose', 'sneezing', 'throat', 'khansi', 'sardi', 'phlegm', 'congestion'],
    overview: 'A gentle viral infection of the nose and throat that is very common in children aged 3–5 as their immune system grows. Usually resolves on its own within 5 to 7 days with restful care.',
    homeCare: [
      'Give warm water, tulsi-ginger water, or light warm moong dal soup to soothe the throat.',
      'Provide gentle warm steam in the bathroom or from a bowl under strict parent supervision before bedtime.',
      'Slightly elevate the child’s head during sleep with an extra soft cloth under the mattress to ease night breathing.',
      'Use sterile saline nasal drops to clear a blocked nose before meals and sleep.'
    ],
    foodsToOffer: ['Warm moong dal khichdi with a drop of ghee', 'Steamed idli with mild sambar', 'Warm haldi (turmeric) milk at night', 'Stewed apple or soft banana'],
    foodsToAvoid: ['Chilled water or drinks straight from refrigerator', 'Ice creams and sugary commercial syrups', 'Deep-fried spicy pakoras'],
    redFlags: [
      'Fast or labored breathing (breathing much faster than usual while resting)',
      'Chest indrawing (skin pulling tightly inward between ribs when breathing in)',
      'High fever lasting more than 3 consecutive days',
      'Bluish color on lips, tongue, or fingertips'
    ]
  },
  {
    id: 'mild_fever',
    name: 'Mild Fever & Body Warmth',
    hindiName: 'हल्का बुखार',
    icon: '🌡️',
    category: 'General',
    keywords: ['fever', 'temperature', 'warm', 'hot', 'bukhar', 'feverish', 'chills'],
    overview: 'Fever is the body’s natural defense mechanism fighting off bugs. A mild fever (under 101°F / 38.3°C) in an active child who is drinking liquids is generally safe and temporary.',
    homeCare: [
      'Dress the child in single-layer, loose, breathable pure cotton clothes.',
      'Sponge bath with normal lukewarm tap water on the forehead, neck, and underarms. Never use ice or icy water.',
      'Offer frequent sips of liquids: coconut water, lemon water with a pinch of salt, thin buttermilk, or rice water.',
      'Ensure the room is airy and well-ventilated with a gentle fan (not blowing directly onto child’s face).'
    ],
    foodsToOffer: ['Rice kanji (boiled rice water) with a pinch of salt', 'Curd rice with soft mashed grains', 'Soft sweet fruits like papaya and sweet lime', 'Moong dal soup'],
    foodsToAvoid: ['Heavy oily foods and spicy gravies', 'Packaged junk snacks', 'Excessive force-feeding of heavy meals'],
    redFlags: [
      'Temperature above 102.5°F (39.2°C) or not reducing with basic supportive care',
      'Seizures, body stiffness, or involuntary jerking movements',
      'Child is unusually lethargic, unresponsive, or difficult to wake up',
      'Complete refusal of all liquids for more than 6 hours'
    ]
  },
  {
    id: 'diarrhea_loose_motions',
    name: 'Diarrhea & Loose Motions',
    hindiName: 'दस्त और पानी की कमी',
    icon: '💧',
    category: 'Digestive',
    keywords: ['diarrhea', 'loose motion', 'watery stool', 'stomach loose', 'dast', 'potty', 'ors', 'dehydration'],
    overview: 'Loose watery bowel movements can cause quick loss of vital body fluids and salts in 3–5 year olds. The single most important home action is immediate rehydration with ORS.',
    homeCare: [
      'Start Oral Rehydration Solution (ORS) immediately: 1 packet WHO ORS mixed in 1 liter clean boiled-and-cooled drinking water.',
      'Give small sips (half to one cup) after every loose motion. Offer with a clean spoon or cup.',
      'Do NOT starve the child. Continue normal gentle feeding to preserve intestinal strength and energy.',
      'Wash hands thoroughly with soap and water after changing diapers and before feeding.'
    ],
    foodsToOffer: ['Rice kanji (चावल का माड़) with a pinch of salt', 'Fresh homemade dahi (curd) and buttermilk (natural gut probiotics)', 'Ripe mashed banana (rich in potassium)', 'Boiled and mashed potatoes'],
    foodsToAvoid: ['Packaged sodas, colas, and boxed juices (high sugar pulls more water into intestines)', 'Oily and spicy curries', 'Stale or unwashed raw street foods'],
    redFlags: [
      'Blood or mucus visible in the stool',
      'Sunken eyes, very dry mouth, and crying with NO tears',
      'No urination or dry diaper for 6 or more consecutive hours',
      'Repeated continuous vomiting preventing even a spoonful of liquid from staying down'
    ]
  },
  {
    id: 'stomach_ache',
    name: 'Stomach Ache & Gas',
    hindiName: 'पेट दर्द और गैस',
    icon: '🫄',
    category: 'Digestive',
    keywords: ['stomach', 'tummy', 'belly', 'ache', 'gas', 'pet dard', 'cramps', 'bloating'],
    overview: 'Occasional tummy aches in young children are often caused by trapped gas, mild constipation, or eating too fast. Gentle warmth and home comfort remedies work wonders.',
    homeCare: [
      'Apply a warm cloth compress gently over the child’s tummy.',
      'Make a mild paste of a pinch of hing (asafoetida) in lukewarm water and rub gently in clockwise circles around the navel.',
      'Offer a small cup of warm water boiled with a few ajwain (carom) seeds and cooled.',
      'Encourage the child to lie down on their tummy or gently hug knees to chest to release trapped gas bubbles.'
    ],
    foodsToOffer: ['Soft moong dal khichdi', 'Curd with a pinch of roasted cumin (jeera)', 'Papaya slices to support easy digestion', 'Warm water sips throughout the day'],
    foodsToAvoid: ['Packaged potato chips and fried snacks', 'Gassy carbonated drinks', 'Heavy fried sweets'],
    redFlags: [
      'Severe, continuous, sharp pain that makes child scream or double over for more than 2 hours',
      'Swollen, hard, or tender abdomen that hurts intensely when lightly touched',
      'Vomiting green or dark yellowish bile liquid',
      'High fever accompanying sudden intense abdominal pain'
    ]
  },
  {
    id: 'heat_rash',
    name: 'Heat Rash & Prickly Heat',
    hindiName: 'घमौरियां और पसीने के दाने',
    icon: '☀️',
    category: 'Skin',
    keywords: ['heat rash', 'prickly heat', 'itching', 'ghamori', 'sweat rash', 'red bumps', 'skin rash'],
    overview: 'During hot and humid Indian weather, toddlers’ sweat ducts can easily become clogged, causing tiny itchy red bumps across the neck, back, chest, and diaper area.',
    homeCare: [
      'Give daily baths in normal room-temperature water with gentle soap. Pat skin dry softly with a clean cotton towel.',
      'Keep the child in single-layer, loose-fitting, light-colored pure cotton clothing.',
      'Keep the child’s resting area cool, shaded, and well-aerated.',
      'Apply thin calamine lotion or cool sandalwood (chandan) paste to soothe intense itching. Avoid greasy thick oil ointments that block pores.'
    ],
    foodsToOffer: ['Fresh cool coconut water (नारियल पानी)', 'Sliced fresh watermelon and cucumber', 'Homemade fresh nimbu pani (lemonade) with a pinch of rock salt', 'Light buttermilk (chaas)'],
    foodsToAvoid: ['Heavily spiced curries and excessive oily gravies', 'Hot and sun-exposed street food'],
    redFlags: [
      'Rash develops yellow pus-filled blisters or starts weeping liquid',
      'The skin becomes very swollen, hot to touch, and painful',
      'Fever develops along with the skin eruption'
    ]
  },
  {
    id: 'teething_mouth',
    name: 'Teething Discomfort & Mouth Sores',
    hindiName: 'दांत निकलना और मुंह में छाले',
    icon: '🦷',
    category: 'Oral',
    keywords: ['teething', 'teeth', 'drool', 'gum', 'mouth', 'chhale', 'dant', 'sores'],
    overview: 'As back molars come in around ages 3, or during seasonal mouth irritations, children drool and chew on hard objects. Gentle gum massage and cool foods bring fast relief.',
    homeCare: [
      'Wash your hands thoroughly and gently massage the child’s swollen gums with a clean finger.',
      'Offer a cool, thick, peeled carrot or cucumber stick to gnaw on under direct parent supervision.',
      'Wipe drool from chin and cheeks regularly with a soft cloth to avoid saliva rashes.',
      'Offer cool, soothing foods that don’t require intense chewing.'
    ],
    foodsToOffer: ['Cool homemade curd (dahi)', 'Mashed chilled banana or papaya', 'Soft, lukewarm daliya porridge', 'Fruit purée'],
    foodsToAvoid: ['Hard crunchy biscuits that scrape sensitive gums', 'Salty, sour, or spicy gravies that sting sores'],
    redFlags: [
      'Large painful ulcers spreading throughout the mouth preventing all swallowing',
      'High fever with intense ear pulling or crying whenever lying down',
      'Swelling on jaw or cheek'
    ]
  },
  {
    id: 'mosquito_prevention',
    name: 'Mosquito Bites & Dengue/Malaria Safety',
    hindiName: 'मच्छर के काटने और डेंगू से बचाव',
    icon: '🦟',
    category: 'Prevention',
    keywords: ['mosquito', 'bite', 'dengue', 'malaria', 'machhar', 'fever', 'prevention', 'protection'],
    overview: 'Mosquito-borne illnesses like Dengue, Chikungunya, and Malaria are prevalent in many communities. Prevention of bites is the best health shield for children aged 3–5.',
    homeCare: [
      'Dress the child in full-length cotton pajamas and full-sleeve shirts, especially in morning and dusk hours.',
      'Use bed nets while child sleeps. Ensure window mesh or screens are intact.',
      'Empty any stagnant water around the home: flower pots, coconut shells, tires, and cooler trays where mosquitoes breed.',
      'Apply ice wrapped in clean cloth or coconut oil over bite bumps to reduce itching and avoid skin scratching.'
    ],
    foodsToOffer: ['Nutrient-dense home meals with lentils and rice', 'Citrus fruits (guava, orange, amla) rich in Vitamin C', 'Clean boiled drinking water'],
    foodsToAvoid: ['Exposed street-cut fruits visited by flies and insects'],
    redFlags: [
      'Sudden high fever accompanied by severe headache, pain behind eyes, or bone/joint aches',
      'Tiny pinpoint red or purple spots appearing under the skin (petechiae)',
      'Bleeding from gums or nose',
      'Extreme weakness and persistent vomiting'
    ]
  },
  {
    id: 'appetite_loss',
    name: 'Loss of Appetite & Picky Eating',
    hindiName: 'भूख न लगना और खाने में आनाकानी',
    icon: '🥣',
    category: 'Nutrition',
    keywords: ['appetite', 'not eating', 'refusing food', 'picky', 'bhookh', 'eating', 'weight', 'slow eating'],
    overview: 'Growth slows naturally between ages 3 and 5 compared to infancy, leading to smaller appetite. Forcing food creates anxiety; offering calm, colorful mini-meals helps children eat happily.',
    homeCare: [
      'Follow Division of Responsibility: You choose WHAT and WHEN food is served; the child decides HOW MUCH to eat. Never force, bribe, or scold.',
      'Offer 4 to 5 small mini-meals across the day instead of a huge intimidating plate.',
      'Encourage 30 to 60 minutes of active running and outdoor play to naturally stimulate healthy appetite.',
      'Involve the child in gentle kitchen tasks like washing peas or choosing a vegetable.'
    ],
    foodsToOffer: ['Crispy roasted chana (bhuna chana)', 'Colourful fruit slices (mango, banana, apple)', 'Small rolled roti with mashed potato or paneer', 'Warm vegetable khichdi'],
    foodsToAvoid: ['Snacking on commercial biscuits or sugary tea right before lunch or dinner', 'Filling stomach with excess plain water right before mealtime'],
    redFlags: [
      'Continuous unexplained weight loss over several weeks',
      'Extreme paleness in lower eyelids, tongue, or palms (indicative of anemia)',
      'Child is constantly sleepy, sluggish, and has zero interest in playing'
    ]
  }
];

function getSicknessList(searchQuery = '') {
  if (!searchQuery || !searchQuery.trim()) {
    return COMMON_SICKNESSES;
  }
  const q = searchQuery.trim().toLowerCase();
  return COMMON_SICKNESSES.filter(item => {
    return (
      item.name.toLowerCase().includes(q) ||
      (item.hindiName && item.hindiName.includes(q)) ||
      item.category.toLowerCase().includes(q) ||
      item.keywords.some(k => k.includes(q)) ||
      item.overview.toLowerCase().includes(q)
    );
  });
}

function getSicknessById(id) {
  return COMMON_SICKNESSES.find(item => item.id === id) || null;
}

module.exports = {
  COMMON_SICKNESSES,
  getSicknessList,
  getSicknessById
};
