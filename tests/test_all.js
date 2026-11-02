// tests/test_all.js - Automated integration test suite for LittleSteps
const assert = require('node:assert');
const { db } = require('../db');
const {
  hashPassword,
  verifyPassword,
  createSession,
  getSessionParent,
  destroySession
} = require('../auth');
const {
  getISTDate,
  getPreviousISTDate,
  getRewardStatus,
  claimDailyReward
} = require('../reward_service');
const {
  logMeal,
  updateMeal,
  deleteMeal,
  getMeals,
  logWater,
  getWaterLogs,
  getWeeklySummary
} = require('../nutrition_service');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(err);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(err);
  }
}

console.log('--- Starting LittleSteps Test Suite ---\n');

// 1. Password Hashing & Verification
runTest('Password hashing produces valid salt and scrypt hash', () => {
  const { hash, salt } = hashPassword('SecretPass123');
  assert(hash.length > 30, 'Hash should be long');
  assert(salt.length > 10, 'Salt should be generated');

  const correct = verifyPassword('SecretPass123', hash, salt);
  assert.strictEqual(correct, true, 'Correct password must verify');

  const incorrect = verifyPassword('WrongPassword', hash, salt);
  assert.strictEqual(incorrect, false, 'Wrong password must fail');
});

// 2. IST Date Calculations
runTest('India Standard Time (Asia/Kolkata) date calculation is consistent', () => {
  const todayIST = getISTDate();
  assert(/^\d{4}-\d{2}-\d{2}$/.test(todayIST), 'Date should match YYYY-MM-DD');

  const prevIST = getPreviousISTDate(todayIST);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(prevIST), 'Previous date should match YYYY-MM-DD');
  assert(prevIST < todayIST, 'Previous day must be earlier than today');
});

// Setup Test Parents with unique emails
const parentA_Id = 'test_parent_a_' + Date.now();
const parentB_Id = 'test_parent_b_' + Date.now();
const emailA = 'sunita_' + Date.now() + '@test.com';
const emailB = 'ramesh_' + Date.now() + '@test.com';
const now = Date.now();

db.prepare(`
  INSERT INTO parents (id, name, email, password_hash, salt, consent_given, created_at, updated_at)
  VALUES (?, 'Sunita Sharma', ?, 'dummyhash', 'dummysalt', 1, ?, ?)
`).run(parentA_Id, emailA, now, now);

db.prepare(`
  INSERT INTO parents (id, name, email, password_hash, salt, consent_given, created_at, updated_at)
  VALUES (?, 'Ramesh Patel', ?, 'dummyhash', 'dummysalt', 1, ?, ?)
`).run(parentB_Id, emailB, now, now);

// 3. Child Profiles & Isolation
let childA_Id = null;
let childB_Id = null;

runTest('Create child profile for Parent A', () => {
  childA_Id = 'child_a_' + Date.now();
  db.prepare(`
    INSERT INTO children (id, parent_id, nickname, age, created_at, updated_at)
    VALUES (?, ?, 'Aarav', 4, ?, ?)
  `).run(childA_Id, parentA_Id, now, now);

  const row = db.prepare('SELECT * FROM children WHERE id = ?').get(childA_Id);
  assert.strictEqual(row.nickname, 'Aarav');
  assert.strictEqual(row.age, 4);
});

runTest('Create child profile for Parent B', () => {
  childB_Id = 'child_b_' + Date.now();
  db.prepare(`
    INSERT INTO children (id, parent_id, nickname, age, created_at, updated_at)
    VALUES (?, ?, 'Pooja', 3, ?, ?)
  `).run(childB_Id, parentB_Id, now, now);

  const row = db.prepare('SELECT * FROM children WHERE id = ?').get(childB_Id);
  assert.strictEqual(row.nickname, 'Pooja');
});

runTest('Strict Data Isolation: Parent A cannot access Parent B child data', () => {
  assert.throws(() => {
    // Parent A tries to fetch Parent B's child meals
    getMeals(parentA_Id, childB_Id);
  }, /Unauthorized child profile access/);

  assert.throws(() => {
    // Parent A tries to log meal for Parent B's child
    logMeal(parentA_Id, {
      childId: childB_Id,
      mealDate: getISTDate(),
      mealType: 'lunch',
      foodsOffered: ['Roti'],
      foodsEaten: ['Roti']
    });
  }, /Unauthorized child profile access/);
});

// 4. Meal Logging & CRUD
let mealId = null;
runTest('Log a meal for Child A', () => {
  const meal = logMeal(parentA_Id, {
    childId: childA_Id,
    mealDate: getISTDate(),
    mealType: 'lunch',
    foodsOffered: ['Roti / Chapati', 'Yellow Moong Dal', 'Palak / Methi / Green Leafy Veg'],
    foodsEaten: ['Roti / Chapati', 'Yellow Moong Dal'],
    notes: 'Aarav liked the dal with lemon'
  });

  assert(meal.id, 'Meal ID returned');
  mealId = meal.id;

  const meals = getMeals(parentA_Id, childA_Id);
  assert.strictEqual(meals.length, 1);
  assert.strictEqual(meals[0].mealType, 'lunch');
  assert.deepStrictEqual(meals[0].foodsEaten, ['Roti / Chapati', 'Yellow Moong Dal']);
});

runTest('Update meal record', () => {
  const updated = updateMeal(parentA_Id, mealId, {
    notes: 'Updated note: also drank buttermilk',
    foodsEaten: ['Roti / Chapati', 'Yellow Moong Dal', 'Palak / Methi / Green Leafy Veg']
  });

  const meals = getMeals(parentA_Id, childA_Id);
  assert.strictEqual(meals[0].notes, 'Updated note: also drank buttermilk');
  assert.strictEqual(meals[0].foodsEaten.length, 3);
});

// 5. Water Intake Logging
runTest('Log and increment water intake', () => {
  const todayIST = getISTDate();
  logWater(parentA_Id, {
    childId: childA_Id,
    logDate: todayIST,
    glassesCount: 3,
    notes: 'After playing outside'
  });

  let logs = getWaterLogs(parentA_Id, childA_Id);
  assert.strictEqual(logs.length, 1);
  assert.strictEqual(logs[0].glassesCount, 3);

  // Update
  logWater(parentA_Id, {
    childId: childA_Id,
    logDate: todayIST,
    glassesCount: 4
  });

  logs = getWaterLogs(parentA_Id, childA_Id);
  assert.strictEqual(logs.length, 1);
  assert.strictEqual(logs[0].glassesCount, 4);
});

// 6. Weekly Food Variety Summary
runTest('Generate weekly food variety summary with non-clinical disclaimer', () => {
  const todayIST = getISTDate();
  const summary = getWeeklySummary(parentA_Id, childA_Id, todayIST);
  assert.strictEqual(summary.childNickname, 'Aarav');
  assert(summary.totalMealsLogged >= 1);
  assert(summary.foodGroupCounts.energy >= 1);
  assert(summary.foodGroupCounts.protein >= 1);
  assert(summary.disclaimer.includes('NOT a clinical diagnosis'));
});

// 7. Daily Login Rewards in IST
runTest('Claim daily login reward for Day 1', () => {
  const statusBefore = getRewardStatus(parentA_Id);
  assert.strictEqual(statusBefore.alreadyClaimedToday, false);

  const claimRes = claimDailyReward(parentA_Id);
  assert.strictEqual(claimRes.success, true);
  assert.strictEqual(claimRes.streak, 1);
  assert.strictEqual(claimRes.rewardAwarded.stars, 1);
  assert.strictEqual(claimRes.totalStars, 1);

  const statusAfter = getRewardStatus(parentA_Id);
  assert.strictEqual(statusAfter.alreadyClaimedToday, true);
  assert.strictEqual(statusAfter.consecutiveStreak, 1);
});

runTest('Duplicate Claim Prevention: Cannot claim twice on same IST calendar day', () => {
  const duplicateClaim = claimDailyReward(parentA_Id);
  assert.strictEqual(duplicateClaim.success, false);
  assert.strictEqual(duplicateClaim.alreadyClaimed, true);
  assert(duplicateClaim.message.includes('already claimed'));
});

runTest('Streak Calculation: Advancing streak on consecutive days', () => {
  // Ensure reward_status row exists
  getRewardStatus(parentB_Id);

  // Simulate parent having claimed yesterday
  const todayIST = getISTDate();
  const yesterdayIST = getPreviousISTDate(todayIST);

  db.prepare(`
    UPDATE reward_status
    SET last_claim_date_ist = ?, consecutive_streak = 2, total_stars = 3
    WHERE parent_id = ?
  `).run(yesterdayIST, parentB_Id);

  const status = getRewardStatus(parentB_Id);
  assert.strictEqual(status.alreadyClaimedToday, false);
  assert.strictEqual(status.projectedStreak, 3);

  const claim = claimDailyReward(parentB_Id);
  assert.strictEqual(claim.success, true);
  assert.strictEqual(claim.streak, 3);
  assert(claim.newBadgeAwarded, 'Day 3 should award Star Explorer badge');
  assert.strictEqual(claim.newBadgeAwarded.id, 'badge_star_explorer');
});

runTest('Missed Day Reset: Resets streak to Day 1 with clear explanation, preserving stars', () => {
  // Simulate parent missing 2 days
  const twoDaysAgo = '2026-10-20';
  db.prepare(`
    UPDATE reward_status
    SET last_claim_date_ist = ?, consecutive_streak = 5, total_stars = 15
    WHERE parent_id = ?
  `).run(twoDaysAgo, parentB_Id);

  const status = getRewardStatus(parentB_Id);
  assert.strictEqual(status.streakWillReset, true);
  assert(status.missedExplanation.includes('Login streak resets to Day 1'));

  // Reset last claim so they can claim today
  db.prepare('DELETE FROM reward_claims WHERE parent_id = ?').run(parentB_Id);
  const claim = claimDailyReward(parentB_Id);
  assert.strictEqual(claim.success, true);
  assert.strictEqual(claim.streak, 1, 'Streak should reset to 1');
  assert.strictEqual(claim.streakReset, true);
  assert.strictEqual(claim.totalStars, 16, 'Total stars preserved and incremented');
});

// 8. Delete meal
runTest('Delete meal record', () => {
  const delRes = deleteMeal(parentA_Id, mealId);
  assert.strictEqual(delRes.success, true);
  const meals = getMeals(parentA_Id, childA_Id);
  assert.strictEqual(meals.length, 0);
});

// 9. Child Screen Time Limit Persistence
runTest('Child profile stores and retrieves daily screen time minutes', () => {
  const testChildId = 'child_screen_' + Date.now();
  db.prepare(`
    INSERT INTO children (id, parent_id, nickname, age, daily_screen_time_minutes, created_at, updated_at)
    VALUES (?, ?, 'Chintu', 4, 45, ?, ?)
  `).run(testChildId, parentA_Id, now, now);

  const row = db.prepare('SELECT * FROM children WHERE id = ?').get(testChildId);
  assert.strictEqual(row.daily_screen_time_minutes, 45);

  db.prepare('UPDATE children SET daily_screen_time_minutes = ? WHERE id = ?').run(60, testChildId);
  const updated = db.prepare('SELECT * FROM children WHERE id = ?').get(testChildId);
  assert.strictEqual(updated.daily_screen_time_minutes, 60);
});

// 10. Caregiver Sickness & Health Guide Service
runTest('Sickness health guide returns comprehensive pediatric conditions', () => {
  const { getSicknessList, getSicknessById } = require('../health_service');
  const all = getSicknessList();
  assert(all.length >= 8, 'Should have at least 8 common childhood conditions');

  const cold = getSicknessList('cough');
  assert(cold.length >= 1);
  assert.strictEqual(cold[0].id, 'cold_cough');
  assert(cold[0].redFlags.length >= 2, 'Should include emergency red flag warning signs');

  const fever = getSicknessById('mild_fever');
  assert(fever);
  assert(fever.homeCare.length >= 2);
});

// Summary
console.log(`\n========================================`);
console.log(`Test Suite Completed: ${passedTests}/${totalTests} tests passed`);
console.log(`========================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
} else {
  console.log('ALL TESTS PASSED SUCCESSFULLY! ✨');
}
