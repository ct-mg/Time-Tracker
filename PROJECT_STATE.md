# Project State

**Last Updated:** 2026-01-27 19:30
**Current Phase:** Phase 10 - Polish & Advanced Features
**Current Focus:** Performance, Statistics & Data Integrity

## Active Content
- **Branch:** `rewrite/vue`
- **Active Feature:** Absences Integration, Statistics Enhancements, Confirmation Modals, Improved Exports

## Session Handoff - 2026-01-27 19:30
**Feature:** Statistics, Absences & Test Stabilization
**Branch:** `rewrite/vue`
**Status:** 95% done (Vue migration stabilization)

### Was wurde gemacht:
- **Test Stabilization:** KV-Store tests fixed (all 13 passing), added unit tests for Absences store.
- **Statistics Enhancements:** 
  - `useStatistics` now includes **Absences** (that count as work time).
  - **Active Timer** inclusion in real-time stats.
  - Added "Remaining Hours" calculation to all cards.
- **UI/UX Polish:**
  - Implemented `ConfirmationModal` for safe deletions.
  - Added 7-day work time chart to Reports view.
- **Data Export:**
  - Upgraded CSV/Excel export to use `xlsx` library.
  - Added User Name attribution to exported files.

### Nächste Schritte:
1. Finish PDF Export (Basic implementation).
2. Advanced Admin Features (Backup verification, Manager assignments).
3. Visual polish for the active timer (heartbeat animation).
4. E2E tests with Playwright.


## Session Handoff - 2025-12-19 14:00
**Feature:** Notification System Refactoring
**Branch:** feature/notification-refactor -> develop
**Status:** 100% done / Merged to develop

### Was wurde gemacht:
- **Notification Centralization:**
  - Created `src/utils/notifications.ts` (NotificationService class).
  - Replaced all ad-hoc `showNotification` calls with centralized service.
  - Removed old DOM-based notification function from `main.ts`.
- **Internationalization (i18n):**
  - Added ~35 new translation keys to `de.json` and `en.json`.
  - Replaced all hard-coded English notification strings with `t()` calls.
- **Bug Fixes:**
  - Fixed "Bulk Import" row deletion bug (reverted due to complexity, out of scope for this branch).
  - Fixed build errors related to sed replacement mishap.

### Nächste Schritte:
1. Delete local feature branch (if not already done).
2. Continue with "Polish & Testing" phase.
3. Observe "Bulk Import" deletion issue in future (removed regression fixes).

### Wichtige Files:
- `src/utils/notifications.ts` (New service)
- `src/entry-points/main.ts` (Refactored)
- `src/entry-points/admin.ts` (Refactored)

### Offene Fragen:
- None.

### Bugs/Issues:
- Pre-populated bulk import rows cannot be deleted due to ID collision (fix was reverted to prioritize notification merge).
