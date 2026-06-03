<table>
  <tr>
    <td width="100" valign="center" style="border: none;">
      <img src="apps/web/public/icon-512x512.png" alt="FresherFlow" width="100" style="border-radius: 20px;" />
    </td>
    <td valign="center" style="border: none; padding-left: 20px;">
      <h1 style="margin: 0; padding: 0; border: none;">FresherFlow</h1>
      <p style="margin: 5px 0; font-size: 1.1em;">A verified, high-performance job and walk-in discovery engine tailored for graduates and students across India. Built as a fully type-safe TypeScript monorepo.</p>
    </td>
  </tr>
</table>

---

<p align="center">
  <a href="https://fresherflow.in">
    <img src="https://img.shields.io/badge/Website-000000?style=for-the-badge&logo=google-chrome&logoColor=white" alt="Website" />
  </a>
  <a href="https://github.com/MukeshCheekatla/FresherFlow">
    <img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub" />
  </a>
  <a href="https://discord.gg/CcPAnWSHD">
    <img src="https://img.shields.io/badge/Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord" />
  </a>
  <a href="https://t.me/fresherflowin">
    <img src="https://img.shields.io/badge/Telegram-26A5E4?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram" />
  </a>
  <a href="https://whatsapp.com/channel/0029VbCkZu6FHWq0qJOOU73D">
    <img src="https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="WhatsApp" />
  </a>
  <a href="https://www.linkedin.com/company/fresherflow-in">
    <img src="https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn" />
  </a>
  <a href="https://x.com/Fresherflow">
    <img src="https://img.shields.io/badge/X-000000?style=for-the-badge&logo=x&logoColor=white" alt="X" />
  </a>
  <a href="https://instagram.com/fresherflow">
    <img src="https://img.shields.io/badge/Instagram-E4405F?style=for-the-badge&logo=instagram&logoColor=white" alt="Instagram" />
  </a>
  <a href="https://www.facebook.com/FresherFlow.in">
    <img src="https://img.shields.io/badge/Facebook-1877F2?style=for-the-badge&logo=facebook&logoColor=white" alt="Facebook" />
  </a>
</p>

---

### 🛠️ Core Technology Stack

- 🌐 **Frontend**: **Next.js 16** (App Router Web Portal), **React Native with Expo** (User Mobile App & Admin Moderation Mobile)
- ⚙️ **Backend**: **Node.js** with **Express** API Gateway, **TypeScript** (Strict Mode)
- 🚀 **Queues & Background Processing**: **BullMQ** task scheduler and asynchronous worker processors
- 📦 **Monorepo Manager**: **Turborepo** with high-performance **pnpm** workspaces
- 🗄️ **Database & Cache**: **PostgreSQL** database (via type-safe **Prisma ORM**), **Redis** for queue state and caching

---

## 📱 Android Release & Installation

The mobile app is optimized for high-performance and instant updates.

### 📥 Direct APK Download
You can download and install the absolute latest release directly to your Android device:
👉 **[Download Latest Android APK](https://github.com/MukeshCheekatla/FresherFlow/releases/latest/download/FresherFlow.apk)**

> [!NOTE]
> When installing, you might need to enable **"Install from Unknown Sources"** in your Android security settings, as the app is compiled as a standalone internal distribution build.

### ⚙️ EAS Staging & Production Builds
For developers and internal testers:
- **Staging Channel**: Custom test builds listening exclusively to the `staging` OTA update branch.
- **OTA Hot Reloads**: Hot-fix JS changes can be served instantly using:
  ```bash
  cd apps/mobile
  eas update --branch staging --message "OTA Staging hot-fix"
  ```
- **Promotion to Production**: Repromote verified staging JS bundles straight to production with zero binary compile delays:
  ```bash
  eas update:republish --from-branch staging --to-branch production
  ```

---

## 📂 Monorepo Organization

The project uses Turborepo with `pnpm` workspaces to maintain isolation across applications and shared packages:

```
├── apps/
│   ├── web/            # Next.js web portal (port 3000)
│   ├── mobile/         # User mobile application (React Native / Expo)
│   ├── admin-mobile/   # Moderation and administrative mobile portal
│   ├── api/            # Central backend REST gateway (port 5000)
│   ├── worker/         # BullMQ background task processor (port 5001)
│   └── ingestion/      # Data scrapers and scheduled pollers (port 5002)
├── packages/
│   ├── database/       # Prisma models, migrations, and PostgreSQL client
│   ├── types/          # Shared TypeScript interfaces (Source of Truth)
│   ├── ui/             # Reusable UI component configurations & design tokens
│   ├── domain/         # Core business logic & suitability matching helpers
│   ├── api-client/     # Standardized Axios/API SDK wrapper for frontends
│   └── parser/         # NLP pattern-matching pipeline to parse job listings
```

---

## 🖼️ Application Preview

<table width="100%">
  <tr>
    <td width="50%" align="center">
      <b>Opportunity Discovery</b><br/>
      <img src="apps/web/public/screenshots/discover.png" alt="Discover Feed" width="280" />
    </td>
    <td width="50%" align="center">
      <b>Structured Details</b><br/>
      <img src="apps/web/public/screenshots/details.png" alt="Job Details" width="280" />
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <b>Interactive Actions</b><br/>
      <img src="apps/web/public/screenshots/overlay.png" alt="Filters & Actions" width="280" />
    </td>
    <td width="50%" align="center">
      <b>Sharing Canvas</b><br/>
      <img src="apps/web/public/screenshots/shares.png" alt="Share Generator" width="280" />
    </td>
  </tr>
</table>

---

## 🚀 Getting Started

Ensure you have [pnpm](https://pnpm.io/) installed globally.

1. **Setup & Onboarding Guide**: Refer to our comprehensive [Setup Guide](./docs/setup.md) to set up your environment files (`.env`).
2. **Install Dependencies**:
   ```bash
   pnpm install
   ```
3. **Spin Up Development Servers**:
   ```bash
   pnpm dev
   ```
   *This single command starts the Next.js web portal, mobile builder, backend API, background worker, and ingestion runner concurrently.*

### 🛠️ Common Utility Commands

| Script | Purpose |
| :--- | :--- |
| `pnpm dev:web` | Run only the Next.js web application |
| `pnpm dev:mobile` | Run only the user Expo mobile application |
| `pnpm dev:api` | Run only the REST API express server |
| `pnpm build` | Builds all packages and services for production |
| `pnpm typecheck` | Validates TypeScript types across the workspaces |
| `pnpm db:generate` | Generates the local Prisma Client |

---

## 🗺️ Product Roadmap

We are actively driving towards our Mobile MVP release. To view our milestones, current checklist, and contributor guidelines, check:
👉 **[Launch Roadmap](./ROADMAP.md)**

---

## 🤝 Contributing

We welcome community contributions! Please read our [Contributing Guide](./CONTRIBUTING.md) to learn how to:
1. Fork the repo and set up your local development environment.
2. Follow our commit message guidelines ([Commit Playbook](./docs/commit.md)).
3. Pick up open issues and submit pull requests.

---

## ⚖️ License

Distributed under the **MIT License**. See [`LICENSE`](./LICENSE) for more details.

