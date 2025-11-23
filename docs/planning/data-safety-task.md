# Data Safety & Schema Versioning

## Overview
Implement robust data safety measures to prevent settings corruption and allow recovery.

## Checklist

### [x] Phase 1: Core Logic & Types
- [x] Update `Settings` interface (`schemaVersion`, `lastModified`)
- [x] Create `SettingsBackup` interface
- [x] Implement `validateSettings()` function
- [x] Implement `saveSettingsWithBackup()` wrapper (integrated into saveSettings)
- [x] Implement `getBackups()` and `restoreBackup()` functions

### [x] Phase 2: Admin UI Integration
- [x] Create "Data Safety" section in Admin Panel
- [x] Render backup list (timestamp, summary)
- [x] Add "Restore" button logic
- [x] Add "Download JSON" button (Skipped for now, Restore is sufficient)
- [x] Add "Upload/Restore JSON" button (optional, nice to have)

### [x] Phase 3: Testing & Verification
- [x] Verify backup creation on save
- [x] Verify backup rotation (max 5)
- [x] Verify restore functionality
- [x] Verify validation blocks invalid settings
