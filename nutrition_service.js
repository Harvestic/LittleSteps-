// nutrition_service.js - Child nutrition tracking, food variety analysis, and guidance
const crypto = require('node:crypto');
const { db } = require('./db');

// Indian localized food items database with nutrient categories
const COMMON_FOODS = [
  // Grains & Energy
  { id: 'roti', name: 'Roti / Chapati', category: 'energy', icon: '🫓', tip: 'Whole wheat provides steady energy and digestion support.' },
  { id: 'rice', name: 'Steamed Rice', category: 'energy', icon: '🍚', tip: 'Easily digestible staple grain.' },
  { id: 'khichdi', name: 'Dal Khichdi', category: 'energy_protein', icon: '🍲', tip: 'Classic complete protein meal combining grain and pulse.' },
  { id: 'poha', name: 'Poha (Flattened Rice)', category: 'energy', icon: '🥣', tip: 'Rich in iron when cooked with peanuts and lemon.' },
  { id: 'daliya', name: 'Daliya (Broken Wheat Porridge)', category: 'energy', icon: '🥣', tip: 'High fiber, warm and filling for young stomachs.' },
  { id: 'idli_dosa', name: 'Idli / Dosa', category: 'energy_protein', icon: '🥞', tip: 'Fermented batter aids gut health and micronutrient uptake.' },
  
  // Pulses & Proteins (Growth & Repair)
  { id: 'moong_dal', name: 'Yellow Moong Dal', category: 'protein', icon: '🫘', tip: 'Lightest dal for toddlers, gentle on little tummies.' },
  { id: 'toor_dal', name: 'Toor / Arhar Dal', category: 'protein', icon: '🫘', tip: 'Rich in plant protein and folate.' },
  { id: 'chana_chickpeas', name: 'Chana / Chickpeas / Kala Chana', category: 'protein', icon: '🧆', tip: 'Excellent source of iron and dietary fiber.' },
  { id: 'rajma', name: 'Rajma / Beans', category: 'protein', icon: '🫘', tip: 'Hearty protein and complex carbs.' },
  { id: 'egg', name: 'Boiled Egg / Omelette', category: 'protein', icon: '🥚', tip: 'High quality complete protein, choline and vitamins.' },
  { id: 'soy_chunks', name: 'Nutri Soy Chunks', category: 'protein', icon: '🧆', tip: 'Very affordable plant protein for curries and pulao.' },
  
  // Vegetables (Vitamins, Minerals, Immunity)
  { id: 'palak_methi', name: 'Palak / Methi / Green Leafy Veg', category: 'vitamins', icon: '🥬', tip: 'Iron and folate powerhouse. Add a squeeze of lemon to help absorption.' },
  { id: 'drumstick_leaves', name: 'Moringa / Drumstick Leaves', category: 'vitamins', icon: '🌿', tip: 'Free or ultra-cheap local superfood rich in vitamin A, C and iron.' },
  { id: 'gajar_carrot', name: 'Carrots / Gajar', category: 'vitamins', icon: '🥕', tip: 'Beta-carotene for clear eyesight and healthy skin.' },
  { id: 'kaddu_pumpkin', name: 'Kaddu / Pumpkin / Squash', category: 'vitamins', icon: '🎃', tip: 'Sweet, soft to chew, and rich in immune-boosting vitamin A.' },
  { id: 'lauki_gourd', name: 'Lauki / Bottle Gourd / Tori', category: 'vitamins', icon: '🥒', tip: 'Hydrating, easy to digest in mild curries.' },
  { id: 'aloo_potato', name: 'Aloo / Potato / Sweet Potato', category: 'energy', icon: '🥔', tip: 'Calorie dense and filling for active growing kids.' },
  { id: 'tamatar', name: 'Tomato Curry / Soup', category: 'vitamins', icon: '🍅', tip: 'Vitamin C helps absorb iron from dals and rotis.' },

  // Fruits
  { id: 'banana', name: 'Banana / Kela', category: 'vitamins', icon: '🍌', tip: 'Affordable year-round fruit with potassium and instant clean energy.' },
  { id: 'guava', name: 'Guava / Amrood', category: 'vitamins', icon: '🍈', tip: 'Contains 4x more Vitamin C than oranges, budget friendly.' },
  { id: 'papaya', name: 'Papaya / Papita', category: 'vitamins', icon: '🥭', tip: 'Supports digestion and provides bright Vitamin A.' },
  { id: 'santra', name: 'Orange / Santra / Mausambi', category: 'vitamins', icon: '🍊', tip: 'Juicy hydration and immune protection.' },
  { id: 'apple', name: 'Apple / Seasonal Fruit', category: 'vitamins', icon: '🍎', tip: 'Crisp fiber snack.' },

  // Dairy (Calcium & Healthy Fats)
  { id: 'milk', name: 'Warm Milk (Cow/Buffalo)', category: 'dairy', icon: '🥛', tip: 'Calcium for growing teeth and bones.' },
  { id: 'curd_dahi', name: 'Curd / Dahi / Chaas', category: 'dairy', icon: '🥣', tip: 'Probiotic food cooling the stomach and providing calcium.' },
  { id: 'paneer', name: 'Paneer / Cottage Cheese', category: 'dairy_protein', icon: '🧀', tip: 'Dense vegetarian protein and calcium.' },

  // Healthy Budget Snacks
  { id: 'roasted_chana', name: 'Bhuna Chana / Roasted Gram', category: 'protein', icon: '🥜', tip: 'Crunchy snack packed with iron and protein, zero cooking needed.' },
  { id: 'chikki_gur', name: 'Peanut Chikki / Jaggery', category: 'energy', icon: '🍯', tip: 'Jaggery provides non-refined energy with natural iron.' },
  { id: 'murmura', name: 'Murmura / Puffed Rice Bhel', category: 'energy', icon: '🍿', tip: 'Light snack, toss with peanuts and chopped tomatoes.' },
  { id: 'sprouted_moong', name: 'Sprouted Moong / Sprouts', category: 'protein_vitamins', icon: '🌱', tip: 'Sprouting at home multiplies vitamins B & C at no extra cost.' }
];

// Evidence-based affordable local nutrition guidance
const NUTRITION_GUIDANCE = [
  {
    title: 'The Golden Lemon Squeeze for Strong Blood',
    summary: 'Always squeeze half a lemon over dal, spinach, or poha right before feeding.',
    why: 'Iron from plant sources like dal and green leaves needs Vitamin C to be absorbed well by a child’s body. Lemon provides affordable instant Vitamin C, helping prevent childhood anemia.',
    badge: 'Iron Booster'
  },
  {
    title: 'Home Sprouting: Free Nutrition Multiplier',
    summary: 'Soak green moong overnight, drain, and keep wrapped in a clean moist cloth for 24 hours.',
    why: 'Sprouting at home doubles Vitamin C, makes proteins much easier to digest, and prevents gas in children aged 3–5. Cost is practically zero extra rupees!',
    badge: 'Budget Superfood'
  },
  {
    title: 'Drumstick (Moringa) Leaves in Everyday Dal',
    summary: 'Toss a handful of washed drumstick leaves into boiling dal or roti dough.',
    why: 'Moringa trees grow freely across India. Their leaves are naturally packed with Vitamin A, Calcium, and Iron, making it an incredible nutritional boost for children.',
    badge: 'Local Gold'
  },
  {
    title: 'Calm Mealtime Philosophy: Division of Responsibility',
    summary: 'Parents decide WHAT and WHEN foods are offered; child decides WHETHER and HOW MUCH to eat.',
    why: 'Forcing or bribing creates food battles and anxiety. Offering familiar favorites alongside one vegetable fosters lifelong adventurous, joyful eating.',
    badge: 'Mindful Eating'
  },
  {
    title: 'Safe Hydration without Pressure',
    summary: 'Offer small sips of boiled or filtered water in a friendly cup throughout the day.',
    why: 'Children aged 3–5 have small stomachs. Drinking huge glasses right before meals can fill them up on water instead of nutrient-dense food. Offer water between meals.',
    badge: 'Gentle Water Care'
  }
];

// Meal logging functions with parent authorization checks
function logMeal(parentId, data) {
  const { childId, mealDate, mealType, foodsOffered, foodsEaten, notes } = data;

  // Authorization check: Verify child belongs to parent
  const child = db.prepare('SELECT id FROM children WHERE id = ? AND parent_id = ?').get(childId, parentId);
  if (!child) {
    throw new Error('Unauthorized child profile access.');
  }

  const id = crypto.randomUUID();
  const now = Date.now();
  const offeredJson = JSON.stringify(foodsOffered || []);
  const eatenJson = JSON.stringify(foodsEaten || []);

  const stmt = db.prepare(`
    INSERT INTO nutrition_logs (id, parent_id, child_id, meal_date, meal_type, foods_offered_json, foods_eaten_json, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, parentId, childId, mealDate, mealType, offeredJson, eatenJson, notes || '', now, now);

  return { id, parentId, childId, mealDate, mealType, foodsOffered, foodsEaten, notes, createdAt: now };
}

function updateMeal(parentId, mealId, data) {
  const existing = db.prepare('SELECT * FROM nutrition_logs WHERE id = ? AND parent_id = ?').get(mealId, parentId);
  if (!existing) {
    throw new Error('Meal record not found or unauthorized.');
  }

  const now = Date.now();
  const mealDate = data.mealDate || existing.meal_date;
  const mealType = data.mealType || existing.meal_type;
  const offeredJson = data.foodsOffered ? JSON.stringify(data.foodsOffered) : existing.foods_offered_json;
  const eatenJson = data.foodsEaten ? JSON.stringify(data.foodsEaten) : existing.foods_eaten_json;
  const notes = data.notes !== undefined ? data.notes : existing.notes;

  const stmt = db.prepare(`
    UPDATE nutrition_logs
    SET meal_date = ?, meal_type = ?, foods_offered_json = ?, foods_eaten_json = ?, notes = ?, updated_at = ?
    WHERE id = ? AND parent_id = ?
  `);

  stmt.run(mealDate, mealType, offeredJson, eatenJson, notes, now, mealId, parentId);

  return { id: mealId, parentId, mealDate, mealType, notes, updatedAt: now };
}

function deleteMeal(parentId, mealId) {
  const stmt = db.prepare('DELETE FROM nutrition_logs WHERE id = ? AND parent_id = ?');
  const result = stmt.run(mealId, parentId);
  if (result.changes === 0) {
    throw new Error('Meal record not found or unauthorized.');
  }
  return { success: true, deletedId: mealId };
}

function getMeals(parentId, childId, startDate, endDate) {
  // Authorization check
  const child = db.prepare('SELECT id FROM children WHERE id = ? AND parent_id = ?').get(childId, parentId);
  if (!child) {
    throw new Error('Unauthorized child profile access.');
  }

  let query = 'SELECT * FROM nutrition_logs WHERE parent_id = ? AND child_id = ?';
  const params = [parentId, childId];

  if (startDate) {
    query += ' AND meal_date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND meal_date <= ?';
    params.push(endDate);
  }

  query += ' ORDER BY meal_date DESC, created_at DESC';

  const rows = db.prepare(query).all(...params);
  return rows.map(r => ({
    id: r.id,
    childId: r.child_id,
    mealDate: r.meal_date,
    mealType: r.meal_type,
    foodsOffered: JSON.parse(r.foods_offered_json || '[]'),
    foodsEaten: JSON.parse(r.foods_eaten_json || '[]'),
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }));
}

// Water Intake Log
function logWater(parentId, data) {
  const { childId, logDate, glassesCount, notes } = data;
  const child = db.prepare('SELECT id FROM children WHERE id = ? AND parent_id = ?').get(childId, parentId);
  if (!child) {
    throw new Error('Unauthorized child profile access.');
  }

  const existing = db.prepare('SELECT * FROM water_logs WHERE parent_id = ? AND child_id = ? AND log_date = ?').get(parentId, childId, logDate);
  const now = Date.now();

  if (existing) {
    const stmt = db.prepare(`
      UPDATE water_logs
      SET glasses_count = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(glassesCount, notes || existing.notes, now, existing.id);
    return { id: existing.id, parentId, childId, logDate, glassesCount, notes, updatedAt: now };
  } else {
    const id = crypto.randomUUID();
    const stmt = db.prepare(`
      INSERT INTO water_logs (id, parent_id, child_id, log_date, glasses_count, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, parentId, childId, logDate, glassesCount, notes || '', now, now);
    return { id, parentId, childId, logDate, glassesCount, notes, createdAt: now };
  }
}

function getWaterLogs(parentId, childId, startDate, endDate) {
  const child = db.prepare('SELECT id FROM children WHERE id = ? AND parent_id = ?').get(childId, parentId);
  if (!child) throw new Error('Unauthorized child profile access.');

  let query = 'SELECT * FROM water_logs WHERE parent_id = ? AND child_id = ?';
  const params = [parentId, childId];

  if (startDate) {
    query += ' AND log_date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND log_date <= ?';
    params.push(endDate);
  }

  query += ' ORDER BY log_date DESC';
  return db.prepare(query).all(...params).map(r => ({
    id: r.id,
    childId: r.child_id,
    logDate: r.log_date,
    glassesCount: r.glasses_count,
    notes: r.notes
  }));
}

// Weekly Food Variety Analysis
function getWeeklySummary(parentId, childId, targetDateStr) {
  const child = db.prepare('SELECT id, nickname, age FROM children WHERE id = ? AND parent_id = ?').get(childId, parentId);
  if (!child) throw new Error('Unauthorized child profile access.');

  // Calculate 7-day window ending at targetDateStr
  const [y, m, d] = targetDateStr.split('-').map(Number);
  const endDateObj = new Date(Date.UTC(y, m - 1, d));
  const startDateObj = new Date(endDateObj.getTime() - (6 * 86400000));
  
  const startStr = `${startDateObj.getUTCFullYear()}-${String(startDateObj.getUTCMonth() + 1).padStart(2, '0')}-${String(startDateObj.getUTCDate()).padStart(2, '0')}`;
  const endStr = targetDateStr;

  const meals = getMeals(parentId, childId, startStr, endStr);
  const waterLogs = getWaterLogs(parentId, childId, startStr, endStr);

  const groupCounts = {
    energy: 0,
    protein: 0,
    vitamins: 0,
    dairy: 0,
    hydration_days: waterLogs.filter(w => w.glassesCount > 0).length
  };

  const foodIdSet = new Set();

  meals.forEach(meal => {
    meal.foodsEaten.forEach(foodName => {
      // Find food in dictionary or deduce
      const match = COMMON_FOODS.find(f => f.name.toLowerCase() === foodName.toLowerCase() || f.id.toLowerCase() === foodName.toLowerCase());
      if (match) {
        foodIdSet.add(match.id);
        if (match.category.includes('energy')) groupCounts.energy++;
        if (match.category.includes('protein')) groupCounts.protein++;
        if (match.category.includes('vitamins')) groupCounts.vitamins++;
        if (match.category.includes('dairy')) groupCounts.dairy++;
      } else {
        foodIdSet.add(foodName);
        groupCounts.energy++;
      }
    });
  });

  // Calculate gentle variety score (1 to 5 stars)
  const categoriesHit = [
    groupCounts.energy > 0,
    groupCounts.protein > 0,
    groupCounts.vitamins > 0,
    groupCounts.dairy > 0,
    groupCounts.hydration_days > 0
  ].filter(Boolean).length;

  const encouragingFeedback = [];
  if (groupCounts.protein >= 3) {
    encouragingFeedback.push('Great job offering growing proteins like dal, eggs, or chana this week!');
  } else {
    encouragingFeedback.push('Tip: An extra bowl of moong dal, roasted chana, or boiled egg gives little muscles a boost.');
  }

  if (groupCounts.vitamins >= 3) {
    encouragingFeedback.push('Wonderful variety of colorful vegetables and fruits logged!');
  } else {
    encouragingFeedback.push('Gentle idea: Try tossing a handful of drumstick leaves or a banana into meals.');
  }

  return {
    childNickname: child.nickname,
    childAge: child.age,
    window: { startStr, endStr },
    totalMealsLogged: meals.length,
    distinctFoodsCount: foodIdSet.size,
    foodGroupCounts: groupCounts,
    categoriesRepresented: categoriesHit,
    encouragingFeedback,
    disclaimer: 'Notice: This summary tracks family food exposure and healthy routines. It is NOT a clinical diagnosis, growth assessment, or medical prescription. For medical concerns or severe undernourishment, consult your local Anganwadi worker or doctor.'
  };
}

module.exports = {
  COMMON_FOODS,
  NUTRITION_GUIDANCE,
  logMeal,
  updateMeal,
  deleteMeal,
  getMeals,
  logWater,
  getWaterLogs,
  getWeeklySummary
};
