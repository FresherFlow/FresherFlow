# FresherFlow Development Roadmap

This document outlines the milestones and launch goals for FresherFlow. Our absolute priority right now is completing and stabilizing the **Mobile MVP**.

---

## 🎯 Current Milestone: Mobile MVP Launch
Our target is to ship a stable, high-performance mobile application for job/walk-in discovery to the App Store and Google Play Store.

### 1. Authentication & Session Vetting
- [x] Firebase Anonymous auth & API handshake.
- [x] Google Auth integration for user registration.
- [ ] Stabilize user session retention and token refreshing.

### 2. Core Social & Community Features
- [x] Public, ungated feed viewing.
- [x] Basic profile verification (academic batch, degree, skills).
- [ ] Direct applying / clipboard-sharing of verified links.
- [ ] Post moderation & contributor workflows.

### 3. Polish & Optimization
- [x] FlashList 60FPS scroll performance.
- [x] Local feed offline cache.
- [ ] Rich push notification alerts (via Expo Notification service).

---

## 🚀 Future Milestones

### Milestone 2: Contributor Expansion
- Open community posting interface.
- Launch gamification / share queue mechanisms.
- Contributor rating and verification score indexing.

### Milestone 3: Automated Ingestion & Processing
- Refine parsing accuracy using robust heuristics (`@fresherflow/parser`).
- Auto-extract eligibility rules from raw career blocks.
- Automated dead-link checking and post-expiration crons.
