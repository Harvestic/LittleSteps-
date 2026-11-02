# LittleSteps (लिटिल स्टेप्स) 🌾

A complete, mobile-friendly education and nutrition web application designed for children aged 3–5 in underserved and slum communities in India, managed by parents and authorized caregivers.

---

## Key Features

### 1. Gentle & Accessible Front-End Design
- **Warm, Soothing Palette**: Gentle warm yellow (`#FFF8E7`), soft cream (`#FAF7F2`), muted pastel green (`#EAF4EC`), soft peach (`#FFE8D6`), and readable dark warm brown text (`#2D231E`). Zero bright blue backgrounds, no harsh glaring white screens, and no flashing animations.
- **Child-Friendly & Large Touch Targets**: Minimum 48px touch targets, clear friendly icons, and calm visuals suitable for parents and children.
- **Multilingual Support Ready**: Built-in instant language switcher supporting:
  - English
  - Hindi (हिन्दी)
  - Marathi (मराठी)
  - Tamil (தமிழ்)
  - Telugu (తెలుగు)
  - Bengali (বাংলা)
- **Dual Interface**:
  - **🏡 Parent Dashboard**: Meal tracking, water intake, daily rewards calendar, weekly food variety insights, Anganwadi export, and privacy controls.
  - **🎈 Kid Play Area (Bal Vatika)**: Full-screen calm learning garden with large interactive cards and gentle voice read-aloud.

---

### 2. Secure Parent Authentication & Data Isolation
- Real parent registration with explicit guardian consent checkbox.
- Strong password hashing using `scrypt` with unique salts and timing-safe comparison.
- Session tokens with automatic expiration.
- Complete 2-step password reset workflow with 6-digit codes.
- Strict server-side authorization: Parents can only access their own children's records. Data is never shared across families.

---

### 3. Persistent Database Storage
- Powered by native SQLite (`node:sqlite`) with WAL mode and foreign key constraints enabled.
- Persistent tables: `parents`, `sessions`, `children`, `reward_status`, `reward_claims`, `nutrition_logs`, `water_logs`, `learning_progress`, `data_deletion_requests`.
- All changes are saved to disk in `data/littlesteps.db` and persist across reboots, logouts, and page refreshes.

---

### 4. Daily Login Rewards (Asia/Kolkata IST)
- Calculates calendar days using India Standard Time (`Asia/Kolkata`, UTC+05:30).
- **Streak & Rewards Schedule**:
  - **Day 1**: 1 Star ⭐ (First Steps Star)
  - **Day 2**: 2 Stars ⭐⭐ (Growing Strong Stars)
  - **Day 3**: Star Explorer Badge 🏅 + 2 Stars
  - **Day 4**: 2 Stars ⭐⭐ (Consistent Care Stars)
  - **Day 5**: Healthy Hero Badge 🥗 + 3 Stars
  - **Day 6**: 3 Stars ⭐⭐⭐ (Champion Parent Stars)
  - **Day 7**: Certificate of Family Dedication 📜 + 5 Stars
- **Atomic Server Validation**: Prevents duplicate claims on the same IST calendar day.
- **Missed Day Explanation**: If a parent misses a day, the consecutive streak resets to Day 1, with a clear reassuring notice that all lifetime stars and earned badges remain permanently safe.
- **Screen Time Notice**: Children are never required to use screens daily to access learning activities.

---

### 5. Parent Nutrition Program
- Meal logging for Breakfast, Lunch, Dinner, and Snacks.
- Fast-tap food selection chips with familiar Indian staples:
  - Roti, Rice, Khichdi, Poha, Daliya, Idli/Dosa
  - Moong Dal, Toor Dal, Chana/Chickpeas, Rajma, Boiled Egg, Soy Chunks
  - Palak/Methi, Drumstick/Moringa Leaves, Carrots, Kaddu/Pumpkin, Lauki
  - Bananas, Guavas, Papayas, Oranges
  - Warm Milk, Curd/Dahi, Buttermilk/Chaas, Paneer
  - Roasted Chana, Peanut Chikki, Sprouted Moong, Murmura Bhel
  - Custom food items support
- Tracks foods offered vs. foods actually eaten.
- Water intake tracker with no pressure or rigid targets.
- Weekly food variety balance summary across 5 food groups.
- Reviewed local nutrition guidance:
  - Lemon squeeze on dal/greens for iron absorption
  - Sprouting moong at home for zero-cost vitamin boost
  - Adding moringa leaves into everyday dal
  - Mindful Division of Responsibility during meal times
- **Medical Disclaimer**: Clearly distinguishes record-keeping from clinical diagnoses.
- One-click print / export summary for Anganwadi workers or doctors.

---

### 6. Educational Activities (Ages 3–5)
- **Alphabet & Akshar Garden**: Tap letters (A-Z & Swar) to hear pronunciation and see friendly pictures.
- **Counting Orchard**: Count 1 to 10 sweet mangoes on the tree.
- **Colors & Shapes in our World**: Match Roti to Circle, Samosa to Triangle, Matchbox to Rectangle, Carrom to Square.
- **Raju's Healthy Thali Builder**: Interactive sorting of nutritious foods vs. junk.
- **Calm Stories & Rhymes**:
  - *The Clever Crow (प्यासा कौआ)*
  - *Raju & the Magic Moringa Tree*
  - *Machhli Jal Ki Rani Hai*
  - *Chanda Mama Door Ke*
- Gentle audio narration with Web Speech Synthesis API.
- Awards learning stars synced directly to the parent dashboard.

---

### 7. Child Safety & Privacy
- Only necessary data collected (nickname and age). No exact birthdates, addresses, photos, or biometrics.
- No public profiles, no public leaderboards, no open chat.
- One-click private data export (JSON).
- One-click permanent profile and account deletion request.

---

## Running the Application Locally

```bash
# Launch server
.\node.cmd server.js
```
Open your browser to: **`http://localhost:3000`**

### Running the Test Suite
```bash
# Unit & integration tests
.\node.cmd tests\test_all.js

# Full API mock tests
.\node.cmd tests\test_api_mock.js
```
