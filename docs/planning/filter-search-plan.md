# Implementation Plan: Filter & Search

## Goal Description
Add filtering and search capabilities to the Time Tracker main view to allow users to easily find specific entries based on category, type, or text content.

## User Review Required
> [!NOTE]
> The filter bar will be placed above the "Time Entries" list.
> It will contain:
> - Search Input (Text)
> - Category Dropdown (All / Specific Category)
> - Type Dropdown (All / Work / Absence)

## Proposed Changes

### Main UI (`src/entry-points/main.ts`)

#### [NEW] Filter State
- Add state variables: `filterText`, `filterCategory`, `filterType`.

#### [NEW] Filter UI Component
- Create `renderFilterBar()` function.
- Inputs:
    - Search (Text input with debounce)
    - Category (Select with options from `workCategories`)
    - Type (Select: All, Work, Absence)

#### [MODIFY] Render Logic
- Update `renderEntries()` to accept filtered entries or filter them internally.
- Implement `getFilteredEntries()` helper function.
    - Filters by text (case-insensitive match in notes).
    - Filters by category ID.
    - Filters by type (work vs absence).

### Interaction
- Add event listeners for filter inputs.
- Re-render entry list on filter change (without reloading data).

## Verification Plan

### Manual Verification
1. **Search:** Type text -> Verify list updates to show only matching entries.
2. **Category Filter:** Select category -> Verify only entries of that category are shown.
3. **Type Filter:** Select "Absence" -> Verify only absence entries are shown.
4. **Combination:** Combine filters -> Verify intersection of results.
5. **Empty State:** Filter with no matches -> Verify "No entries found" message.
