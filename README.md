# Abhyaas Connect — School Portal & AI Learning Platform
### Abhyaas International School

Abhyaas Connect is a secure, real-time web portal engineered for Abhyaas International School. It provides text-only announcements and broadcasts, AI-driven adaptive MCQ examinations, message-aware doubt clearance, a Google Lens-style transient question scanner, and browser-based educational games.

---

## 🔑 Initial Master Administrator Credentials

Use these master credentials to log in on initial setup:
- **Username:** `alok`
- **Password:** `8904`
- **Role:** Administrator (`admin`)
- **Display Name:** Alok - Main Admin

> **Note:** All student accounts and secondary admin accounts are provisioned securely from the **Admin Dashboard** (`Class Manager` and `Settings`). Passwords are never stored in plain text. When an account is created, credentials are displayed once for 10 seconds with a countdown timer.

---

## 🚀 Key Features

1. **Unified Login & Instagram-Style Multi-Account Switcher**
   - Single clean login screen for both students and admins without credential hints.
   - Long-press / 1-tap account switching stored per device for siblings sharing a tablet or phone.

2. **Real-Time Text-Only Class Broadcasts**
   - Instant live updates across all devices using Cloud Firestore `onSnapshot`.
   - Text-only with safe clickable links (no file/photo/PDF storage).
   - WhatsApp-style chat bubbles, date separators, and pagination.
   - 7-day automatic message retention.

3. **AI MCQ Test Generation**
   - Model: `gemini-2.5-flash-lite`
   - Fuzzy type-to-search syllabus topics across classes 1 through 10.
   - 3 Difficulty tiers: Easy, Medium, Hard (HOTS / Olympiad).
   - 1 minute per question timer with auto-submit.
   - Detailed post-test review with step-by-step explanations.
   - Rate limit: 5 tests per day per student.

4. **Abhyaas AI Doubt Solver & 📸 Google Lens Question Scanner**
   - **Message-Aware AI:** Answers syllabus doubts and verifies official school announcements.
   - **Transient Lens Photo Scan:** Photos are sent directly to the Gemini Vision API and immediately discarded. Never stored in Firestore or Cloud Storage.
   - Generates step-by-step solutions plus 5 follow-up practice MCQs.
   - Rate limit: 20 queries/day per student.

5. **Educational Brain Games (100% Client-Side)**
   - Math Sprint (60s speed math race)
   - Word Scramble (90s vocabulary puzzle from syllabus chapters)
   - Monochrome Snake (14×14 grid with touch D-Pad)
   - Tic-Tac-Toe vs Phone AI (with 25% random mistake chance)
   - High scores persisted in Firestore `gameScores/{uid}`.

6. **Student Performance Profile & Analytics**
   - Recharts visual score trends over time with subject lines and difficulty filter.

7. **WhatsApp Web-Style Admin Panel**
   - Class Manager with live enrollment counts.
   - CSV bulk enrollment with live progress bar, validation, and error reports.
   - Broadcast center with broadcast edit, forward, and deletion controls.
   - Subjects & syllabus management for classes 1 to 10.
   - "View as Student" read-only preview mode.

8. **Theme: Dark / White Monochrome with Light Invert Toggle**
   - Default dark theme (#0B1220 background, #141C2E cards, #28324A borders, white accent).
   - Toggle button on top-right of login screen and profile/settings.

---

## 📋 School Go-Live Checklist

### Demo Stage (Free Tier, ~20 Test Users)
- [x] Zero file upload dependencies: all messages text-only.
- [x] Firestore security rules deployed and active.
- [x] Server-side proxy for Gemini API calls to safeguard API keys.
- [x] Master administrator account initialized.

### Production Scaling (Up to 2,000 Students)
1. **Upgrade Firebase Plan to Blaze:** Link school billing card in the [Firebase Console](https://console.firebase.google.com).
2. **Set Budget Alert:** Configure a billing alert at ₹5,000 / month in Google Cloud Console.
3. **Delete Test Data & CSV-Import Real Students:** Use the CSV upload in Admin Class Manager (`Name,Username,Password,RollNo`).
4. **Audit Security Rules:** Review Firestore Security Rules to confirm read/write boundaries remain strictly attribute-based.
5. **Composite Indexes:** If any custom filtered query prompts an index requirement in browser console, click the generated Firebase link to build the single composite index.
