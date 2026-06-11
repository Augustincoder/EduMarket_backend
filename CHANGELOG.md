# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## 2.2.0 (2026-06-11)


### Features

* **admin:** Full admin API, Prisma schema changes, controllers, auth modifications ([f679418](https://github.com/Augustincoder/EduMarket_backend/commit/f679418c37fde9b416eec97ae4b1d8f4c234577c))
* backend updates ([208ca3c](https://github.com/Augustincoder/EduMarket_backend/commit/208ca3c4285c9c804647c4739fc6d4b8bb7b0985))
* **category:** Dynamic categories schema and API implementation ([959ca72](https://github.com/Augustincoder/EduMarket_backend/commit/959ca72970e85aaac4135e875118bea0d5b76026))
* implement admin management, onboarding flows, and bot notification handlers ([441cc11](https://github.com/Augustincoder/EduMarket_backend/commit/441cc1155848daa38f9fb229df31b7457cbf355c))
* implement chat system with real-time messaging, notification support, and profile management features ([8c4bed0](https://github.com/Augustincoder/EduMarket_backend/commit/8c4bed04891943fe2650ab27728ef48bc446b2e9))
* implement core services for bidding, chat, tasks, authentication, and notifications with database schema initialization. ([0afeb00](https://github.com/Augustincoder/EduMarket_backend/commit/0afeb00bf692a1c1158351bc123f2fe0536950a7))
* implement core task and profile services with Prisma schema and modular controllers ([8ab7d5d](https://github.com/Augustincoder/EduMarket_backend/commit/8ab7d5d091a3bdfc8d0d97eb5ad72c21241da323))
* implement enterprise plan phases 1-8 ([d1961b3](https://github.com/Augustincoder/EduMarket_backend/commit/d1961b376ab18ac68487d236280b8775e6e73a5f))
* implement file management system with Cloudflare R2 integration and version bump to 2.0.0 ([19d78b3](https://github.com/Augustincoder/EduMarket_backend/commit/19d78b36fda1ba838db4aa76a1843f1bb5435394))
* implement file management, profile services, and task controller modules ([fea1bf6](https://github.com/Augustincoder/EduMarket_backend/commit/fea1bf6a5eb76d69f571747ce0e80ed2eb91ca84))
* implement file management, task processing, notification services, and socket configuration ([f9adc33](https://github.com/Augustincoder/EduMarket_backend/commit/f9adc3306e92b04aeca826a8f13dfc7ed47336f8))
* implement multi-channel notification service and task controller logic ([0dd3703](https://github.com/Augustincoder/EduMarket_backend/commit/0dd3703aae5ffc2cbabe568703a5d4869365ed8c))
* implement multi-channel notification service with Telegram and Firebase push support ([a2f97df](https://github.com/Augustincoder/EduMarket_backend/commit/a2f97df55e4bef3e000a0b7d5ceaa163e28911de))
* implement profile service with user data retrieval, referral management, leaderboard, and push token updates ([60688a9](https://github.com/Augustincoder/EduMarket_backend/commit/60688a9addb038eff6205d184ca29ecbf5eadaa9))
* implement profile service with user management, referral tracking, and leaderboard functionality ([d3f39ee](https://github.com/Augustincoder/EduMarket_backend/commit/d3f39eecee861a28b1ad677d3609a6a60002bbaf))
* implement real-time chat module with Socket.io, database schema, and offline notifications ([abd5997](https://github.com/Augustincoder/EduMarket_backend/commit/abd5997f4a04fcf445e969e1c923b38e47f82267))
* implement real-time chat service and user verification module with admin functionality, addes cloudflare storage system ([4406d29](https://github.com/Augustincoder/EduMarket_backend/commit/4406d297906977ced9a94735d216140573f4f748))
* implement user profile management, background task scheduling, and Firebase-based push notification service ([080c58e](https://github.com/Augustincoder/EduMarket_backend/commit/080c58e573eec462a0817e718de130bbb35b63e3))
* user verification system and role-aware chat ([55ed354](https://github.com/Augustincoder/EduMarket_backend/commit/55ed3547e3f94564e1fa6792a5ea12b039e97e9f))
* v1.1.0 stability and cross-platform enhancements ([2f4deb4](https://github.com/Augustincoder/EduMarket_backend/commit/2f4deb4875ea0364be08c6474c3bd8d5ec47eab5))


### Bug Fixes

* **chat:** xabar yuborish sxemasi, online status va telegram bildirishnomalari to'liq sozlandi ([559f93c](https://github.com/Augustincoder/EduMarket_backend/commit/559f93c22b90581bd17930c28322400e41a500ab))
* expanded allowed mime types for webm audio and enforced vercel 4mb limit ([9d56d11](https://github.com/Augustincoder/EduMarket_backend/commit/9d56d1157b2a26203bcaf1b4316c558c91eb2a8e))
* remove mock auth & use native fetch for telegram file upload to prevent AggregateError ([ac56c7a](https://github.com/Augustincoder/EduMarket_backend/commit/ac56c7af636a15d571665aa7156ff976a725a813))
* resolve fileTypeFromBuffer import issue for file uploads ([0ff77ed](https://github.com/Augustincoder/EduMarket_backend/commit/0ff77edc04874847ef581f4bd62231aecd2398b7))
* verification module imports and user ID field names ([f9e5f22](https://github.com/Augustincoder/EduMarket_backend/commit/f9e5f22ce58221a088b23338c6f92c7af76f2dc4))

## [2.0.0] - 2026-06-07

### Added
- **Architectural Documentation**: Comprehensive Open-Source README mapping core pillars: Atomic State Machine, Escrow Ledger, and AI Matchmaking.
- **Enterprise Standards**: Formalized module-based structure documentation and developer contribution guidelines.
- **Security Audit**: Verified all critical service transitions for concurrency safety and transactional integrity.

### Changed
- **Task DNA v2**: Enhanced vectorization logic for more accurate freelancer recommendations.
- **EduDrive Hardening**: Optimized Cloudflare R2 pre-signed URL generation with strict 60-minute TTL and CDN-aware caching.

## [1.2.0] - 2026-06-06

### Added
- **Enterprise APIs**: Implemented APIs for Phase 1-8 of the Enterprise Plan.
- **AI Matchmaking**: Intelligent NLP algorithms in `ai.service.js` to match tasks with freelancers.
- **Milestone Management**: Secure multi-stage task delivery system endpoints (`milestone.controller.js`, `milestone.router.js`).
- **State Machine**: Robust atomic state transitions for task lifecycle (`task.stateMachine.js`).

### Changed
- **Prisma Schema**: Extended database schema to support AI insights, Disputes, Milestones, and Reputation Passports.
- **Task Service**: Refactored task creation and fetching to seamlessly integrate with the new AI engine and state machine.

## [1.1.0] - 2026-06-05

### Added
- **Referral Generation Fallback**: Implemented automated referral code generation in `getProfile` and `getReferrals` for legacy users.
- **Stability**: Added `getReferrals` service implementation to support frontend referral tracking features.

### Changed
- **Cross-Platform Audio Support**: Expanded `ALLOWED_TYPES` whitelist to include `audio/mp4`, `audio/aac`, and `video/mp4` to support native iOS voice recordings.

## [1.0.0] - 2026-06-05

### Added
- **Firebase Admin SDK**: Integrated real push notifications for Android, iOS, and Web.
- **Push Token API**: New endpoint `POST /api/v1/users/me/push-token` for device registration.
- **Task Promotion**: Implemented "Pin to Top" logic with `promotedUntil` field in Tasks.
- **Auto-Cleanup**: Hourly cron job to clear expired task promotions and handle stale task auto-completion.
- **Enhanced Search**: Updated task listing service to support prioritized sorting for promoted tasks.
- **Voice Message Support**: Whitelisted audio MIME types and updated schemas to handle voice messages natively.
- **Real-time Presence**: Integrated Redis-backed online status tracking for Socket.io.
- **Admin CRM APIs**: New endpoints for user management, disputes, and system-wide settings.
- **Infrastructure**: Configured Sentry Node SDK (ready for link-up) and professional Winston logging.

### Changed
- **Schema Evolution**: Major Prisma migration to sync with Phase 14-16 features.
- **Security**: Hardened Auth middleware with token blacklisting and device fingerprinting support.
- **Validation**: Strict Zod schemas for all critical input fields.

### Fixed
- **BigInt Serialization**: Resolved JSON.stringify issues for Postgres BigInt (Telegram IDs).
- **Concurrency**: Implemented atomic state transitions using Prisma transaction filters.

## [0.0.0] - Initial Prototype
- Initial implementation of the marketplace core.
