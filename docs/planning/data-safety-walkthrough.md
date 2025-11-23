# Walkthrough: Data Safety & Recovery

We have implemented a robust data safety system to prevent settings corruption and allow easy recovery.

## Features

### 1. Automatic Backups
Every time you save settings (General or Group), a backup is automatically created.
- Stores the last 5 versions.
- Includes timestamp and summary of changes.

### 2. Validation
Before saving, settings are validated to ensure critical fields (like `employeeGroupId`) are not missing or invalid.

### 3. Recovery UI
A new section "Data Safety & Recovery" in the Admin Panel allows you to:
- View backup history.
- Restore any previous version with one click.

## How to use

1. Go to **Admin Settings**.
2. Scroll to the bottom.
3. See **Data Safety & Recovery**.
4. Click **Restore** on a backup entry to revert settings.

## Technical Details
- **Storage:** Backups are stored in a separate KV store category `settings_backups`.
- **Schema Versioning:** Settings now track `schemaVersion` for future migrations.
