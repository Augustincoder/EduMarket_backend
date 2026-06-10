# EduMarket Backend ⚙️ — The Enterprise-Grade Marketplace Engine

[![Node.js](https://img.shields.io/badge/Node.js-20-43853D.svg?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000.svg?style=for-the-badge&logo=express)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748.svg?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D.svg?style=for-the-badge&logo=redis)](https://redis.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

EduMarket Backend is a high-performance, scalable, and secure API designed to power the next generation of **Telegram Mini App (TMA)** marketplaces. It orchestrates a complex P2P student freelancer ecosystem with industrial‑grade reliability, real‑time synchronization, and AI‑driven matching logic.

---

## 🏗️ Core Architectural Pillars

### 1️⃣ Atomic Task State Machine
Unlike simple CRUD apps, EduMarket relies on a strict **State Machine** for task lifecycles. This guarantees business integrity and eliminates race conditions in financial transactions.
- **States**: `OPEN → ASSIGNED → IN_PROGRESS → IN_REVIEW → COMPLETED`
- **Validation**: Every transition is checked against role‑based access (RBAC) and current‑state metadata.

### 2️⃣ Enterprise Escrow & Ledger System
Trust is enforced through code.
- **Escrow**: Funds are automatically held when a bid is accepted.
- **Mutual Approval**: Payouts require explicit client approval or moderator intervention.
- **Milestones**: Tasks are broken into verifiable chunks to reduce risk for both parties.

### 3️⃣ AI‑Powered Matchmaking (Task DNA)
The engine doesn’t just list tasks; it understands them.
- **Vectorization**: NLP algorithms turn task requirements and freelancer profiles into high‑dimensional vectors.
- **Compatibility Scoring**: Real‑time matching based on skills, past performance, and “Task DNA”.
- **Smart Routing**: High‑priority tasks are pushed to “Elite” freelancers via WebSocket demand spikes.

### 4️⃣ Real‑Time Synchronization Layer
Built for sub‑second responsiveness.
- **Socket.io + Redis**: Distributed WebSocket management for horizontal scaling.
- **Presence Tracking**: Global real‑time “Online/Offline” status.
- **Optimistic Updates Sync**: Guarantees sender and receiver UI stay in perfect harmony.

---

## 🛡️ Security & Integrity Suite
- **Antifraud Engine**: Heuristics detect fake reviews, duplicate accounts (IP/Device hashing), and bid spamming.
- **NLP Content Shield**: Blocks exam‑cheating requests, academic dishonesty, and external contact exchange.
- **Cloudflare R2 Integration**: Private document storage (EduDrive) accessed via 60‑minute pre‑signed URLs.
- **JWT Stateless Auth**: Uses Telegram’s native `initData` validation with HMAC‑SHA256 signatures.

---

## 📐 System Overview
```mermaid
graph TD;
    Client[EduMarket Frontend / TMA] -->|REST API| Gateway[Express API Gateway];
    Client <-->|WebSockets| Socket[Socket.io + Redis];
    
    Gateway --> Auth[JWT & TMA Validator];
    Gateway --> NLP[NLP Filter & Antifraud];
    
    subgraph Core[Core Modules]
        Auth --> Task[Task Engine];
        Auth --> Payment[Escrow Ledger];
        Auth --> Chat[Real‑time Chat];
    end
    
    Task --> Prisma[Prisma ORM];
    Payment --> Prisma;
    Prisma <--> DB[(PostgreSQL 16)];
    
    Task -.-> Cache[(Redis Cache)];
    Socket -.-> Cache;
    
    Core --> Storage[Cloudflare R2];
    Core --> Notify[Firebase FCM];
```

---

## 🚀 Key Modules Deep‑Dive
| Module | Purpose | Key Feature |
| :--- | :--- | :--- |
| `task` | Marketplace lifecycle | State Machine validation |
| `bid` | Negotiation engine | Counter‑offers & Stealth Mode |
| `chat` | P2P communication | File sharing, Reply/Edit, Read receipts |
| `file` | Storage (EduDrive) | CDN caching & Pre‑signed access |
| `vip` | Monetization | Subscription & Promotion handling |
| `verification` | Trust & Safety | AI‑assisted ID verification flow |
| `report` | Peer Shield | Dispute resolution & Admin CRM |

---

## 🛠️ Installation & Engineering Setup

### Prerequisites
- **Node.js** v20.x or higher
- **PostgreSQL** v16+
- **Redis** v7+
- **Cloudflare R2** bucket & **Firebase** project (for storage & push notifications)

### 1️⃣ Repository Setup
```bash
git clone https://github.com/your-username/edumarket-backend.git
cd edumarket-backend
npm install
```

### 2️⃣ Environment Configuration
Create a `.env` file from the template:
```env
PORT=3000
DATABASE_URL="postgresql://user:pass@localhost:5432/edumarket"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your_secure_random_string"
R2_ACCESS_KEY_ID="xxx"
R2_SECRET_ACCESS_KEY="xxx"
R2_BUCKET_NAME="edudrive"
TELEGRAM_BOT_TOKEN="xxx"
FIREBASE_CREDENTIALS_JSON='{"type":"service_account",...}'
```

### 3️⃣ Database Genesis
```bash
npx prisma generate
npx prisma db push   # Sync schema to PostgreSQL
npm run seed         # Load initial categories and system settings
```

### 4️⃣ Execution
- **Development** (auto‑restart on changes):
```bash
npm run dev   # Uses nodemon + ts-node (if TypeScript) or plain node
```
- **Production** (pre‑compiled, PM2 recommended):
```bash
npm run build   # Transpile / bundle if using Babel/TS
npm start       # Starts the compiled server
```

---

## 🧪 Testing Strategy
- **Unit Tests** – Jest + SuperTest for API routes.
- **Integration Tests** – Run against a temporary PostgreSQL container using `docker-compose`.
- **Load Tests** – k6 scripts simulate concurrent Socket.io connections.
- **CI Pipeline** – GitHub Actions run lint, type‑check, unit & integration tests on each PR.

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: user
          POSTGRES_PASSWORD: pass
          POSTGRES_DB: edumarket
        ports: [5432:5432]
        options: --health-cmd "pg_isready" --health-interval 10s --health-timeout 5s --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint
      - run: npm test
```

---

## 🚀 Deployment Guides

### Vercel (Serverless Functions)
1. Connect repository to Vercel.
2. Set **Build Command**: `npm run build`.
3. Set **Output Directory**: `.` (the root, Vercel will treat `server.js` as the entry point).
4. Add environment variables from `.env` in the Vercel dashboard.

### Docker (Self‑Hosted)
```bash
# Build image
docker build -t edumarket-backend .
# Run container
docker run -p 3000:3000 \
  -e PORT=3000 \
  -e DATABASE_URL="postgresql://user:pass@db:5432/edumarket" \
  -e REDIS_URL="redis://redis:6379" \
  -e JWT_SECRET="secure" \
  -e R2_ACCESS_KEY_ID="xxx" \
  -e R2_SECRET_ACCESS_KEY="xxx" \
  -e R2_BUCKET_NAME="edudrive" \
  -e TELEGRAM_BOT_TOKEN="xxx" \
  -e FIREBASE_CREDENTIALS_JSON='{"type":"service_account",...}' \
  edumarket-backend
```
Use a `docker-compose.yml` to spin up PostgreSQL & Redis alongside the backend.

### PM2 (Production Process Manager)
```bash
npm install -g pm2
pm2 start server.js --name edumarket-backend --watch
pm2 save
pm2 startup   # Generates systemd service
```

---

## 📡 API Reference (High‑Level)
| Endpoint | Method | Auth | Description |
| :--- | :---: | :---: | :--- |
| `/api/v1/auth/login` | POST | ❌ | Validate Telegram `initData`, issue JWT. |
| `/api/v1/tasks` | GET | ✅ | List tasks with optional filters (skill, budget, rating). |
| `/api/v1/tasks/:id` | GET | ✅ | Detailed task view with state & milestones. |
| `/api/v1/tasks/:id/bid` | POST | ✅ | Submit a bid; triggers escrow hold. |
| `/api/v1/chat/:roomId` | WS | ✅ | Real‑time chat via Socket.io (messages, file uploads). |
| `/api/v1/files/upload` | POST | ✅ | Upload to Cloudflare R2, returns pre‑signed URL. |
| `/api/v1/payments/settle/:taskId` | POST | ✅ | Release escrow after client approval. |

> **Note**: All routes are versioned under `/api/v1` and protected by JWT middleware that validates Telegram’s `initData` signature.

---

## 🤝 Contributing & Standards
- **Branching Model**: `main` (production) → `develop` (integration) → feature branches (`feat/xyz`).
- **Commit Messages**: Follow Conventional Commits (e.g., `feat: add escrow withdrawal`).
- **Linting**: `npm run lint` (ESLint with strict rules). Fixed issues must pass `npm run format` (Prettier).
- **Code Review**: At least one senior engineer approval before merge.
- **Documentation**: Every new service must include an architecture diagram and API contract.

---

## 📄 License
This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details.
