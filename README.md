# EduMarket Backend ⚙️ — The Enterprise-Grade Marketplace Engine

[![Node.js](https://img.shields.io/badge/Node.js-20-43853D.svg?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000.svg?style=for-the-badge&logo=express)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748.svg?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D.svg?style=for-the-badge&logo=redis)](https://redis.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

EduMarket Backend is a high-performance, scalable, and secure API designed to power the next generation of **Telegram Mini App (TMA)** marketplaces. It orchestrates a complex P2P student freelancer ecosystem with industrial-grade reliability, real-time synchronization, and AI-driven matching logic.

---

## 🏗️ Core Architectural Pillars

### 1. Atomic Task State Machine
Unlike simple CRUD apps, EduMarket relies on a strict **State Machine** for task lifecycles. This ensures business integrity and prevents race conditions in financial transactions.
- **States**: `OPEN` → `ASSIGNED` → `IN_PROGRESS` → `IN_REVIEW` → `COMPLETED`.
- **Validation**: Every transition is checked against role-based access (RBAC) and current state metadata.

### 2. Enterprise Escrow & Ledger System
Trust is enforced through code.
- **Escrow**: Funds (internal ledger) are automatically held when a bid is accepted.
- **Mutual Approval**: Payouts require explicit client approval or moderator intervention.
- **Milestones**: Tasks are broken into smaller, verifiable chunks to reduce risk for both parties.

### 3. AI-Powered Matchmaking (Task DNA)
The engine doesn't just list tasks; it understands them.
- **Vectorization**: Uses NLP algorithms to vectorize task requirements and freelancer profiles.
- **Compatibility Scoring**: Real-time matching based on skills, past performance, and 'Task DNA'.
- **Smart Routing**: High-priority tasks are pushed to 'Elite' freelancers via WebSocket demand spikes.

### 4. Real-Time Synchronization Layer
Built for sub-second responsiveness.
- **Socket.io + Redis**: Distributed WebSocket management allowing the system to scale horizontally across multiple instances.
- **Presence Tracking**: Global real-time 'Online/Offline' status management.
- **Optimistic Updates Sync**: Ensures the sender and receiver UIs are in perfect harmony.

---

## 🛡️ Security & Integrity Suite

-   **Antifraud Engine**: Advanced heuristics to detect fake reviews, duplicate accounts via IP/Device hashing, and bid spamming.
-   **NLP Content Shield**: Integrated filtering that detects and blocks exam-cheating requests, academic dishonesty, and external contact exchange.
-   **Cloudflare R2 Integration**: Secure, private document storage (EduDrive). Files are never public; they are accessed via **60-minute pre-signed URLs** generated on-the-fly.
-   **JWT Stateless Auth**: Robust authentication leveraging Telegram's native `initData` validation with HMAC-SHA256 signatures.

---

## 📐 System Overview

```mermaid
graph TD;
    Client[EduMarket Frontend / TMA] -->|REST API| Gateway[Express API Gateway]
    Client <-->|WebSockets| Socket[Socket.io + Redis]
    
    Gateway --> Auth[JWT & TMA Validator]
    Gateway --> NLP[NLP Filter & Antifraud]
    
    SubGraph Core[Core Modules]
        Auth --> Task[Task Engine]
        Auth --> Payment[Escrow Ledger]
        Auth --> Chat[Real-time Chat]
    End
    
    Task --> Prisma[Prisma ORM]
    Payment --> Prisma
    Prisma <--> DB[(PostgreSQL 16)]
    
    Task -.-> Cache[(Redis Cache)]
    Socket -.-> Cache
    
    Core --> Storage[Cloudflare R2]
    Core --> Notify[Firebase FCM]
```

---

## 🚀 Key Modules Deep-Dive

| Module | Purpose | Key Feature |
| :--- | :--- | :--- |
| **`task`** | Marketplace lifecycle | State Machine validation |
| **`bid`** | Negotiation engine | Counter-offers & Stealth Mode |
| **`chat`** | P2P Communication | File sharing, Reply/Edit, Read Receipts |
| **`file`** | Storage (EduDrive) | CDN caching & Pre-signed access |
| **`vip`** | Monetization | Subscription & Promotion handling |
| **`verification`** | Trust & Safety | AI-assisted ID verification flow |
| **`report`** | Peer Shield | Dispute resolution & Admin CRM |

---

## 🛠️ Installation & Engineering Setup

### Prerequisites
- **Node.js**: v20.x or higher
- **Database**: PostgreSQL v16+
- **Cache**: Redis v7+
- **Cloud**: Cloudflare R2 bucket & Firebase Project

### 1. Repository Setup
```bash
git clone https://github.com/your-username/edumarket-backend.git
cd edumarket-backend
npm install
```

### 2. Environment Configuration
Create a `.env` file from the provided template:
```env
PORT=3000
DATABASE_URL="postgresql://user:pass@localhost:5432/edumarket"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your_secure_random_string"
R2_ACCESS_KEY_ID="xxx"
R2_SECRET_ACCESS_KEY="xxx"
R2_BUCKET_NAME="edudrive"
TELEGRAM_BOT_TOKEN="xxx"
FIREBASE_CREDENTIALS_JSON='{...}'
```

### 3. Database Genesis
```bash
npx prisma generate
npx prisma db push
npm run seed  # Loads categories and initial system settings
```

### 4. Execution
```bash
npm run dev   # Local development with Nodemon
npm run start # Production-ready build
```

---

## 🤝 Contributing & Standards

We maintain a **Senior-level engineering standard**:
- **Linting**: Strict ESLint rules for CommonJS/ESM compatibility.
- **Git Flow**: Feature-branch workflow with descriptive commits.
- **Documentation**: All new services must include architectural summaries.

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
