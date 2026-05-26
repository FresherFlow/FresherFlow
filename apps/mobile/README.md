# 📱 FresherFlow Mobile App

<div align="center">
  <img src="./assets/adaptive-icon.png" width="120" alt="FresherFlow Logo" />
</div>

<p align="center">
  <b>The ultimate job discoverability and career tracking platform for freshers.</b><br>
  A high-performance React Native application designed to help entry-level professionals discover opportunities, track applications, and engage with a community of peers.
</p>

---

## ✨ Core Features

FresherFlow Mobile is structured around 5 core pillars:

1. **Job Feed & Discovery**
   - **Curated Feeds**: Browse through "For You", "Trending", "Remote", and "2026 Batch" tailored lists.
   - **Explore Tab**: Search for specific companies, roles, and community-curated job boards.
   - **Job Details**: Rich job descriptions with instant saving and one-tap external apply flows.

2. **Career Profile & Tracking**
   - **Career Profile**: Manage your education, skills, and job preferences.
   - **Application Tracker**: A built-in Kanban-style board to track your job applications (Applied, Interviewing, Offered, Rejected).
   - **Followed Companies**: Keep track of hiring updates from your favorite employers.

3. **Community & Social**
   - **Share Opportunities**: Found a hidden gem? Share job links instantly with the community.
   - **Contributor Profiles**: See who is actively sharing opportunities and follow their updates.
   - **Notifications**: Real-time push notifications for new matching jobs and community interactions.

4. **Contextual Authentication**
   - **Guest-First Experience**: Users can browse the feed and explore jobs entirely anonymously.
   - **Contextual Auth**: The Auth modal only appears when attempting a gated action (like saving a job or setting up alerts), removing onboarding friction.

5. **Premium Aesthetic & Customization**
   - **True Dark/Light Modes**: Integrated with an elite `currentTheme` token system.
   - **UI Customization**: Fine-grained Appearance settings and Alert preferences.

---

## ⚡ Architecture & Performance

This application is built with a "Performance First" philosophy, architected to mimic the fluid, non-blocking UI interactions of premium native apps like Telegram:

* **Dual-Layer Tab Navigation**: Utilizes native C++ `ViewPager` (Android) and `UIPageViewController` (iOS) via `react-native-pager-view` for ultra-smooth physical swipes, decoupled from heavy JS React state hydration.
* **Aggressive List Virtualization**: Uses `@shopify/flash-list` with strict memory bounding to prevent Garbage Collection churn and lag during rapid feed scrolling.
* **Zero-Bridge Animations**: Uses `moti` and `react-native-reanimated` for fully native-driven UI animations (tab indicators, loaders, bottom sheets).
* **Local-First State**: Driven by `zustand` for global state and `AsyncStorage` for offline-capable caching (e.g., Saved Jobs, Profile Data).

---

## 🛠️ Tech Stack

* **Core**: React Native, Expo, TypeScript
* **Navigation**: React Navigation (Native Stack & Bottom Tabs)
* **UI Components**: `lucide-react-native`, `react-native-reanimated`, `moti`
* **Lists & Gestures**: `@shopify/flash-list`, `react-native-pager-view`
* **State & Data**: `zustand`, `@fresherflow/api-client`, Firebase (RTDB & Auth)
* **Infrastructure**: Expo EAS (OTA Updates, Build Pipelines), Sentry (Crash Reporting)

---

## 🚀 Getting Started

### 1. Environment Setup
Copy the example environment file and configure your API/Firebase keys:
```bash
cp .env.example .env
```

### 2. Install Dependencies
Run from the monorepo root to properly link workspace packages:
```bash
pnpm install
```

### 3. Run the App

**For Local Development (Expo Go / Dev Client):**
```bash
# Starts the Metro bundler
pnpm --filter mobile start
```
*Press `a` to run on Android emulator or `i` to run on iOS simulator.*

**To Build & Run Native Code (Recommended for profiling):**
*Ensure your Android Emulator is running or your physical device is connected via ADB.*
```bash
# Compiles the native android/ directory and installs the APK
pnpm --filter mobile run android
```

---

## 📂 Project Structure

```text
apps/mobile/
├── assets/                 # Adaptive icons, splash screens, and static images
├── android/                # Native Android code (generated via prebuild)
├── ios/                    # Native iOS code (generated via prebuild)
└── src/
    ├── components/         # Shared, reusable UI components
    ├── config/             # Environment, API, and third-party configuration
    ├── contexts/           # Global React Contexts (Theme, UI, Toast)
    ├── hooks/              # Data fetching, auth handshakes, and business logic
    ├── navigation/         # React Navigation stacks and unified AppNavigator
    ├── screens/            # Full-page view controllers:
    │   ├── auth/           # Login, Onboarding, Choose Username
    │   ├── discovery/      # Job Details, Company Details, Contributors
    │   ├── feed/           # Main Feeds, Explore, Saved Jobs
    │   ├── profile/        # Career Profile, Skills, Dashboards
    │   ├── settings/       # App Tracker, Appearance, Alerts, Legal
    │   └── social/         # Notifications, Sharing, Invites
    ├── store/              # Zustand global state slices
    ├── system/             # The FresherFlow Premium Design System primitives
    └── utils/              # Match scoring, notification handlers, and cache helpers
```

---

## 🤝 Contribution Guidelines

1. **Design System Adherence**: All UI components must use the `src/system/` primitives to maintain the premium aesthetic. 
   - Never hardcode hex colors. Use `currentTheme.colors.*`.
   - Use `mScale()` from `system/constants/dimensions.ts` for all padding, margins, and font sizes to ensure perfect scaling across all device screen densities.
2. **Performance Testing**: When modifying feed screens or list items, test on a physical device. Performance regressions in list rendering or swiping will block PR merges.
3. **Commit Standards**: Follow the monorepo `docs/commit.md` guidelines for all commits.
