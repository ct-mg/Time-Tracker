# Production Version - Stable

**Date:** 2025-11-26  
**Status:** ✅ STABLE & PRODUCTION READY

## Git References

### How to return to this stable version:

```bash
# Option 1: Via Tag (recommended)
git checkout production-stable-2025-11-26

# Option 2: Via Branch
git checkout production

# Option 3: Via specific commit
git checkout ae92113
```

---

## What's Included in This Version

### ✅ Core Features
- ✅ **Time Tracking** - Clock in/out, manual entries, break tracking
- ✅ **Bulk Edit** - Edit multiple time entries at once
- ✅ **i18n Support** - German and English translations
- ✅ **Categories** - Work categories with color coding
- ✅ **Absences** - Vacation and absence tracking
- ✅ **Reports** - IST vs SOLL, category breakdown, exports

### ✅ Recently Added (Cherry-picked)
- ✅ **User Filter for Managers** - Managers can filter entries by employee
- ✅ **Admin Panel Language Fixes** - All language initialization bugs fixed
  - Language field in default admin settings
  - Language type imports
  - Admin panel language initialization
  - Restored deleted translation keys

### ❌ Deliberately Excluded
- ❌ **Dark Mode** - Excluded due to critical CSS parsing bugs and HTML formatting issues

---

## Known Working State

This version has been tested and confirmed to work without errors:
- ✅ Extensions loads at `http://localhost:5173/extensions/timetracker/`
- ✅ No esbuild/TypeScript parsing errors
- ✅ All tabs functional (Dashboard, Time Entries, Absences, Reports)
- ✅ Admin panel functional

---

## Version History

### Current: ae92113 (2025-11-26)
- Added User Filter for Managers
- Fixed Admin Panel Language bugs
- Based on stable commit: 171f2a0

### Base: 171f2a0 (2025-11-24)
- Last stable version before Dark Mode implementation
- All core features working
- Bulk Edit improvements

---

## Development Guidelines

### Working on New Features
1. **Always** create a new branch from `production`:
   ```bash
   git checkout production
   git checkout -b feature/your-feature-name
   ```

2. Test thoroughly before merging back

3. If something breaks, you can always return to `production` or the tag `production-stable-2025-11-26`

### Why Dark Mode Was Excluded
The Dark Mode implementation (commits a0f6711 through cb4075d) introduced:
- Duplicate `darkMode` variable declarations
- CSS parsing errors due to spaces in variable names (`--bg - primary` instead of `--bg-primary`)
- HTML formatting errors with spaces in tags (`< div` instead of `<div`)

These issues would require a complete rewrite. Dark Mode can be re-implemented cleanly in the future.

---

## Emergency Rollback

If anything goes wrong with future development:

```bash
# Immediate rollback to production
git checkout production

# Or via tag
git checkout production-stable-2025-11-26

# Or hard reset if needed
git reset --hard production-stable-2025-11-26
```

---

## Commit Details

**Production Commit:** ae92113  
**Message:** "feat: Add User Filter + Admin Panel Language Fixes (cherry-picked without Dark Mode)"

**Files Changed:**
- `src/entry-points/admin.ts` - Admin panel language fixes
- `src/entry-points/main.ts` - User filter implementation
- `src/locales/de.json` - German translations
- `src/locales/en.json` - English translations

---

**Last Updated:** 2025-11-26  
**Maintained By:** Time Tracker Development Team
