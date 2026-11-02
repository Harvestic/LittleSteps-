// reward_service.js - Daily login rewards with India Standard Time (Asia/Kolkata) enforcement
const crypto = require('node:crypto');
const { db } = require('./db');

// Convert any UTC Date/timestamp to IST YYYY-MM-DD
function getISTDate(dateInput = new Date()) {
  const d = (typeof dateInput === 'number' || typeof dateInput === 'string') 
    ? new Date(dateInput) 
    : dateInput;
  
  // IST is UTC + 05:30 (5 hours, 30 minutes = 330 minutes = 19,800,000 ms)
  const utcMs = d.getTime() + (d.getTimezoneOffset() * 60000);
  const istMs = utcMs + (330 * 60000);
  const istDate = new Date(istMs);

  const year = istDate.getFullYear();
  const month = String(istDate.getMonth() + 1).padStart(2, '0');
  const day = String(istDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Calculate the previous calendar day in IST
function getPreviousISTDate(istDateStr) {
  const [y, m, d] = istDateStr.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  dateObj.setUTCDate(dateObj.getUTCDate() - 1);
  const prevY = dateObj.getUTCFullYear();
  const prevM = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
  const prevD = String(dateObj.getUTCDate()).padStart(2, '0');
  return `${prevY}-${prevM}-${prevD}`;
}

// Reward schedule by streak day
const REWARD_SCHEDULE = {
  1: { stars: 1, type: 'star', name: 'First Steps Star ⭐', badge: null, cert: null, desc: 'Welcome! You earned 1 Star for beginning your journey.' },
  2: { stars: 2, type: 'star', name: 'Growing Strong Stars ⭐⭐', badge: null, cert: null, desc: 'Day 2 Streak! 2 Stars awarded for keeping track.' },
  3: { stars: 2, type: 'badge', name: 'Star Explorer Badge 🏅', badge: { id: 'badge_star_explorer', title: 'Star Explorer 🏅', desc: 'Maintained 3 consecutive days of mindful parenting care.' }, cert: null, desc: 'Day 3 Streak! You unlocked the Star Explorer Badge + 2 Stars!' },
  4: { stars: 2, type: 'star', name: 'Consistent Care Stars ⭐⭐', badge: null, cert: null, desc: 'Day 4 Streak! 2 Stars awarded for steady support.' },
  5: { stars: 3, type: 'badge', name: 'Healthy Hero Badge 🥗', badge: { id: 'badge_healthy_hero', title: 'Healthy Hero 🥗', desc: '5 days of steady nutrition tracking for your child.' }, cert: null, desc: 'Day 5 Streak! You unlocked the Healthy Hero Badge + 3 Stars!' },
  6: { stars: 3, type: 'star', name: 'Champion Parent Stars ⭐⭐⭐', badge: null, cert: null, desc: 'Day 6 Streak! 3 Stars awarded for loving commitment.' },
  7: { stars: 5, type: 'certificate', name: 'Certificate of Family Dedication 📜', badge: null, cert: { id: 'cert_family_dedication', title: 'Certificate of Family Dedication 📜', issuedDate: null, desc: 'Awarded to parents demonstrating outstanding 7-day dedication to early child development and wholesome nourishment.' }, desc: 'Day 7 Milestone Achieved! You earned the official Certificate of Family Dedication + 5 Stars!' }
};

function getRewardForStreak(streakDay) {
  const cycleDay = ((streakDay - 1) % 7) + 1;
  const baseReward = REWARD_SCHEDULE[cycleDay] || REWARD_SCHEDULE[1];
  return {
    ...baseReward,
    cycleDay
  };
}

// Initialize or fetch parent reward status
function getRewardStatus(parentId) {
  const stmt = db.prepare('SELECT * FROM reward_status WHERE parent_id = ?');
  let status = stmt.get(parentId);

  if (!status) {
    const now = Date.now();
    const insertStmt = db.prepare(`
      INSERT INTO reward_status (parent_id, consecutive_streak, last_claim_date_ist, total_stars, badges_json, certificates_json, updated_at)
      VALUES (?, 0, '', 0, '[]', '[]', ?)
    `);
    insertStmt.run(parentId, now);
    status = {
      parent_id: parentId,
      consecutive_streak: 0,
      last_claim_date_ist: '',
      total_stars: 0,
      badges_json: '[]',
      certificates_json: '[]',
      updated_at: now
    };
  }

  const todayIST = getISTDate();
  const yesterdayIST = getPreviousISTDate(todayIST);
  const alreadyClaimedToday = (status.last_claim_date_ist === todayIST);
  
  // Determine if streak will continue or reset if claimed today
  let projectedStreak = 1;
  let streakWillReset = false;
  let missedExplanation = '';

  if (alreadyClaimedToday) {
    projectedStreak = status.consecutive_streak;
  } else {
    if (status.last_claim_date_ist === yesterdayIST) {
      projectedStreak = status.consecutive_streak + 1;
    } else if (status.last_claim_date_ist === '') {
      projectedStreak = 1;
    } else {
      projectedStreak = 1;
      streakWillReset = true;
      missedExplanation = 'Login streak resets to Day 1 because yesterday was missed. However, all previously earned stars and badges remain permanently saved!';
    }
  }

  const badges = JSON.parse(status.badges_json || '[]');
  const certificates = JSON.parse(status.certificates_json || '[]');

  // Generate 7-day visual calendar representation
  const calendarDays = [];
  const activeCycleDay = alreadyClaimedToday 
    ? (((status.consecutive_streak - 1) % 7) + 1)
    : (((projectedStreak - 1) % 7) + 1);

  for (let i = 1; i <= 7; i++) {
    const dayConfig = REWARD_SCHEDULE[i];
    let state = 'upcoming';
    if (alreadyClaimedToday) {
      if (i <= activeCycleDay) state = 'completed';
      else if (i === activeCycleDay + 1) state = 'next';
    } else {
      if (i < activeCycleDay) state = 'completed';
      else if (i === activeCycleDay) state = 'ready_to_claim';
      else if (i === activeCycleDay + 1) state = 'next';
    }

    calendarDays.push({
      day: i,
      state,
      stars: dayConfig.stars,
      name: dayConfig.name,
      type: dayConfig.type
    });
  }

  return {
    parentId: status.parent_id,
    todayIST,
    consecutiveStreak: status.consecutive_streak,
    totalStars: status.total_stars,
    lastClaimDateIST: status.last_claim_date_ist,
    alreadyClaimedToday,
    canClaimToday: !alreadyClaimedToday,
    projectedStreak,
    streakWillReset,
    missedExplanation,
    badges,
    certificates,
    calendarDays,
    nextReward: getRewardForStreak(projectedStreak),
    childScreenNotice: 'Note: Daily login rewards are for parent engagement. Children are NEVER required to use screens daily to access education activities.'
  };
}

// Server-side claim verification & atomic database update
function claimDailyReward(parentId) {
  const todayIST = getISTDate();
  const yesterdayIST = getPreviousISTDate(todayIST);
  const now = Date.now();

  // Retrieve current status
  let status = db.prepare('SELECT * FROM reward_status WHERE parent_id = ?').get(parentId);
  if (!status) {
    getRewardStatus(parentId);
    status = db.prepare('SELECT * FROM reward_status WHERE parent_id = ?').get(parentId);
  }

  // Idempotency: Already claimed today?
  if (status.last_claim_date_ist === todayIST) {
    return {
      success: false,
      alreadyClaimed: true,
      message: "You have already claimed today's reward! Come back tomorrow (IST) for your next daily reward.",
      currentStatus: getRewardStatus(parentId)
    };
  }

  let newStreak = 1;
  let streakReset = false;
  let missedExplanation = '';

  if (status.last_claim_date_ist === yesterdayIST) {
    newStreak = status.consecutive_streak + 1;
  } else if (status.last_claim_date_ist === '') {
    newStreak = 1;
  } else {
    newStreak = 1;
    streakReset = true;
    missedExplanation = 'Your streak reset to Day 1 because a day was missed. Your lifetime stars and badges were NOT lost!';
  }

  const reward = getRewardForStreak(newStreak);
  const newTotalStars = status.total_stars + reward.stars;
  const badges = JSON.parse(status.badges_json || '[]');
  const certificates = JSON.parse(status.certificates_json || '[]');

  let newBadgeAwarded = null;
  if (reward.badge && !badges.some(b => b.id === reward.badge.id)) {
    const bObj = { ...reward.badge, earnedAt: now, streakDay: newStreak };
    badges.push(bObj);
    newBadgeAwarded = bObj;
  }

  let newCertificateAwarded = null;
  if (reward.cert) {
    const cObj = { ...reward.cert, issuedDate: todayIST, issuedAt: now, streakDay: newStreak };
    certificates.push(cObj);
    newCertificateAwarded = cObj;
  }

  const claimId = crypto.randomUUID();

  // Perform atomic transaction
  db.exec('BEGIN TRANSACTION;');
  try {
    const claimStmt = db.prepare(`
      INSERT INTO reward_claims (id, parent_id, claim_date_ist, streak_day, reward_type, reward_name, stars_awarded, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    claimStmt.run(claimId, parentId, todayIST, newStreak, reward.type, reward.name, reward.stars, now);

    const updateStatusStmt = db.prepare(`
      UPDATE reward_status
      SET consecutive_streak = ?,
          last_claim_date_ist = ?,
          total_stars = ?,
          badges_json = ?,
          certificates_json = ?,
          updated_at = ?
      WHERE parent_id = ?
    `);
    updateStatusStmt.run(newStreak, todayIST, newTotalStars, JSON.stringify(badges), JSON.stringify(certificates), now, parentId);

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  return {
    success: true,
    alreadyClaimed: false,
    streak: newStreak,
    streakReset,
    missedExplanation,
    rewardAwarded: reward,
    newBadgeAwarded,
    newCertificateAwarded,
    totalStars: newTotalStars,
    updatedStatus: getRewardStatus(parentId)
  };
}

module.exports = {
  getISTDate,
  getPreviousISTDate,
  getRewardStatus,
  claimDailyReward,
  REWARD_SCHEDULE
};
