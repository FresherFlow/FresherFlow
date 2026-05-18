<h1 align="center">
  <img src="./apps/web/public/main.png" width="38" height="38" align="center" alt="FresherFlow Logo" />
  FresherFlow
</h1>

<p align="center">
  <strong>Empowering freshers to discover their first professional opportunity.</strong><br/>
  <em>Verified, high-performance job discoverability index for students and freshers.</em>
</p>

<p align="center">
  <a href="https://fresherflow.in">
    <img src="https://img.shields.io/badge/Website-000000?style=for-the-badge&logo=google-chrome&logoColor=white" alt="Website" />
  </a>&nbsp;&nbsp;
  <a href="https://github.com/MukeshCheekatla/fresherflow">
    <img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub" />
  </a>&nbsp;&nbsp;
  <a href="https://www.linkedin.com/company/fresherflow-in">
    <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn" />
  </a>&nbsp;&nbsp;
  <a href="https://twitter.com/Fresherflow">
    <img src="https://img.shields.io/badge/Twitter-1DA1F2?style=for-the-badge&logo=x&logoColor=white" alt="Twitter" />
  </a>
  <br/><br/>
  <a href="https://discord.gg/CcPAnWSHD">
    <img src="https://img.shields.io/badge/Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord" />
  </a>&nbsp;&nbsp;
  <a href="https://whatsapp.com/channel/0029VbCkZu6FHWq0qJOOU73D">
    <img src="https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="WhatsApp" />
  </a>&nbsp;&nbsp;
  <a href="https://t.me/fresherflowin">
    <img src="https://img.shields.io/badge/Telegram-26A5E4?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram" />
  </a>&nbsp;&nbsp;
  <a href="https://instagram.com/fresherflow">
    <img src="https://img.shields.io/badge/Instagram-E4405F?style=for-the-badge&logo=instagram&logoColor=white" alt="Instagram" />
  </a>
</p>

---

## 🌊 Our Mission

> FresherFlow started with a simple observation: the best job opportunities are often hidden in plain sight or buried under noise. We built this as a community-first platform where students and freshers help each other by sharing verified links and referrals. **No spam, no fluff—just pure opportunities.**

---

## 📂 Project Structure

The ecosystem is organized as a type-safe **Turborepo** monorepo:

*   **`apps/web`**: Next.js web application with dynamic eligibility matchmaking controls.
*   **`apps/mobile`**: React Native Expo mobile application optimized for job discovery.
*   **`apps/admin-mobile`**: React Native Expo mobile dashboard for immediate opportunity vetting.
*   **`apps/api`**: Node.js/Express secure REST API gateway.
*   **`packages/`**: Shared TypeScript definitions, constants, validation schemas, and database layers.

---

## 🚀 Getting Started

### Prerequisites
*   **Node.js** $\ge$ 20.0.0
*   **npm** $\ge$ 9.0.0

### Run the Project
```bash
# Clone the repository
git clone https://github.com/MukeshCheekatla/fresherflow.git
cd fresherflow

# Install and build dependencies
npm install
npm run db:generate

# Start all applications concurrently
npm run dev
```

---

## 🎮 Core CLI Scripts

| Command | Workspace Scope | Function |
| :--- | :--- | :--- |
| `npm run dev` | Monorepo Root | Launches active Web and API development servers concurrently |
| `npm run build` | Monorepo Root | Builds all workspace applications and shared packages for production |
| `npm run lint` | Monorepo Root | Performs strict linting and code-hygiene verification |
| `npm run typecheck` | Monorepo Root | Validates TypeScript compilation across all projects |

---

## 📄 License

Distributed under the **MIT License**. See [LICENSE](./LICENSE) for details.

---

<p align="center">
  <strong>Built with discipline. Optimized for students.</strong>
</p>
