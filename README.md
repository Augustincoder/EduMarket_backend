<div align="center">
  <br />
  <h1>EduMarket Backend ⚙️</h1>
  <p><strong>The Engine Powering the Enterprise Freelancer Ecosystem</strong></p>
  <p>
    <img src="https://img.shields.io/badge/Node.js-20-43853D.svg?style=flat-square&logo=node.js" alt="Node.js" />
    <img src="https://img.shields.io/badge/Express-4.x-000000.svg?style=flat-square&logo=express" alt="Express" />
    <img src="https://img.shields.io/badge/Prisma-5-2D3748.svg?style=flat-square&logo=prisma" alt="Prisma" />
    <img src="https://img.shields.io/badge/PostgreSQL-16-336791.svg?style=flat-square&logo=postgresql" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/Redis-7-DC382D.svg?style=flat-square&logo=redis" alt="Redis" />
  </p>
</div>

<br />

## 📖 Table of Contents
- [Overview](#-overview)
- [Enterprise Capabilities](#-enterprise-capabilities)
- [System Architecture](#-system-architecture)
- [Database Schema](#-database-schema)
- [Environment Variables](#-environment-variables)
- [Development Setup](#-development-setup)
- [Key Workflows](#-key-workflows)

---

## 🌟 Overview
The EduMarket Backend is a highly scalable, secure REST API built with Node.js and Express. It serves as the single source of truth for the Telegram-native EduMarket ecosystem, handling real-time WebSockets, transactional data mutations, payment webhooks, and AI-driven match-making algorithms.

---

## 🚀 Enterprise Capabilities
- **AI-Powered Matchmaking**: Intelligent NLP algorithms to match tasks with the perfect freelancer based on 'Task DNA'.
- **Atomic State Machine**: Bullet-proof state transitions for Tasks (Open -> Assigned -> In Progress -> Review -> Completed) ensuring no race conditions.
- **Milestone Engine**: Secure, multi-stage task delivery tracking requiring mutual approval, protecting both client and freelancer.
- **Dispute Resolution (CRM)**: Fully-fledged admin tools for Peer Quality Shield, allowing moderators to review reports, evidence, and apply financial adjustments.
- **Real-Time Presence**: Instant push notifications (via Firebase Admin SDK) and sub-second chat delivery (via Socket.io backed by Redis Pub/Sub).
- **Scalable Infrastructure**: Ready for horizontal scaling with separated stateless API nodes and stateful Redis clusters.

---

## 📐 System Architecture

```mermaid
graph TD;
    Client[EduMarket Frontend / Telegram App] -->|HTTPS REST| API[Express API Gateway]
    Client <-->|WSS| Socket[Socket.io Server]
    
    API --> Auth[Auth & RBAC Middleware]
    API --> Logic[Business Logic / Services]
    
    Logic -->|ORMs| Prisma[Prisma Client]
    Prisma <--> DB[(PostgreSQL)]
    
    Logic -.->|Cache / Limits| Redis[(Redis Cluster)]
    Socket -.->|Presence / PubSub| Redis
    
    Logic -->|Webhooks| Payments[Click / Payme APIs]
    Logic -->|S3 Protocol| R2[Cloudflare R2 Storage]
```

---

## 🗄 Database Schema (Highlights)
The database is managed via Prisma ORM. Key entity relations include:
- `User`: Handles dual-roles (Client / Freelancer) with strict RBAC.
- `Task` & `Bid`: Core marketplace entities linked by a custom `TaskStateMachine`.
- `Milestone`: Sub-tasks tied to `Task` for segmented deliveries.
- `ChatRoom` & `Message`: Real-time communication tables.
- `Report` & `Dispute`: Admin CRM entities for quality control.
- `Reputation` & `Portfolio`: Freelancer verifiability metrics.

---

## 🔐 Environment Variables

Create a `.env` file in the root directory:

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | The port the API runs on | `5000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Secret for signing Auth tokens | `super-secret-key-123` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 Credentials | `xxx` |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 Credentials | `xxx` |
| `FIREBASE_PROJECT_ID` | FCM Push Notifications | `edumarket-123` |

---

## 🛠 Development Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Database Setup**
   ```bash
   # Push schema to the database
   npx prisma db push
   
   # Generate Prisma Client
   npx prisma generate
   ```

3. **Start the Development Server**
   ```bash
   # Run with nodemon
   npm run dev
   ```

4. **Linting**
   ```bash
   npm run lint
   ```

---

## ⚙️ Key Workflows

### 1. Task Creation & Bidding
When a client creates a task, the AI Matchmaking service vectorizes the requirements and notifies eligible freelancers. Bids are securely isolated, and clients can leverage **Stealth Mode** to hide their identity during negotiations.

### 2. The Escrow & Milestone Flow
Once a bid is accepted, the task enters the `IN_PROGRESS` state. Freelancers submit work via Milestones. Clients review the deliverables and approve them, which triggers internal ledger updates (and eventual payout).

### 3. File Uploads (Cloudflare R2)
All media and delivery files are streamed securely to Cloudflare R2 object storage. Pre-signed URLs are utilized for temporary read access to ensure data privacy.
