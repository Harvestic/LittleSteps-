// app.js - LittleSteps application logic, state management, screen-time tracking,
// sickness board integration, audio sanctuary, and 2-minute calm splash screen.

const LittleApp = (() => {
  // State
  let token = localStorage.getItem('littlesteps_token') || null;
  let currentParent = null;
  let childrenList = [];
  let activeChild = null;
  let rewardStatus = null;
  let referenceFoods = [];
  let sicknessList = [];
  let currentSicknessCategory = 'all';
  let selectedOfferedFoods = new Set();
  let selectedEatenFoods = new Set();

  // Screen Time Tracker State (in seconds)
  let kidPlaySeconds = 0;
  let kidPlayTimerInterval = null;

  // Splash Screen State (120 seconds = 2 minutes)
  let splashRemaining = 120;
  let splashTimerInterval = null;

  // API helper with Bearer authorization
  async function api(path, options = {}) {
    const headers = options.headers || {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (options.body && typeof options.body === 'object') {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }
    options.headers = headers;

    const res = await fetch(path, options);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const err = new Error(data.error || 'Server request failed');
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  // Initialization
  async function init() {
    initSplashScreen();
    setupEventListeners();
    await loadReferenceFoods();
    await loadSicknesses();

    if (token) {
      try {
        const me = await api('/api/auth/me');
        currentParent = me.parent;
        rewardStatus = me.rewardStatus;
        await loadChildren();
        renderParentDashboard();
      } catch (err) {
        console.warn('Session expired or invalid:', err);
        logout();
      }
    } else {
      showAuthModal('login');
    }
  }

  // ----------------------------------------------------
  // 1. 2-MINUTE CALM SPLASH SCREEN
  // ----------------------------------------------------
  function initSplashScreen() {
    const display = document.getElementById('splashCountdownDisplay');
    splashRemaining = 120; // 2 minutes

    updateSplashCountdown();
    splashTimerInterval = setInterval(() => {
      splashRemaining--;
      if (splashRemaining <= 0) {
        dismissSplash();
      } else {
        updateSplashCountdown();
      }
    }, 1000);
  }

  function updateSplashCountdown() {
    const display = document.getElementById('splashCountdownDisplay');
    if (!display) return;
    const m = Math.floor(splashRemaining / 60);
    const s = splashRemaining % 60;
    display.textContent = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }

  function dismissSplash() {
    clearInterval(splashTimerInterval);
    splashTimerInterval = null;
    const splash = document.getElementById('splashOverlay');
    if (splash) {
      splash.classList.add('hidden');
      setTimeout(() => {
        splash.style.display = 'none';
      }, 800);
    }
  }

  // ----------------------------------------------------
  // 2. AUTHENTICATION
  // ----------------------------------------------------
  async function register(name, email, password, consentGiven) {
    try {
      const res = await api('/api/auth/register', {
        method: 'POST',
        body: { name, email, password, consentGiven }
      });
      token = res.token;
      localStorage.setItem('littlesteps_token', token);
      currentParent = res.parent;
      rewardStatus = res.rewardStatus;
      closeModal('authModal');
      await loadChildren();
      renderParentDashboard();
      alert(`Welcome to LittleSteps, ${currentParent.name}! Let us create your child profile.`);
      openNewChildModal();
    } catch (err) {
      alert(`Sign up error: ${err.message}`);
    }
  }

  async function login(email, password) {
    try {
      const res = await api('/api/auth/login', {
        method: 'POST',
        body: { email, password }
      });
      token = res.token;
      localStorage.setItem('littlesteps_token', token);
      currentParent = res.parent;
      rewardStatus = res.rewardStatus;
      closeModal('authModal');
      await loadChildren();
      renderParentDashboard();
    } catch (err) {
      alert(`Login failed: ${err.message}`);
    }
  }

  function logout() {
    if (token) {
      api('/api/auth/logout', { method: 'POST' }).catch(() => {});
    }
    token = null;
    currentParent = null;
    childrenList = [];
    activeChild = null;
    rewardStatus = null;
    stopScreenTimeTracker();
    if (window.LittleAudio) window.LittleAudio.stop();
    localStorage.removeItem('littlesteps_token');
    showAuthModal('login');
    document.getElementById('parentSection').style.display = 'none';
    document.getElementById('kidSection').style.display = 'none';
    document.getElementById('soundSection').style.display = 'none';
  }

  async function requestPasswordReset(email) {
    try {
      const res = await api('/api/auth/forgot-password', {
        method: 'POST',
        body: { email }
      });
      if (res.resetCode) {
        alert(`Reset code generated: ${res.resetCode}\n(Use this 6-digit code below to set your new password)`);
        document.getElementById('resetCodeInput').value = res.resetCode;
        document.getElementById('resetEmailInput').value = email;
        document.getElementById('forgotPassStep1').style.display = 'none';
        document.getElementById('forgotPassStep2').style.display = 'block';
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  }

  async function submitPasswordReset(email, resetCode, newPassword) {
    try {
      const res = await api('/api/auth/reset-password', {
        method: 'POST',
        body: { email, resetCode, newPassword }
      });
      alert(res.message);
      showAuthModal('login');
    } catch (err) {
      alert(`Password reset error: ${err.message}`);
    }
  }

  // ----------------------------------------------------
  // 3. CHILD PROFILES & SCREEN TIME LIMITS
  // ----------------------------------------------------
  async function loadChildren() {
    if (!token) return;
    try {
      const res = await api('/api/children');
      childrenList = res.children || [];
      if (childrenList.length > 0) {
        if (!activeChild || !childrenList.some(c => c.id === activeChild.id)) {
          activeChild = childrenList[0];
        }
      } else {
        activeChild = null;
      }
      renderChildSelector();
      if (activeChild) {
        loadChildData();
      }
    } catch (err) {
      console.error('Failed to load children:', err);
    }
  }

  async function saveChildProfile(nickname, age, dailyScreenTimeMinutes, childId = null) {
    try {
      if (childId) {
        await api(`/api/children/${childId}`, {
          method: 'PUT',
          body: { nickname, age, dailyScreenTimeMinutes }
        });
      } else {
        const res = await api('/api/children', {
          method: 'POST',
          body: { nickname, age, dailyScreenTimeMinutes }
        });
        activeChild = res.child;
      }
      closeModal('childModal');
      await loadChildren();
    } catch (err) {
      alert(`Error saving child profile: ${err.message}`);
    }
  }

  async function deleteChildProfile(childId) {
    if (!confirm('Are you sure you want to permanently delete this child profile and all associated records?')) {
      return;
    }
    try {
      await api(`/api/children/${childId}`, { method: 'DELETE' });
      activeChild = null;
      await loadChildren();
    } catch (err) {
      alert(`Error deleting child profile: ${err.message}`);
    }
  }

  function selectChild(childId) {
    activeChild = childrenList.find(c => c.id === childId) || null;
    renderChildSelector();
    loadChildData();
  }

  function loadChildData() {
    if (!activeChild) return;
    loadMeals();
    loadWater();
    loadWeeklySummary();
    loadLearningProgress();
    updateKidPlayLimitDisplay();
  }

  function openNewChildModal(childToEdit = null) {
    const nickInput = document.getElementById('childNicknameInput');
    const ageInput = document.getElementById('childAgeInput');
    const screenInput = document.getElementById('childScreenTimeInput');
    const hiddenId = document.getElementById('editingChildId');

    if (childToEdit) {
      hiddenId.value = childToEdit.id;
      nickInput.value = childToEdit.nickname;
      ageInput.value = String(childToEdit.age || 4);
      screenInput.value = String(childToEdit.daily_screen_time_minutes || 45);
    } else {
      hiddenId.value = '';
      nickInput.value = '';
      ageInput.value = '4';
      screenInput.value = '45';
    }
    onChildAgeChanged(ageInput.value);
    openModal('childModal');
  }

  function onChildAgeChanged(age) {
    const textEl = document.getElementById('pediatricGuidelineText');
    const screenSelect = document.getElementById('childScreenTimeInput');
    if (!textEl) return;

    const numAge = parseInt(age, 10);
    if (numAge === 3) {
      textEl.innerHTML = `🩺 <strong>Pediatric Guideline (Age 3):</strong> Maximum 30 to 45 minutes per day recommended. Young toddlers thrive on hands-on physical play and loving co-viewing.`;
      if (screenSelect && !screenSelect.dataset.customized) screenSelect.value = '30';
    } else if (numAge === 4) {
      textEl.innerHTML = `🩺 <strong>Pediatric Guideline (Age 4):</strong> Maximum 45 to 60 minutes per day recommended. Ensure plenty of outdoor physical play and gentle co-viewing.`;
      if (screenSelect && !screenSelect.dataset.customized) screenSelect.value = '45';
    } else {
      textEl.innerHTML = `🩺 <strong>Pediatric Guideline (Age 5):</strong> Maximum 60 minutes (1 hour) per day recommended. Balance with drawing, storybooks, and active sports.`;
      if (screenSelect && !screenSelect.dataset.customized) screenSelect.value = '60';
    }
  }

  function renderChildSelector() {
    const bar = document.getElementById('childSwitchBar');
    if (!bar) return;

    let html = childrenList.map(c => `
      <div style="display: inline-flex; align-items: center; gap: 4px;">
        <button class="child-pill ${activeChild && activeChild.id === c.id ? 'active' : ''}" onclick="LittleApp.selectChild('${c.id}')">
          👶 <strong>${c.nickname}</strong> (${c.age} yrs • ${c.daily_screen_time_minutes || 45}m screen)
        </button>
        <button class="btn btn-outline btn-sm" style="padding: 2px 6px; min-height: 28px;" title="Edit Child" onclick="LittleApp.openEditChild('${c.id}')">✏️</button>
      </div>
    `).join('');

    html += `
      <button class="btn btn-outline btn-sm" onclick="LittleApp.openNewChildModal()" style="border-radius: var(--radius-full); margin-left: 6px;">
        + Add Child
      </button>
    `;

    bar.innerHTML = html;

    const activeNameEl = document.getElementById('activeChildNameDisplay');
    const badgeEl = document.getElementById('activeChildScreenBadge');
    if (activeNameEl) {
      activeNameEl.textContent = activeChild ? activeChild.nickname : 'No Child Selected';
    }
    if (badgeEl && activeChild) {
      badgeEl.textContent = `Daily Screen Limit: ${activeChild.daily_screen_time_minutes || 45} mins`;
    }
    updateKidPlayLimitDisplay();
  }

  function openEditChild(childId) {
    const child = childrenList.find(c => c.id === childId);
    if (child) openNewChildModal(child);
  }

  // ----------------------------------------------------
  // 4. SCREEN TIME TRACKER IN KID MODE
  // ----------------------------------------------------
  function startScreenTimeTracker() {
    stopScreenTimeTracker();
    updateKidPlayTimerDisplay();

    // Increment play time every 60 seconds
    kidPlayTimerInterval = setInterval(() => {
      kidPlaySeconds += 60;
      updateKidPlayTimerDisplay();
      checkScreenTimeLimit();
    }, 60000);
  }

  function stopScreenTimeTracker() {
    if (kidPlayTimerInterval) {
      clearInterval(kidPlayTimerInterval);
      kidPlayTimerInterval = null;
    }
  }

  function updateKidPlayTimerDisplay() {
    const el = document.getElementById('kidPlayTimeDisplay');
    if (!el) return;
    const currentMins = Math.floor(kidPlaySeconds / 60);
    const limitMins = (activeChild && activeChild.daily_screen_time_minutes) || 45;
    el.textContent = `${currentMins} / ${limitMins} mins`;
  }

  function updateKidPlayLimitDisplay() {
    const limitMins = (activeChild && activeChild.daily_screen_time_minutes) || 45;
    const currentMins = Math.floor(kidPlaySeconds / 60);
    const el = document.getElementById('kidPlayTimeDisplay');
    if (el) el.textContent = `${currentMins} / ${limitMins} mins`;
  }

  function checkScreenTimeLimit() {
    const limitMins = (activeChild && activeChild.daily_screen_time_minutes) || 45;
    const currentMins = Math.floor(kidPlaySeconds / 60);

    if (currentMins >= limitMins) {
      const restOverlay = document.getElementById('restScreenOverlay');
      if (restOverlay) restOverlay.classList.add('active');
      if (window.LittleGames) {
        window.LittleGames.speak('Play time is complete for today! Time to rest your little eyes.');
      }
    }
  }

  function grantExtraScreenTime(extraMins = 10) {
    const restOverlay = document.getElementById('restScreenOverlay');
    if (restOverlay) restOverlay.classList.remove('active');
    if (activeChild) {
      activeChild.daily_screen_time_minutes = (activeChild.daily_screen_time_minutes || 45) + extraMins;
      updateKidPlayLimitDisplay();
    }
  }

  // ----------------------------------------------------
  // 5. CAREGIVER SICKNESS & HEALTH GUIDE BOARD
  // ----------------------------------------------------
  async function loadSicknesses(query = '') {
    try {
      const res = await api(`/api/health/sicknesses?q=${encodeURIComponent(query)}`);
      sicknessList = res.sicknesses || [];
      renderSicknessCards(sicknessList);
    } catch (err) {
      console.warn('Failed to load sickness guidance:', err);
    }
  }

  function renderSicknessCards(list) {
    const grid = document.getElementById('sicknessCardsGrid');
    if (!grid) return;

    if (list.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 24px; color: var(--text-secondary); background: var(--bg-card-subtle); border-radius: var(--radius-md);">
          <p>No matching condition found. For medical emergencies or sudden illness, immediately visit your local Anganwadi worker or PHC doctor.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = list.map(item => `
      <div class="sickness-card">
        <div class="sickness-header">
          <div class="sickness-icon">${item.icon}</div>
          <div>
            <div class="sickness-title">${item.name}</div>
            <span class="sickness-badge">${item.category}</span>
          </div>
        </div>

        <p style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.45;">
          ${item.overview}
        </p>

        <div>
          <div class="sickness-section-title">🏡 Supportive Home Comfort Care:</div>
          <ul class="sickness-list">
            ${item.homeCare.map(hc => `<li>${hc}</li>`).join('')}
          </ul>
        </div>

        <div>
          <div class="sickness-section-title">🍲 Foods to Offer:</div>
          <ul class="sickness-list">
            ${item.foodsToOffer.map(fo => `<li>${fo}</li>`).join('')}
          </ul>
        </div>

        <div class="sickness-red-flags">
          <strong>🚨 When to visit Doctor / Anganwadi immediately:</strong>
          <ul style="padding-left: 16px; margin-top: 4px;">
            ${item.redFlags.map(rf => `<li>${rf}</li>`).join('')}
          </ul>
        </div>
      </div>
    `).join('');
  }

  function searchSickness(query) {
    loadSicknesses(query);
  }

  function filterSicknessCategory(cat) {
    currentSicknessCategory = cat;
    document.querySelectorAll('.sickness-category-pill').forEach(btn => {
      btn.classList.remove('active');
    });
    const clicked = Array.from(document.querySelectorAll('.sickness-category-pill')).find(b => b.textContent.toLowerCase().includes(cat.toLowerCase()) || (cat === 'all' && b.textContent.includes('All')));
    if (clicked) clicked.classList.add('active');

    if (cat === 'all') {
      renderSicknessCards(sicknessList);
    } else {
      const filtered = sicknessList.filter(s => s.category.toLowerCase().includes(cat.toLowerCase()) || s.keywords.some(k => k.includes(cat.toLowerCase())));
      renderSicknessCards(filtered);
    }
  }

  // ----------------------------------------------------
  // 6. DAILY LOGIN REWARDS (Asia/Kolkata IST)
  // ----------------------------------------------------
  async function refreshRewardStatus() {
    try {
      rewardStatus = await api('/api/rewards/status');
      renderRewardStatus();
    } catch (err) {
      console.error('Failed to fetch reward status:', err);
    }
  }

  async function claimReward() {
    try {
      const res = await api('/api/rewards/claim', { method: 'POST' });
      rewardStatus = res.updatedStatus;
      renderRewardStatus();

      let cheer = `🎉 Day ${res.streak} Daily Reward Claimed!\n${res.rewardAwarded.desc}`;
      if (res.newBadgeAwarded) {
        cheer += `\n\n🏅 NEW BADGE EARNED: ${res.newBadgeAwarded.title}`;
      }
      if (res.newCertificateAwarded) {
        cheer += `\n\n📜 NEW CERTIFICATE EARNED: ${res.newCertificateAwarded.title}`;
      }
      if (res.streakReset) {
        cheer += `\n\nℹ️ Note: ${res.missedExplanation}`;
      }
      alert(cheer);
    } catch (err) {
      alert(err.message || 'Reward already claimed for today.');
    }
  }

  function renderRewardStatus() {
    if (!rewardStatus) return;

    document.getElementById('rewardStreakDisplay').textContent = `${rewardStatus.consecutiveStreak} Days`;
    document.getElementById('rewardStarsDisplay').textContent = `${rewardStatus.totalStars} ⭐`;

    const claimBtn = document.getElementById('claimRewardBtn');
    if (claimBtn) {
      if (rewardStatus.alreadyClaimedToday) {
        claimBtn.disabled = true;
        claimBtn.textContent = 'Claimed for Today ✓';
        claimBtn.className = 'btn btn-secondary';
      } else {
        claimBtn.disabled = false;
        claimBtn.textContent = `Claim Day ${rewardStatus.projectedStreak} Reward ⭐`;
        claimBtn.className = 'btn btn-gold btn-lg';
      }
    }

    const missedAlert = document.getElementById('missedStreakNotice');
    if (missedAlert) {
      if (rewardStatus.streakWillReset) {
        missedAlert.style.display = 'block';
        missedAlert.innerHTML = `⚠️ <strong>Streak Notice:</strong> A day was missed, so your consecutive streak restarts at Day 1 today. <em>All your previous lifetime stars and badges are completely safe!</em>`;
      } else {
        missedAlert.style.display = 'none';
      }
    }

    const calGrid = document.getElementById('rewardCalendarGrid');
    if (calGrid && rewardStatus.calendarDays) {
      calGrid.innerHTML = rewardStatus.calendarDays.map(d => {
        let icon = '⭐';
        if (d.type === 'badge') icon = '🏅';
        if (d.type === 'certificate') icon = '📜';

        return `
          <div class="calendar-day-box ${d.state}">
            <div class="calendar-day-number">Day ${d.day}</div>
            <div class="calendar-day-reward">${icon}</div>
            <div class="calendar-day-stars">${d.stars} Star${d.stars > 1 ? 's' : ''}</div>
          </div>
        `;
      }).join('');
    }

    const badgeContainer = document.getElementById('earnedBadgesContainer');
    if (badgeContainer) {
      const badges = rewardStatus.badges || [];
      const certs = rewardStatus.certificates || [];

      if (badges.length === 0 && certs.length === 0) {
        badgeContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">Check in daily to unlock parenting badges and certificates!</p>';
      } else {
        let html = '';
        badges.forEach(b => {
          html += `
            <div style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background: #FFFFFF; border: 1.5px solid var(--pastel-green-border); border-radius: var(--radius-full); margin: 4px; font-size: 0.85rem; font-weight: 600;">
              ${b.title}
            </div>
          `;
        });
        certs.forEach(c => {
          html += `
            <div style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background: #FEF3C7; border: 1.5px solid #F59E0B; border-radius: var(--radius-full); margin: 4px; font-size: 0.85rem; font-weight: 700; color: #92400E;">
              ${c.title}
            </div>
          `;
        });
        badgeContainer.innerHTML = html;
      }
    }
  }

  // ----------------------------------------------------
  // 7. NUTRITION & MEAL LOGGING
  // ----------------------------------------------------
  async function loadReferenceFoods() {
    try {
      const res = await api('/api/nutrition/reference-foods');
      referenceFoods = res.foods || [];
      renderNutritionGuidance(res.guidance || []);
    } catch (err) {
      console.warn('Failed to load reference foods:', err);
    }
  }

  async function loadMeals() {
    if (!activeChild) return;
    try {
      const res = await api(`/api/nutrition?childId=${activeChild.id}`);
      renderMealList(res.meals || []);
    } catch (err) {
      console.error('Failed to load meals:', err);
    }
  }

  function renderMealList(meals) {
    const list = document.getElementById('mealHistoryList');
    if (!list) return;

    if (meals.length === 0) {
      list.innerHTML = `
        <div style="text-align: center; padding: 24px; color: var(--text-secondary); background: var(--bg-card-subtle); border-radius: var(--radius-md); border: 1px dashed var(--border-subtle);">
          <p style="font-size: 1.1rem; margin-bottom: 6px;">No meals logged yet for ${activeChild.nickname}.</p>
          <button class="btn btn-secondary btn-sm" onclick="LittleApp.openMealModal()">+ Log First Meal</button>
        </div>
      `;
      return;
    }

    list.innerHTML = meals.map(m => `
      <div class="meal-item">
        <div class="meal-item-header">
          <div>
            <span class="meal-badge ${m.mealType}">${m.mealType}</span>
            <strong style="margin-left: 8px; font-size: 0.95rem;">${m.mealDate}</strong>
          </div>
          <div>
            <button class="btn btn-outline btn-sm" onclick="LittleApp.openEditMeal('${m.id}')" style="padding: 2px 8px; min-height: 28px;">Edit</button>
            <button class="btn btn-outline btn-sm" onclick="LittleApp.deleteMealRecord('${m.id}')" style="padding: 2px 8px; min-height: 28px; color: #DC2626;">✕</button>
          </div>
        </div>
        <div>
          <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);">Eaten:</span>
          ${m.foodsEaten.map(f => `<span class="meal-foods-tag" style="background: var(--pastel-green-bg); border-color: var(--pastel-green-border);">${f}</span>`).join('')}
        </div>
        ${m.foodsOffered.length > m.foodsEaten.length ? `
          <div>
            <span style="font-size: 0.8rem; color: var(--text-muted);">Also offered:</span>
            ${m.foodsOffered.filter(f => !m.foodsEaten.includes(f)).map(f => `<span class="meal-foods-tag" style="opacity: 0.7;">${f}</span>`).join('')}
          </div>
        ` : ''}
        ${m.notes ? `<p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px; font-style: italic;">Note: "${m.notes}"</p>` : ''}
      </div>
    `).join('');
  }

  function openMealModal(editingMeal = null) {
    selectedOfferedFoods.clear();
    selectedEatenFoods.clear();

    const dateInput = document.getElementById('mealDateInput');
    const typeSelect = document.getElementById('mealTypeInput');
    const notesInput = document.getElementById('mealNotesInput');
    const hiddenId = document.getElementById('editingMealId');

    const todayStr = (rewardStatus && rewardStatus.todayIST) || new Date().toISOString().split('T')[0];
    dateInput.value = todayStr;
    notesInput.value = '';

    if (editingMeal) {
      hiddenId.value = editingMeal.id;
      dateInput.value = editingMeal.mealDate;
      typeSelect.value = editingMeal.mealType;
      notesInput.value = editingMeal.notes || '';
      editingMeal.foodsOffered.forEach(f => selectedOfferedFoods.add(f));
      editingMeal.foodsEaten.forEach(f => selectedEatenFoods.add(f));
    } else {
      hiddenId.value = '';
    }

    renderFoodChips();
    openModal('mealModal');
  }

  function renderFoodChips() {
    const offeredGrid = document.getElementById('foodChipsOffered');
    const eatenGrid = document.getElementById('foodChipsEaten');
    if (!offeredGrid || !eatenGrid) return;

    offeredGrid.innerHTML = referenceFoods.map(food => {
      const isSelected = selectedOfferedFoods.has(food.name);
      return `
        <button type="button" class="food-chip ${isSelected ? 'selected' : ''}" onclick="LittleApp.toggleOfferedFood('${food.name}')">
          <span>${food.icon}</span> ${food.name}
        </button>
      `;
    }).join('');

    eatenGrid.innerHTML = referenceFoods.map(food => {
      const isSelected = selectedEatenFoods.has(food.name);
      return `
        <button type="button" class="food-chip ${isSelected ? 'selected' : ''}" onclick="LittleApp.toggleEatenFood('${food.name}')">
          <span>${food.icon}</span> ${food.name}
        </button>
      `;
    }).join('');
  }

  function toggleOfferedFood(name) {
    if (selectedOfferedFoods.has(name)) {
      selectedOfferedFoods.delete(name);
      selectedEatenFoods.delete(name);
    } else {
      selectedOfferedFoods.add(name);
      selectedEatenFoods.add(name);
    }
    renderFoodChips();
  }

  function toggleEatenFood(name) {
    if (selectedEatenFoods.has(name)) {
      selectedEatenFoods.delete(name);
    } else {
      selectedEatenFoods.add(name);
      selectedOfferedFoods.add(name);
    }
    renderFoodChips();
  }

  function addCustomFood() {
    const customInput = document.getElementById('customFoodInput');
    const val = customInput.value.trim();
    if (val) {
      selectedOfferedFoods.add(val);
      selectedEatenFoods.add(val);
      referenceFoods.push({ id: val.toLowerCase().replace(/\s+/g, '_'), name: val, icon: '🍽️', category: 'custom' });
      customInput.value = '';
      renderFoodChips();
    }
  }

  async function submitMeal() {
    if (!activeChild) return;
    const mealId = document.getElementById('editingMealId').value;
    const mealDate = document.getElementById('mealDateInput').value;
    const mealType = document.getElementById('mealTypeInput').value;
    const notes = document.getElementById('mealNotesInput').value;

    const foodsOffered = Array.from(selectedOfferedFoods);
    const foodsEaten = Array.from(selectedEatenFoods);

    if (foodsOffered.length === 0) {
      alert('Please select or add at least one food offered.');
      return;
    }

    try {
      if (mealId) {
        await api(`/api/nutrition/${mealId}`, {
          method: 'PUT',
          body: { mealDate, mealType, foodsOffered, foodsEaten, notes }
        });
      } else {
        await api('/api/nutrition', {
          method: 'POST',
          body: { childId: activeChild.id, mealDate, mealType, foodsOffered, foodsEaten, notes }
        });
      }
      closeModal('mealModal');
      await loadMeals();
      await loadWeeklySummary();
    } catch (err) {
      alert(`Error saving meal: ${err.message}`);
    }
  }

  async function openEditMeal(mealId) {
    try {
      const res = await api(`/api/nutrition?childId=${activeChild.id}`);
      const meal = (res.meals || []).find(m => m.id === mealId);
      if (meal) openMealModal(meal);
    } catch (err) {
      alert('Could not open meal for editing');
    }
  }

  async function deleteMealRecord(mealId) {
    if (!confirm('Are you sure you want to delete this meal entry?')) return;
    try {
      await api(`/api/nutrition/${mealId}`, { method: 'DELETE' });
      await loadMeals();
      await loadWeeklySummary();
    } catch (err) {
      alert(`Error deleting meal: ${err.message}`);
    }
  }

  // ----------------------------------------------------
  // 8. WATER INTAKE TRACKER
  // ----------------------------------------------------
  let currentWaterGlasses = 0;

  async function loadWater() {
    if (!activeChild) return;
    const todayStr = (rewardStatus && rewardStatus.todayIST) || new Date().toISOString().split('T')[0];
    try {
      const res = await api(`/api/water?childId=${activeChild.id}&startDate=${todayStr}&endDate=${todayStr}`);
      const logs = res.water || [];
      currentWaterGlasses = logs.length > 0 ? logs[0].glassesCount : 0;
      updateWaterDisplay();
    } catch (err) {
      console.warn('Failed to load water:', err);
    }
  }

  async function changeWater(delta) {
    if (!activeChild) return;
    const newCount = Math.max(0, currentWaterGlasses + delta);
    currentWaterGlasses = newCount;
    updateWaterDisplay();

    const todayStr = (rewardStatus && rewardStatus.todayIST) || new Date().toISOString().split('T')[0];
    try {
      await api('/api/water', {
        method: 'POST',
        body: { childId: activeChild.id, logDate: todayStr, glassesCount: newCount }
      });
      loadWeeklySummary();
    } catch (err) {
      console.warn('Failed to update water on server:', err);
    }
  }

  function updateWaterDisplay() {
    const el = document.getElementById('waterGlassCount');
    if (el) el.textContent = currentWaterGlasses;
  }

  // ----------------------------------------------------
  // 9. WEEKLY FOOD VARIETY SUMMARY & GUIDANCE
  // ----------------------------------------------------
  async function loadWeeklySummary() {
    if (!activeChild) return;
    const todayStr = (rewardStatus && rewardStatus.todayIST) || new Date().toISOString().split('T')[0];
    try {
      const summary = await api(`/api/nutrition/summary?childId=${activeChild.id}&targetDate=${todayStr}`);
      renderWeeklySummary(summary);
    } catch (err) {
      console.warn('Failed to load summary:', err);
    }
  }

  function renderWeeklySummary(s) {
    const container = document.getElementById('weeklyVarietyContainer');
    if (!container) return;

    const counts = s.foodGroupCounts || {};
    container.innerHTML = `
      <div class="variety-grid">
        <div class="variety-box">
          <div class="variety-box-icon">🍚</div>
          <div class="variety-box-title">Grains / Energy</div>
          <div class="variety-box-count">${counts.energy || 0} times</div>
        </div>
        <div class="variety-box">
          <div class="variety-box-icon">🫘</div>
          <div class="variety-box-title">Dal & Protein</div>
          <div class="variety-box-count">${counts.protein || 0} times</div>
        </div>
        <div class="variety-box">
          <div class="variety-box-icon">🥬</div>
          <div class="variety-box-title">Veggies & Fruits</div>
          <div class="variety-box-count">${counts.vitamins || 0} times</div>
        </div>
        <div class="variety-box">
          <div class="variety-box-icon">🥛</div>
          <div class="variety-box-title">Dairy & Calcium</div>
          <div class="variety-box-count">${counts.dairy || 0} times</div>
        </div>
        <div class="variety-box">
          <div class="variety-box-icon">💧</div>
          <div class="variety-box-title">Hydration Days</div>
          <div class="variety-box-count">${counts.hydration_days || 0} / 7 days</div>
        </div>
      </div>
      <div style="background: var(--pastel-green-bg); border-left: 4px solid var(--pastel-green-accent); padding: 12px 16px; border-radius: var(--radius-sm); margin-top: 10px;">
        <h5 style="color: var(--pastel-green-text); margin-bottom: 4px;">Weekly Variety Insight</h5>
        ${s.encouragingFeedback.map(f => `<p style="font-size: 0.88rem; color: var(--text-primary); margin-bottom: 4px;">• ${f}</p>`).join('')}
      </div>
    `;
  }

  function renderNutritionGuidance(guidance) {
    const grid = document.getElementById('nutritionAdviceGrid');
    if (!grid) return;

    grid.innerHTML = guidance.map(g => `
      <div class="advice-card">
        <span class="advice-badge">${g.badge}</span>
        <div class="advice-title">${g.title}</div>
        <p class="advice-text" style="font-weight: 600; margin-bottom: 4px;">${g.summary}</p>
        <p class="advice-text">${g.why}</p>
      </div>
    `).join('');
  }

  // ----------------------------------------------------
  // 10. LEARNING PROGRESS
  // ----------------------------------------------------
  async function loadLearningProgress() {
    if (!activeChild) return;
    try {
      const res = await api(`/api/learning/progress?childId=${activeChild.id}`);
      renderLearningProgress(res.activities || []);
    } catch (err) {
      console.warn('Failed to load learning progress:', err);
    }
  }

  function renderLearningProgress(activities) {
    const container = document.getElementById('childLearningBadges');
    if (!container) return;

    if (activities.length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">No games played yet. Switch to Kid Play Area 🎈 above to explore!</p>';
      return;
    }

    container.innerHTML = activities.slice(0, 10).map(a => `
      <div style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background: var(--warm-gold-bg); border: 1px solid var(--warm-gold-border); border-radius: var(--radius-full); margin: 4px; font-size: 0.82rem; font-weight: 600;">
        ⭐ ${a.title}
      </div>
    `).join('');
  }

  async function recordChildActivity(activityData) {
    if (!activeChild) {
      if (childrenList.length > 0) activeChild = childrenList[0];
      else return;
    }

    try {
      await api('/api/learning/progress', {
        method: 'POST',
        body: {
          childId: activeChild.id,
          activityId: activityData.activityId,
          activityType: activityData.activityType,
          title: activityData.title,
          starsEarned: activityData.starsEarned || 1
        }
      });
      loadLearningProgress();
    } catch (err) {
      console.warn('Could not record activity progress:', err);
    }
  }

  // ----------------------------------------------------
  // 11. PRIVACY, DATA EXPORT & DELETION
  // ----------------------------------------------------
  async function exportFamilyData() {
    try {
      const data = await api('/api/privacy/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `LittleSteps_Data_${currentParent.name.replace(/\s+/g, '_')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export error: ${err.message}`);
    }
  }

  async function requestAccountErasure() {
    const confirmation = prompt('To permanently delete your family account and all records, type "DELETE":');
    if (confirmation !== 'DELETE') {
      alert('Deletion cancelled.');
      return;
    }

    try {
      const res = await api('/api/privacy/delete-request', {
        method: 'POST',
        body: { deleteType: 'entire_account' }
      });
      alert(res.message);
      logout();
    } catch (err) {
      alert(`Erasure error: ${err.message}`);
    }
  }

  // ----------------------------------------------------
  // 12. UI RENDERING, NAVIGATION & MODE SWITCHING
  // ----------------------------------------------------
  function renderParentDashboard() {
    document.getElementById('parentSection').style.display = 'block';
    document.getElementById('kidSection').style.display = 'none';
    document.getElementById('soundSection').style.display = 'none';

    document.getElementById('tabParent').classList.add('active');
    document.getElementById('tabKid').classList.remove('active', 'kid-mode-active');
    document.getElementById('tabSound').classList.remove('active');

    document.getElementById('welcomeParentName').textContent = currentParent ? currentParent.name : 'Parent';
    stopScreenTimeTracker();
    renderRewardStatus();
  }

  function switchMode(mode) {
    if (mode === 'kid') {
      document.getElementById('parentSection').style.display = 'none';
      document.getElementById('kidSection').style.display = 'block';
      document.getElementById('soundSection').style.display = 'none';

      document.getElementById('tabKid').classList.add('active', 'kid-mode-active');
      document.getElementById('tabParent').classList.remove('active');
      document.getElementById('tabSound').classList.remove('active');

      startScreenTimeTracker();
      if (window.LittleGames) {
        window.LittleGames.closeCurrentGame();
        window.LittleGames.speak('Welcome to your play garden! Choose a game to play.');
      }
    } else if (mode === 'sound') {
      document.getElementById('parentSection').style.display = 'none';
      document.getElementById('kidSection').style.display = 'none';
      document.getElementById('soundSection').style.display = 'block';

      document.getElementById('tabSound').classList.add('active');
      document.getElementById('tabParent').classList.remove('active');
      document.getElementById('tabKid').classList.remove('active', 'kid-mode-active');
      stopScreenTimeTracker();
    } else {
      document.getElementById('kidSection').style.display = 'none';
      document.getElementById('soundSection').style.display = 'none';
      document.getElementById('parentSection').style.display = 'block';

      document.getElementById('tabParent').classList.add('active');
      document.getElementById('tabKid').classList.remove('active', 'kid-mode-active');
      document.getElementById('tabSound').classList.remove('active');
      stopScreenTimeTracker();
    }
  }

  function showAuthModal(type = 'login') {
    openModal('authModal');
    if (type === 'login') {
      document.getElementById('authLoginTab').click();
    } else {
      document.getElementById('authRegisterTab').click();
    }
  }

  function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  }

  function printAnganwadiReport() {
    window.print();
  }

  function setupEventListeners() {
    // Mode toggle tabs
    document.getElementById('tabParent').addEventListener('click', () => switchMode('parent'));
    document.getElementById('tabKid').addEventListener('click', () => switchMode('kid'));
    document.getElementById('tabSound').addEventListener('click', () => switchMode('sound'));

    // Language switcher
    const langSelect = document.getElementById('langSelect');
    if (langSelect) {
      langSelect.addEventListener('change', (e) => {
        window.I18N.setLanguage(e.target.value);
      });
    }

    // Auth tabs
    const tabLogin = document.getElementById('authLoginTab');
    const tabReg = document.getElementById('authRegisterTab');
    const tabForgot = document.getElementById('authForgotTab');

    if (tabLogin && tabReg && tabForgot) {
      tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabReg.classList.remove('active');
        tabForgot.classList.remove('active');
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('forgotPassForm').style.display = 'none';
      });

      tabReg.addEventListener('click', () => {
        tabReg.classList.add('active');
        tabLogin.classList.remove('active');
        tabForgot.classList.remove('active');
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
        document.getElementById('forgotPassForm').style.display = 'none';
      });

      tabForgot.addEventListener('click', () => {
        tabForgot.classList.add('active');
        tabLogin.classList.remove('active');
        tabReg.classList.remove('active');
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('forgotPassForm').style.display = 'block';
      });
    }

    // Login submit
    document.getElementById('loginForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value;
      const pass = document.getElementById('loginPassword').value;
      login(email, pass);
    });

    // Register submit
    document.getElementById('registerForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('regName').value;
      const email = document.getElementById('regEmail').value;
      const pass = document.getElementById('regPassword').value;
      const consent = document.getElementById('regConsent').checked;
      register(name, email, pass, consent);
    });

    // Forgot password forms
    document.getElementById('forgotPassStep1').addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('forgotEmailInput').value;
      requestPasswordReset(email);
    });

    document.getElementById('forgotPassStep2').addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('resetEmailInput').value;
      const code = document.getElementById('resetCodeInput').value;
      const newPass = document.getElementById('resetNewPassInput').value;
      submitPasswordReset(email, code, newPass);
    });

    // Child form submit
    document.getElementById('childProfileForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const nickname = document.getElementById('childNicknameInput').value;
      const age = document.getElementById('childAgeInput').value;
      const screenTime = document.getElementById('childScreenTimeInput').value;
      const id = document.getElementById('editingChildId').value;
      saveChildProfile(nickname, age, screenTime, id || null);
    });

    // Meal form submit
    document.getElementById('mealLogForm').addEventListener('submit', (e) => {
      e.preventDefault();
      submitMeal();
    });
  }

  // Public exports
  return {
    init,
    login,
    register,
    logout,
    dismissSplash,
    claimReward,
    selectChild,
    openNewChildModal,
    openEditChild,
    onChildAgeChanged,
    openMealModal,
    openEditMeal,
    deleteMealRecord,
    deleteChildProfile,
    toggleOfferedFood,
    toggleEatenFood,
    addCustomFood,
    changeWater,
    recordChildActivity,
    exportFamilyData,
    requestAccountErasure,
    printAnganwadiReport,
    openModal,
    closeModal,
    switchMode,
    searchSickness,
    filterSicknessCategory,
    grantExtraScreenTime,
    getActiveChild: () => activeChild
  };
})();

window.LittleApp = LittleApp;
document.addEventListener('DOMContentLoaded', () => {
  window.I18N.applyTranslations();
  window.LittleApp.init();
});
