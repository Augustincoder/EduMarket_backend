# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
