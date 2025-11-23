# Filter & Search Implementation

## Overview
Implement filtering and search for time entries.

## Checklist

### [ ] Phase 1: State & Logic
- [ ] Add filter state variables (`filterText`, `filterCategory`, `filterType`)
- [ ] Implement `getFilteredEntries()` function
- [ ] Update `renderEntries()` to use filtered data

### [ ] Phase 2: UI Implementation
- [ ] Create `renderFilterBar()` function
- [ ] Add Search Input (styled)
- [ ] Add Category Dropdown
- [ ] Add Type Dropdown
- [ ] Integrate Filter Bar into `renderCurrentView`

### [ ] Phase 3: Interaction & Events
- [ ] Add event listeners for inputs
- [ ] Implement debounce for search input (optional but good for performance)
- [ ] Trigger re-render on change

### [ ] Phase 4: Testing
- [ ] Verify text search
- [ ] Verify category filter
- [ ] Verify type filter
- [ ] Verify empty results state
