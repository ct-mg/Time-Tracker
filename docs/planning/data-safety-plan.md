# Implementation Plan: Data Safety & Schema Versioning

## Goal Description
Prevent data loss and corruption of critical settings (like `employeeGroupId` or `userHoursConfig`). Implement a robust safety net with schema versioning, automatic backups before changes, and a recovery mechanism.

## User Review Required
> [!IMPORTANT]
> This change introduces a new storage key `time_tracker_settings_backups` to store the last 5 versions of settings.
> A new "Data Safety" section will be added to the Admin Panel (bottom) to view and restore backups.

## Proposed Changes

### Core Logic (`src/entry-points/admin.ts`)

#### [MODIFY] Settings Interface
- Add `schemaVersion: number` (default: 1)
- Add `lastModified: number` (timestamp)
- Add `modifiedBy: string` (optional, user ID/name)

#### [NEW] Backup System
- Create `SettingsBackup` interface
- Implement `createSettingsBackup(settings)`
- Implement `saveSettingsWithBackup(newSettings)` wrapper
- Store backups in `time_tracker_settings_backups` (array, max 5)

#### [NEW] Validation
- Implement `validateSettings(settings)`
- Check for critical fields (`employeeGroupId` if set, `userHoursConfig` integrity)
- Prevent save if validation fails

### Admin UI (`src/entry-points/admin.ts`)

#### [MODIFY] Admin Panel
- Add "Data Safety & Recovery" section at the bottom (collapsed by default?)
- List last 5 backups with timestamp and summary (e.g. "Changed 2 employees")
- "Restore" button for each backup
- "Download Settings JSON" button (manual backup)

## Verification Plan

### Automated Tests
- N/A (Manual verification preferred for UI/Storage)

### Manual Verification
1. **Backup Creation:** Change a setting -> Verify new backup appears in list.
2. **Rotation:** Change settings 6 times -> Verify only last 5 backups exist.
3. **Recovery:** Restore an old backup -> Verify settings are reverted (e.g. change hours, restore, check hours).
4. **Validation:** Try to save invalid settings (programmatically) -> Verify error.
5. **Data Persistence:** Reload page -> Verify backups persist.
