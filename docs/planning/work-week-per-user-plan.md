# Implementation Plan: Work Week Configuration per User

Enable individual work week configuration for each employee instead of using a global setting.

## Problem Statement

**Current State:**
- `workWeekDays: number[]` is configured globally in Settings
- All employees share the same work week (typically Mon-Fri)
- Different part-time models can't be accurately represented

**Desired State:**
- Each employee can have individual `workWeekDays` configuration
- SOLL calculations use employee-specific work week
- Fallback to global setting if employee has no specific configuration

**User Impact:** High - enables accurate tracking for various part-time models (e.g., 3-day week Tue-Thu, 4-day week Mon-Thu)

---

## User Review Required

> [!IMPORTANT]
> **Breaking Change Consideration**
> This change modifies the `UserHoursConfig` interface and calculation logic. Existing employees will inherit the global `workWeekDays` setting on first migration.

> [!IMPORTANT]
> **Settings Snapshot (Critical for Data Integrity)**
> Each TimeEntry will store a snapshot of the user's settings at the time of creation. This ensures:
> - Past entries always use their original settings for SOLL calculations
> - Retroactive entries use settings from the entry date, not creation date
> - Settings changes only affect future entries
> 
> **Bulk Update Function**: Admins can retroactively correct settings for a date range (e.g., fix 50 entries when settings were wrong).

> [!NOTE]
> **UI Change**
> The admin panel Employee SOLL Hours table will become wider to accommodate work week checkboxes (7 days × ~40px = ~280px additional width).

---

## Proposed Changes

### TimeEntry Interface Extension

#### [MODIFY] [main.ts](file:///Users/mgoth/extensions/Zeiterfassung%20Claude/src/entry-points/main.ts) - TimeEntry Interface

**Add Settings Snapshot:**
```typescript
interface TimeEntry {
    userId: number;
    startTime: string;
    endTime: string | null;
    categoryId: string;
    categoryName: string;
    description: string;
    isManual: boolean;
    isBreak: boolean;
    createdAt: string;
    settingsSnapshot?: { // NEW: Settings at time of entry creation
        hoursPerDay: number;
        hoursPerWeek: number;
        workWeekDays: number[];
    };
}
```

**When to Create Snapshot:**
1. **Clock-In:** When starting timer
2. **Manual Entry:** When saving entry
3. **Bulk Entry:** For each imported entry
4. **Edit Entry:** Preserve original snapshot (don't update)

**What to Snapshot:**
```typescript
function createSettingsSnapshot(userId: number): TimeEntry['settingsSnapshot'] {
    // Priority 1: User-specific settings
    const userConfig = settings.userHoursConfig?.find(u => u.userId === userId);
    
    return {
        hoursPerDay: userConfig?.hoursPerDay ?? settings.defaultHoursPerDay,
        hoursPerWeek: userConfig?.hoursPerWeek ?? settings.defaultHoursPerWeek,
        workWeekDays: userConfig?.workWeekDays ?? settings.workWeekDays ?? [1,2,3,4,5]
    };
}
```

**Rationale:** 
- Snapshot frozen at entry creation = immutable settings
- Retroactive entries get correct historical settings
- Settings changes don't affect past data

---

### Interface & Types

#### [MODIFY] [main.ts](file:///Users/mgoth/extensions/Zeiterfassung%20Claude/src/entry-points/main.ts) - UserHoursConfig Interface

**Location:** Lines 46-52

**Current:**
```typescript
interface UserHoursConfig {
    userId: number;
    userName: string;
    hoursPerDay: number;
    hoursPerWeek: number;
    isActive?: boolean;
}
```

**Proposed:**
```typescript
interface UserHoursConfig {
    userId: number;
    userName: string;
    hoursPerDay: number;
    hoursPerWeek: number;
    isActive?: boolean;
    workWeekDays?: number[]; // NEW: Individual work week (0=Sun, 1=Mon, ..., 6=Sat). Falls back to global setting if undefined.
}
```

**Rationale:** Optional field allows gradual adoption and fallback to global setting.

---

#### [MODIFY] [admin.ts](file:///Users/mgoth/extensions/Zeiterfassung%20Claude/src/entry-points/admin.ts) - UserHoursConfig Interface

**Location:** Lines 31-37

Same change as main.ts (interfaces duplicated in both files).

---

### Calculation Logic Updates

#### [MODIFY] [main.ts](file:///Users/mgoth/extensions/Zeiterfassung%20Claude/src/entry-points/main.ts) - isWorkDay Function

**Location:** Lines 293-298

**Current:**
```typescript
function isWorkDay(date: Date): boolean {
    const dayOfWeek = date.getDay();
    const workWeekDays = settings.workWeekDays || [1, 2, 3, 4, 5];
    return workWeekDays.includes(dayOfWeek);
}
```

**Proposed:**
```typescript
function isWorkDay(date: Date, userId?: number): boolean {
    const dayOfWeek = date.getDay();
    
    // Priority 1: User-specific work week
    if (userId !== undefined && settings.userHoursConfig) {
        const userConfig = settings.userHoursConfig.find(u => u.userId === userId);
        if (userConfig?.workWeekDays) {
            return userConfig.workWeekDays.includes(dayOfWeek);
        }
    }
    
    // Priority 2: Global work week setting
    const workWeekDays = settings.workWeekDays || [1, 2, 3, 4, 5];
    return workWeekDays.includes(dayOfWeek);
}
```

**Rationale:** 
- Add optional `userId` parameter for user-specific check
- Fallback to global setting if user config not found
- Backward compatible (userId optional)

---

#### [MODIFY] [main.ts](file:///Users/mgoth/extensions/Zeiterfassung%20Claude/src/entry-points/main.ts) - countWorkDays Function

**Location:** Lines 300-316

**Current:**
```typescript
function countWorkDays(startDate: Date, endDate: Date): number {
    let count = 0;
    const current = new Date(startDate);
    // ... iteration logic using isWorkDay(current)
}
```

**Proposed:**
```typescript
function countWorkDays(startDate: Date, endDate: Date, userId?: number): number {
    let count = 0;
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    while (current <= end) {
        if (isWorkDay(current, userId)) { // Pass userId
            count++;
        }
        current.setDate(current.getDate() + 1);
    }

    return count;
}
```

**Changes:**
- Add optional `userId` parameter
- Pass `userId` to `isWorkDay()`

---

#### [MODIFY] [main.ts](file:///Users/mgoth/extensions/Zeiterfassung%20Claude/src/entry-points/main.ts) - getUserHours Function

**Location:** Search for `getUserHours` function

**Update:** Pass correct userId to `countWorkDays()` when calculating expected hours for a specific user.

---

#### [MODIFY] [main.ts](file:///Users/mgoth/extensions/Zeiterfassung%20Claude/src/entry-points/main.ts) - All countWorkDays Callers

**Locations:**
- Line 1171: SOLL calculation in reports

**Action:** Update callers to pass `userId` when known, otherwise leave undefined for global calculation.

---

### Admin UI Changes

#### [MODIFY] [admin.ts](file:///Users/mgoth/extensions/Zeiterfassung%20Claude/src/entry-points/admin.ts) - Employee Table Rendering

**Location:** Search for employee table rendering (likely around line 400-600)

**Add Column:** "Work Week Days" with checkbox grid

**Proposed UI Structure:**
```html
<th>Work Week</th>
```

**In each employee row:**
```html
<td>
    <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;">
        ${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => {
            const userConfig = settings.userHoursConfig?.find(u => u.userId === emp.userId);
            const workWeek = userConfig?.workWeekDays || settings.workWeekDays || [1,2,3,4,5];
            const isChecked = workWeek.includes(index);
            return `
                <label style="display: flex; align-items: center; justify-content: center; cursor: pointer;">
                    <input
                        type="checkbox"
                        class="user-work-week-checkbox"
                        data-user-id="${emp.userId}"
                        data-day="${index}"
                        ${isChecked ? 'checked' : ''}
                    />
                    <span style="font-size: 0.75rem; margin-left: 2px;">${day}</span>
                </label>
            `;
        }).join('')}
    </div>
</td>
```

**Visual Design:**
- Similar to global work week setting (line 673-696)
- Compact checkbox grid (7 columns)
- Day labels: S M T W T F S
- Checked state inherits from global if no user config

---

#### [MODIFY] [admin.ts](file:///Users/mgoth/extensions/Zeiterfassung%20Claude/src/entry-points/admin.ts) - Event Handlers

**Add Event Delegation:**
```typescript
// Handle work week checkbox changes
container.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    if (target.classList.contains('user-work-week-checkbox')) {
        const userId = parseInt(target.dataset.userId!);
        const day = parseInt(target.dataset.day!);
        
        // Find or create user config
        if (!settings.userHoursConfig) {
            settings.userHoursConfig = [];
        }
        let userConfig = settings.userHoursConfig.find(u => u.userId === userId);
        if (!userConfig) {
            // Create new config with defaults
            const employee = employeesList.find(e => e.userId === userId);
            userConfig = {
                userId,
                userName: employee?.userName || '',
                hoursPerDay: settings.defaultHoursPerDay,
                hoursPerWeek: settings.defaultHoursPerWeek,
                workWeekDays: [...(settings.workWeekDays || [1,2,3,4,5])]
            };
            settings.userHoursConfig.push(userConfig);
        }
        
        // Initialize workWeekDays if not present
        if (!userConfig.workWeekDays) {
            userConfig.workWeekDays = [...(settings.workWeekDays || [1,2,3,4,5])];
        }
        
        // Toggle day
        if (target.checked) {
            if (!userConfig.workWeekDays.includes(day)) {
                userConfig.workWeekDays.push(day);
            }
        } else {
            userConfig.workWeekDays = userConfig.workWeekDays.filter(d => d !== day);
        }
        
        // Save settings
        saveSettings();
    }
});
```

---

### Bulk Update Function for Retroactive Corrections

#### [NEW] [admin.ts](file:///Users/mgoth/extensions/Zeiterfassung%20Claude/src/entry-points/admin.ts) - Bulk Update Settings Snapshot

**Problem:** Admin changed settings but forgot to update them earlier. Now 50 entries have wrong SOLL calculations.

**Solution:** Bulk update function to apply new settings snapshot to entries in a date range.

**UI:**
```html
<div class="bulk-update-section">
    <h3>Bulk Update Settings Snapshot</h3>
    <p>Retroactively update settings for entries when settings were wrong</p>
    
    <label>User:
        <select id="bulk-update-user">
            <option value="">-- Select Employee --</option>
            ${employeesList.map(emp => `
                <option value="${emp.userId}">${emp.userName}</option>
            `).join('')}
        </select>
    </label>
    
    <label>From Date:
        <input type="date" id="bulk-update-from" />
    </label>
    
    <label>To Date:
        <input type="date" id="bulk-update-to" />
    </label>
    
    <button id="bulk-update-apply">Apply Current Settings to Range</button>
    <div id="bulk-update-preview"></div>
</div>
```

**Function:**
```typescript
async function bulkUpdateSettingsSnapshot() {
    const userId = parseInt((document.getElementById('bulk-update-user') as HTMLSelectElement).value);
    const fromDate = (document.getElementById('bulk-update-from') as HTMLInputElement).value;
    const toDate = (document.getElementById('bulk-update-to') as HTMLInputElement).value;
    
    if (!userId || !fromDate || !toDate) {
        showNotification('Please select user and date range', 'error');
        return;
    }
    
    // Create current settings snapshot
    const newSnapshot = createSettingsSnapshot(userId);
    
    // Load all time entries
    const allEntries = await loadAllTimeEntries(); // Implement this
    
    // Filter entries for user and date range
    const entriesToUpdate = allEntries.filter(entry => {
        const entryDate = new Date(entry.startTime);
        return entry.userId === userId &&
               entryDate >= new Date(fromDate) &&
               entryDate <= new Date(toDate);
    });
    
    // Preview
    const preview = document.getElementById('bulk-update-preview')!;
    preview.innerHTML = `
        <p>Found ${entriesToUpdate.length} entries for update</p>
        <p><strong>New Settings:</strong></p>
        <ul>
            <li>Hours/Day: ${newSnapshot.hoursPerDay}</li>
            <li>Hours/Week: ${newSnapshot.hoursPerWeek}</li>
            <li>Work Days: ${newSnapshot.workWeekDays.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ')}</li>
        </ul>
        <button id="bulk-update-confirm">Confirm Update ${entriesToUpdate.length} Entries</button>
        <button id="bulk-update-cancel">Cancel</button>
    `;
    
    // Confirm button
    document.getElementById('bulk-update-confirm')!.addEventListener('click', async () => {
        for (const entry of entriesToUpdate) {
            entry.settingsSnapshot = newSnapshot;
            await updateTimeEntry(entry); // Implement this
        }
        
        showNotification(`Updated ${entriesToUpdate.length} entries successfully`, 'success');
        preview.innerHTML = '';
    });
    
    document.getElementById('bulk-update-cancel')!.addEventListener('click', () => {
        preview.innerHTML = '';
    });
}
```

---

### SOLL Calculation Updates

#### [MODIFY] [main.ts](file:///Users/mgoth/extensions/Zeiterfassung%20Claude/src/entry-points/main.ts) - getReportStats or similar

**Current Issue:** SOLL calculations use current settings, not entry's snapshot

**Solution:** Prioritize settingsSnapshot from entry, fallback to current settings

**Proposed Logic:**
```typescript
function calculateExpectedHours(entries: TimeEntry[], userId: number, startDate: Date, endDate: Date): number {
    // Option 1: Use entry settingsSnapshot (preferred)
    // Find any entry with snapshot for this user in range
    const entryWithSnapshot = entries.find(e => 
        e.userId === userId && 
        e.settingsSnapshot &&
        new Date(e.startTime) >= startDate &&
        new Date(e.startTime) <= endDate
    );
    
    let workDaysCount: number;
    
    if (entryWithSnapshot?.settingsSnapshot) {
        // Use snapshot from entry
        const snapshot = entryWithSnapshot.settingsSnapshot;
        workDaysCount = countWorkDaysWithSnapshot(startDate, endDate, snapshot.workWeekDays);
    } else {
        // Fallback to current settings
        workDaysCount = countWorkDays(startDate, endDate, userId);
    }
    
    // Get hours per day (from snapshot or current)
    const userConfig = settings.userHoursConfig?.find(u => u.userId === userId);
    const hoursPerDay = entryWithSnapshot?.settingsSnapshot?.hoursPerDay ?? 
                        userConfig?.hoursPerDay ?? 
                        settings.defaultHoursPerDay;
    
    return workDaysCount * hoursPerDay;
}

// Helper function
function countWorkDaysWithSnapshot(startDate: Date, endDate: Date, workWeekDays: number[]): number {
    let count = 0;
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    while (current <= end) {
        const dayOfWeek = current.getDay();
        if (workWeekDays.includes(dayOfWeek)) {
            count++;
        }
        current.setDate(current.getDate() + 1);
    }

    return count;
}
```

**Rationale:**
- Entries with `settingsSnapshot` use their original settings
- Entries without snapshot (old data) fall back to current settings
- SOLL calculations remain accurate for historical data

---

## Verification Plan

### Automated Tests

**Test 1: Default Behavior (No User Config)**
```javascript
// User without specific workWeekDays should use global setting
const userId = 123;
const settings = {
    workWeekDays: [1, 2, 3, 4, 5],
    userHoursConfig: [{ userId: 123, userName: "Test", hoursPerDay: 8, hoursPerWeek: 40 }]
};
// isWorkDay(monday, 123) should return true (global Mon-Fri)
// isWorkDay(saturday, 123) should return false
```

**Test 2: User-Specific Work Week**
```javascript
// User with custom 3-day week (Tue-Thu)
const settings = {
    workWeekDays: [1, 2, 3, 4, 5],
    userHoursConfig: [{
        userId: 456,
        userName: "Part-time",
        hoursPerDay: 8,
        hoursPerWeek: 24,
        workWeekDays: [2, 3, 4] // Tue, Wed, Thu
    }]
};
// isWorkDay(tuesday, 456) should return true
// isWorkDay(monday, 456) should return false
```

**Test 3: SOLL Calculation**
```javascript
// Week with user on 3-day schedule
const startDate = new Date('2025-11-24'); // Monday
const endDate = new Date('2025-11-30'); // Sunday
const workDays = countWorkDays(startDate, endDate, 456);
// Should return 3 (Tue, Wed, Thu)
```

### Manual Verification

1. **Admin Panel UI:**
   - [ ] Load employees from group
   - [ ] Verify work week checkboxes show for each employee
   - [ ] Default state reflects global setting
   - [ ] Check/uncheck days saves correctly
   - [ ] Reload admin panel - checkboxes retain state

2. **SOLL Calculations:**
   - [ ] Create employee with 3-day week (Tue-Thu)
   - [ ] Enter time entries for full week
   - [ ] Verify expected hours only count Tue-Thu
   - [ ] Verify overtime calculation excludes Mon/Fri

3. **Edge Cases:**
   - [ ] Employee with no work days selected (should show 0 expected hours)
   - [ ] Employee with all days selected (should match 7-day calculation)
   - [ ] Switch employee from custom to global (delete workWeekDays field)

---

## Migration Strategy

**On First Load (after deployment):**
```typescript
// In loadSettings() or similar initialization
if (settings.userHoursConfig && settings.userHoursConfig.length > 0) {
    const needsMigration = settings.userHoursConfig.some(u => u.workWeekDays === undefined);
    
    if (needsMigration) {
        const globalWorkWeek = settings.workWeekDays || [1, 2, 3, 4, 5];
        
        settings.userHoursConfig.forEach(userConfig => {
            if (!userConfig.workWeekDays) {
                // Inherit global setting
                userConfig.workWeekDays = [...globalWorkWeek];
            }
        });
        
        await saveSettings();
        console.log('[TimeTracker] Migrated user work weeks from global setting');
    }
}
```

**Rationale:** Existing employees inherit current global setting, ensuring no SOLL calculation changes until admin explicitly modifies individual work weeks.

---

## Rollback Plan

If issues arise:
1. Revert code changes
2. User data remains intact (optional field)
3. System falls back to global `workWeekDays`

---

## Documentation Updates

- [ ] Update IMPLEMENTATION.md with feature description
- [ ] Update TODO.md to mark issue as resolved
- [ ] Update USER-REQUIREMENTS.md if this becomes a core requirement
- [ ] Create walkthrough with before/after screenshots

---

## Estimated Impact

**Files Modified:** 2
- `src/entry-points/main.ts` (~200 lines modified/added)
  - TimeEntry interface (+5 lines)
  - createSettingsSnapshot() (+15 lines)
  - isWorkDay() update (+10 lines)
  - countWorkDays() update (+5 lines)
  - calculateExpectedHours() update (+40 lines)
  - Clock-in/Manual Entry/Bulk Entry snapshot creation (+30 lines)
  - countWorkDaysWithSnapshot() helper (+20 lines)
  
- `src/entry-points/admin.ts` (~180 lines modified/added)
  - UserHoursConfig interface (+1 line)
  - Employee table UI (+50 lines)
  - Event handlers (+40 lines)
  - Bulk update UI (+30 lines)
  - Bulk update function (+60 lines)

**Total Changes:** ~380 lines

**Time Estimate:** 3-4 hours
- Interface updates: 30 min
- Settings snapshot implementation: 60 min
- Logic updates (isWorkDay, countWorkDays, SOLL calc): 60 min
- UI implementation (work week checkboxes): 40 min
- Bulk update feature: 60 min
- Testing: 40 min
- Documentation: 30 min

---

**Ready for implementation?** Please review and approve before I proceed.
```
