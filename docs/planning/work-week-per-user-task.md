# Work Week Configuration per User

## Overview
Enable individual work week configuration per employee instead of global setting. Different employees have different working schedules (e.g., full-time Mon-Fri, part-time Tue-Thu).

## Problem
**Current:** `workWeekDays: number[]` is a global setting in Settings interface  
**Desired:** `workWeekDays?: number[]` in `UserHoursConfig` per employee  
**User Impact:** High - different part-time models can't be accurately tracked

## Checklist

### [x] Phase 1: Planning & Design
- [x] Review current implementation (Settings interface, admin UI, SOLL calculations)
- [x] Design UserHoursConfig extension
- [x] Design UI mockup for per-employee work week
- [x] Plan migration strategy for existing data
- [x] Create implementation plan for user review

### [x] Phase 2: Interface & Type Updates
- [x] Add `workWeekDays?: number[]` to UserHoursConfig interface (main.ts + admin.ts)
- [x] Add `settingsSnapshot?` to TimeEntry interface
- [x] Add helper function `createSettingsSnapshot()` to create snapshot
- [x] Add default work week constant (implicitly [1,2,3,4,5])

### [x] Phase 3: Admin UI Implementation
- [x] Update employee table to include work week column
- [x] Add checkbox grid (Sun-Sat) per employee row
- [x] Implement state management for work week changes
- [x] Add visual feedback (tooltips, hover states)
- [x] Handle save/update logic (immediate save on checkbox change)

### [x] Phase 4: Calculation Logic Updates
- [x] Update `countWorkDays()` to accept userId parameter
- [x] Modify function to check user-specific work week first
- [x] Fallback to global setting if user config not found
- [x] Update caller in stats calculation (line 1199)
- [x] Settings snapshot captures work week in all entry creation points

### [ ] Phase 5: Data Migration
- [ ] Add migration logic for existing employees
- [ ] Inherit global workWeekDays on first load
- [ ] Mark migration as complete in settings
- [ ] Test with existing data

### [ ] Phase 6: Testing & Verification
- [ ] Test UI: Add new employee with custom work week
- [ ] Test UI: Edit existing employee work week
- [ ] Test calculations: SOLL hours with different work weeks
- [ ] Test edge cases: No work days selected, all days selected
- [ ] Verify reports show correct expected hours

### [ ] Phase 7: Documentation & Cleanup
- [ ] Update TODO.md to mark issue as resolved
- [ ] Update IMPLEMENTATION.md with feature details
- [ ] Update USER-REQUIREMENTS.md if needed
- [ ] Git commit with comprehensive message
- [ ] Create walkthrough

## Expected Changes

### Files to Modify
1. **Types/Interfaces** (likely in main.ts or separate types file)
   - UserHoursConfig interface
   
2. **admin.ts** (~1640 lines)
   - UI rendering for employee work week
   - Save logic for work week changes
   
3. **main.ts** (~3347 lines)
   - countWorkDays() function
   - getUserHours() function
   - Any SOLL calculation logic

### Estimated Impact
- Lines added: ~150-200
- Lines modified: ~50-80
- Time: 2-3 hours
