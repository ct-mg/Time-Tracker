import type { EntryPoint } from '../lib/main';
import type { MainModuleData } from '@churchtools/extension-points/main';
import type { Absence } from '../utils/ct-types';
import {
    getModule,
    getCustomDataCategory,
    getCustomDataValues,
    createCustomDataCategory,
    createCustomDataValue,
    updateCustomDataValue,
} from '../utils/kv-store';

/**
 * Time Tracker Main Module
 *
 * Comprehensive time tracking tool with:
 * - Clock in/out functionality
 * - Manual time entries
 * - Time reports and statistics
 * - Overtime calculation
 * - Export functionality
 * - Integration with ChurchTools absence tracking
 */

interface TimeEntry {
    userId: number;
    startTime: string; // ISO datetime - also serves as unique identifier
    endTime: string | null; // ISO datetime or null if currently running
    categoryId: string;
    categoryName: string;
    description: string;
    isManual: boolean;
    createdAt: string;
}

interface WorkCategory {
    id: string;
    name: string;
    color: string;
}

interface Settings {
    defaultHoursPerDay: number;
    defaultHoursPerWeek: number;
}

const mainEntryPoint: EntryPoint<MainModuleData> = ({
    element,
    churchtoolsClient,
    user,
    KEY,
}) => {
    console.log('[TimeTracker] Initializing for user:', user?.id);

    // State
    let timeEntries: TimeEntry[] = [];
    let workCategories: WorkCategory[] = [];
    let settings: Settings = { defaultHoursPerDay: 8, defaultHoursPerWeek: 40 };
    let currentEntry: TimeEntry | null = null;
    let absences: Absence[] = [];
    let isLoading = true;
    let errorMessage = '';
    let moduleId: number | null = null;

    // Filters
    let filterDateFrom = new Date(new Date().setDate(new Date().getDate() - 30))
        .toISOString()
        .split('T')[0];
    let filterDateTo = new Date().toISOString().split('T')[0];
    let filterCategory = 'all';

    // UI state
    let currentView: 'dashboard' | 'entries' | 'reports' = 'dashboard';
    let showAddManualEntry = false;

    // Initialize
    async function initialize() {
        try {
            isLoading = true;
            render();

            // Get module
            const module = await getModule(KEY);
            moduleId = module.id;

            // Load data
            await Promise.all([
                loadWorkCategories(),
                loadSettings(),
                loadTimeEntries(),
                loadAbsences(),
            ]);

            // Check if there's a currently active entry
            currentEntry =
                timeEntries.find((entry) => entry.endTime === null && entry.userId === user?.id) ||
                null;

            isLoading = false;
            errorMessage = '';
            render();

            // Start timer update if there's an active entry
            if (currentEntry) {
                startTimerUpdate();
            }
        } catch (error) {
            console.error('[TimeTracker] Initialization error:', error);
            isLoading = false;
            errorMessage = error instanceof Error ? error.message : 'Failed to initialize';
            render();
        }
    }

    // Load work categories from KV store
    async function loadWorkCategories(): Promise<void> {
        try {
            const category = await getCustomDataCategory<object>('workcategories');
            if (category) {
                const values = await getCustomDataValues<WorkCategory>(category.id, moduleId!);
                workCategories = values;
            } else {
                // Default categories if none exist
                workCategories = [
                    { id: 'office', name: 'Office Work', color: '#007bff' },
                    { id: 'pastoral', name: 'Pastoral Care', color: '#28a745' },
                    { id: 'event', name: 'Event Preparation', color: '#ffc107' },
                    { id: 'administration', name: 'Administration', color: '#6c757d' },
                ];
            }
        } catch (error) {
            console.error('[TimeTracker] Failed to load categories:', error);
            workCategories = [{ id: 'general', name: 'General', color: '#007bff' }];
        }
    }

    // Load settings from KV store
    async function loadSettings(): Promise<void> {
        try {
            const category = await getCustomDataCategory<object>('settings');
            if (category) {
                const values = await getCustomDataValues<Settings>(category.id, moduleId!);
                if (values.length > 0) {
                    settings = values[0];
                }
            }
        } catch (error) {
            console.error('[TimeTracker] Failed to load settings:', error);
        }
    }

    // Load time entries from KV store
    async function loadTimeEntries(): Promise<void> {
        try {
            const category = await getCustomDataCategory<object>('timeentries');
            if (category) {
                const values = await getCustomDataValues<TimeEntry>(category.id, moduleId!);
                timeEntries = values.sort(
                    (a, b) =>
                        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
                );
            } else {
                // Create category if it doesn't exist
                await createCustomDataCategory(
                    {
                        customModuleId: moduleId!,
                        name: 'Time Entries',
                        shorty: 'timeentries',
                        description: 'Time tracking entries',
                    },
                    moduleId!
                );
                timeEntries = [];
            }
        } catch (error) {
            console.error('[TimeTracker] Failed to load time entries:', error);
            timeEntries = [];
        }
    }

    // Load absences from ChurchTools API
    async function loadAbsences(): Promise<void> {
        if (!user?.id) {
            absences = [];
            return;
        }

        try {
            // Get absences for the current user
            const response = await churchtoolsClient.get<Absence[]>(
                `/persons/${user.id}/absences`
            );
            absences = response || [];
            console.log('[TimeTracker] Loaded absences:', absences.length);
        } catch (error) {
            console.error('[TimeTracker] Failed to load absences:', error);
            absences = [];
        }
    }

    // Clock in
    async function clockIn(categoryId: string, description: string) {
        if (!user?.id || currentEntry) return;

        try {
            const category = workCategories.find((c) => c.id === categoryId);
            const newEntry: TimeEntry = {
                userId: user.id,
                startTime: new Date().toISOString(),
                endTime: null,
                categoryId,
                categoryName: category?.name || 'Unknown',
                description,
                isManual: false,
                createdAt: new Date().toISOString(),
            };

            // Save to KV store
            const cat = await getCustomDataCategory<object>('timeentries');
            if (cat) {
                await createCustomDataValue(
                    {
                        dataCategoryId: cat.id,
                        value: JSON.stringify(newEntry),
                    },
                    moduleId!
                );
            }

            timeEntries.unshift(newEntry);
            currentEntry = newEntry;
            startTimerUpdate();
            render();
        } catch (error) {
            console.error('[TimeTracker] Clock in failed:', error);
            alert('Failed to clock in. Please try again.');
        }
    }

    // Clock out
    async function clockOut() {
        if (!currentEntry) return;

        try {
            const endTime = new Date().toISOString();
            currentEntry.endTime = endTime;

            // Update in KV store
            const cat = await getCustomDataCategory<object>('timeentries');
            if (!cat) {
                throw new Error('Time entries category not found');
            }

            // Find the active entry by userId and null endTime
            const allValues = await getCustomDataValues<TimeEntry>(cat.id, moduleId!);
            const existingValue = allValues.find(
                (v) => v.userId === currentEntry!.userId &&
                       v.startTime === currentEntry!.startTime &&
                       v.endTime === null
            );

            if (!existingValue) {
                throw new Error('Could not find active time entry in database');
            }

            // Get the KV store ID - it should be in the metadata after our fix
            const kvStoreId = (existingValue as any).id;
            if (!kvStoreId || typeof kvStoreId !== 'number') {
                console.error('[TimeTracker] Invalid KV store ID:', kvStoreId, 'Entry:', existingValue);
                throw new Error(`Invalid KV store ID: ${kvStoreId}`);
            }

            console.log('[TimeTracker] Updating time entry with KV store ID:', kvStoreId);
            await updateCustomDataValue(
                cat.id,
                kvStoreId,
                { value: JSON.stringify(currentEntry) },
                moduleId!
            );

            // Update local state
            const entryIndex = timeEntries.findIndex(e => e.startTime === currentEntry!.startTime);
            if (entryIndex !== -1) {
                timeEntries[entryIndex] = { ...currentEntry };
            }

            stopTimerUpdate();
            currentEntry = null;
            render();
        } catch (error) {
            console.error('[TimeTracker] Clock out failed:', error);
            alert('Failed to clock out. Please try again.');
            // Reload to get fresh state
            await loadTimeEntries();
            currentEntry = timeEntries.find((entry) => entry.endTime === null && entry.userId === user?.id) || null;
            render();
        }
    }

    // Timer update interval
    let timerInterval: number | null = null;

    function startTimerUpdate() {
        if (timerInterval) return;
        timerInterval = window.setInterval(() => {
            // Update the timer display
            const timerEl = element.querySelector('#current-timer');
            if (timerEl && currentEntry) {
                timerEl.textContent = formatDuration(
                    new Date().getTime() - new Date(currentEntry.startTime).getTime()
                );
            }
        }, 1000);
    }

    function stopTimerUpdate() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    // Calculate statistics
    function calculateStats() {
        const filtered = getFilteredEntries();
        const totalMs = filtered.reduce((sum, entry) => {
            const start = new Date(entry.startTime).getTime();
            const end = entry.endTime ? new Date(entry.endTime).getTime() : new Date().getTime();
            return sum + (end - start);
        }, 0);

        const totalHours = totalMs / (1000 * 60 * 60);
        const workDays = Math.ceil(
            (new Date(filterDateTo).getTime() - new Date(filterDateFrom).getTime()) /
                (1000 * 60 * 60 * 24)
        );

        // Calculate absence hours in the filtered period
        const absenceHours = calculateAbsenceHours();

        // Expected hours = work days * hours per week / 7 - absence hours
        const expectedHours = (workDays / 7) * settings.defaultHoursPerWeek - absenceHours;
        const overtime = totalHours - expectedHours;

        return {
            totalHours: totalHours.toFixed(2),
            expectedHours: expectedHours.toFixed(2),
            overtime: overtime.toFixed(2),
            entriesCount: filtered.length,
            absenceHours: absenceHours.toFixed(2),
            absenceDays: (absenceHours / settings.defaultHoursPerDay).toFixed(1),
        };
    }

    // Calculate absence hours in the filtered date range
    function calculateAbsenceHours(): number {
        const fromDate = new Date(filterDateFrom);
        const toDate = new Date(filterDateTo);

        let totalAbsenceHours = 0;

        for (const absence of absences) {
            // Determine if absence is all-day or has specific times
            const isAllDay = absence.startTime === null || absence.endTime === null;

            const absenceStart = new Date(absence.startDate);
            const absenceEnd = new Date(absence.endDate);

            // Check if absence overlaps with filter period
            if (absenceEnd < fromDate || absenceStart > toDate) {
                continue;
            }

            // Calculate overlap
            const overlapStart = absenceStart > fromDate ? absenceStart : fromDate;
            const overlapEnd = absenceEnd < toDate ? absenceEnd : toDate;

            if (isAllDay) {
                // For all-day absences, count full days
                const daysMs = overlapEnd.getTime() - overlapStart.getTime();
                const days = Math.ceil(daysMs / (1000 * 60 * 60 * 24)) + 1; // +1 because both start and end are inclusive
                totalAbsenceHours += days * settings.defaultHoursPerDay;
            } else {
                // For timed absences, calculate actual hours
                const startTime = new Date(absence.startTime!);
                const endTime = new Date(absence.endTime!);
                const hoursMs = endTime.getTime() - startTime.getTime();
                totalAbsenceHours += hoursMs / (1000 * 60 * 60);
            }
        }

        return totalAbsenceHours;
    }

    // Get filtered entries
    function getFilteredEntries(): TimeEntry[] {
        return timeEntries.filter((entry) => {
            // Filter by user
            if (entry.userId !== user?.id) return false;

            // Filter by date
            const entryDate = new Date(entry.startTime).toISOString().split('T')[0];
            if (entryDate < filterDateFrom || entryDate > filterDateTo) return false;

            // Filter by category
            if (filterCategory !== 'all' && entry.categoryId !== filterCategory) return false;

            return true;
        });
    }

    // Format duration
    function formatDuration(ms: number): string {
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((ms % (1000 * 60)) / 1000);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Format date
    function formatDate(isoString: string): string {
        return new Date(isoString).toLocaleString();
    }

    // Export to CSV
    function exportToCSV() {
        const filtered = getFilteredEntries();
        let csv = 'Date,Start Time,End Time,Duration (hours),Category,Description\n';

        filtered.forEach((entry) => {
            const start = new Date(entry.startTime);
            const end = entry.endTime ? new Date(entry.endTime) : new Date();
            const duration = ((end.getTime() - start.getTime()) / (1000 * 60 * 60)).toFixed(2);

            csv += `"${start.toLocaleDateString()}","${start.toLocaleTimeString()}","${end.toLocaleTimeString()}","${duration}","${entry.categoryName}","${entry.description}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `time-tracker-export-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Render UI
    function render() {
        if (isLoading) {
            element.innerHTML = `
                <div style="min-height: 100vh; background: #f8f9fa; padding: 2rem;">
                    <div style="max-width: 1200px; margin: 0 auto; text-align: center; padding: 3rem;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">⏳</div>
                        <p style="color: #666;">Loading Time Tracker...</p>
                    </div>
                </div>
            `;
            return;
        }

        if (errorMessage) {
            element.innerHTML = `
                <div style="min-height: 100vh; background: #f8f9fa; padding: 2rem;">
                    <div style="max-width: 1200px; margin: 0 auto;">
                        <div style="background: #fff; border: 1px solid #fcc; border-radius: 8px; padding: 1.5rem; color: #c00;">
                            <strong>Error:</strong> ${errorMessage}
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        const stats = calculateStats();

        element.innerHTML = `
            <div style="min-height: 100vh; background: #f8f9fa; padding: 2rem;">
                <div style="max-width: 1400px; margin: 0 auto;">

                    <!-- Header -->
                    <div style="background: #fff; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <h1 style="margin: 0 0 0.5rem 0; font-size: 1.8rem; color: #333;">⏱️ Time Tracker</h1>
                                <p style="margin: 0; color: #666;">Welcome, ${user?.firstName || 'User'}! Track your working hours.</p>
                            </div>
                            <div style="display: flex; gap: 0.5rem;">
                                <button id="view-dashboard" style="padding: 0.5rem 1rem; border: ${currentView === 'dashboard' ? '2px' : '1px'} solid ${currentView === 'dashboard' ? '#007bff' : '#ddd'}; background: ${currentView === 'dashboard' ? '#e7f3ff' : '#fff'}; color: ${currentView === 'dashboard' ? '#007bff' : '#666'}; border-radius: 4px; cursor: pointer; font-weight: ${currentView === 'dashboard' ? '600' : '400'};">Dashboard</button>
                                <button id="view-entries" style="padding: 0.5rem 1rem; border: ${currentView === 'entries' ? '2px' : '1px'} solid ${currentView === 'entries' ? '#007bff' : '#ddd'}; background: ${currentView === 'entries' ? '#e7f3ff' : '#fff'}; color: ${currentView === 'entries' ? '#007bff' : '#666'}; border-radius: 4px; cursor: pointer; font-weight: ${currentView === 'entries' ? '600' : '400'};">Time Entries</button>
                                <button id="view-reports" style="padding: 0.5rem 1rem; border: ${currentView === 'reports' ? '2px' : '1px'} solid ${currentView === 'reports' ? '#007bff' : '#ddd'}; background: ${currentView === 'reports' ? '#e7f3ff' : '#fff'}; color: ${currentView === 'reports' ? '#007bff' : '#666'}; border-radius: 4px; cursor: pointer; font-weight: ${currentView === 'reports' ? '600' : '400'};">Reports</button>
                            </div>
                        </div>
                    </div>

                    ${renderCurrentView(stats)}
                </div>
            </div>
        `;

        attachEventHandlers();
    }

    function renderCurrentView(stats: any): string {
        switch (currentView) {
            case 'dashboard':
                return renderDashboard(stats);
            case 'entries':
                return renderEntries();
            case 'reports':
                return renderReports(stats);
            default:
                return '';
        }
    }

    function renderDashboard(stats: any): string {
        return `
            <!-- Current Status -->
            <div style="background: ${currentEntry ? '#d4edda' : '#fff'}; border: 1px solid ${currentEntry ? '#c3e6cb' : '#ddd'}; border-radius: 8px; padding: 2rem; margin-bottom: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                ${
                    currentEntry
                        ? `
                    <div style="text-align: center;">
                        <div style="font-size: 1.2rem; color: #155724; margin-bottom: 1rem; font-weight: 600;">
                            🟢 Currently Working
                        </div>
                        <div style="font-size: 3rem; font-weight: 700; color: #155724; margin-bottom: 0.5rem;" id="current-timer">
                            ${formatDuration(new Date().getTime() - new Date(currentEntry.startTime).getTime())}
                        </div>
                        <div style="margin-bottom: 1rem; color: #155724;">
                            <strong>${currentEntry.categoryName}</strong>
                            ${currentEntry.description ? ` - ${currentEntry.description}` : ''}
                        </div>
                        <div style="color: #6c757d; font-size: 0.9rem; margin-bottom: 1.5rem;">
                            Started at ${formatDate(currentEntry.startTime)}
                        </div>
                        <button id="clock-out-btn" style="padding: 1rem 2rem; background: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 1.1rem; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                            ⏹️ Clock Out
                        </button>
                    </div>
                `
                        : `
                    <div style="text-align: center;">
                        <div style="font-size: 1.2rem; color: #666; margin-bottom: 2rem; font-weight: 600;">
                            Not currently tracking time
                        </div>
                        <div style="max-width: 500px; margin: 0 auto;">
                            <label style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 500; text-align: left;">Category</label>
                            <select id="clock-in-category" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 1rem; font-size: 1rem;">
                                ${workCategories.map((cat) => `<option value="${cat.id}">${cat.name}</option>`).join('')}
                            </select>

                            <label style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 500; text-align: left;">Description (optional)</label>
                            <input type="text" id="clock-in-description" placeholder="What are you working on?" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 1.5rem; font-size: 1rem;" />

                            <button id="clock-in-btn" style="width: 100%; padding: 1rem 2rem; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 1.1rem; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                                ▶️ Clock In
                            </button>
                        </div>
                    </div>
                `
                }
            </div>

            <!-- Quick Stats -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">Total Hours (Period)</div>
                    <div style="font-size: 2rem; font-weight: 700; color: #007bff;">${stats.totalHours}h</div>
                </div>
                <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">Expected Hours</div>
                    <div style="font-size: 2rem; font-weight: 700; color: #6c757d;">${stats.expectedHours}h</div>
                </div>
                <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">Absence Hours</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: #ffc107;">${stats.absenceHours}h</div>
                    <div style="color: #999; font-size: 0.8rem; margin-top: 0.25rem;">(${stats.absenceDays} days)</div>
                </div>
                <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">Overtime</div>
                    <div style="font-size: 2rem; font-weight: 700; color: ${parseFloat(stats.overtime) >= 0 ? '#28a745' : '#dc3545'};">
                        ${parseFloat(stats.overtime) >= 0 ? '+' : ''}${stats.overtime}h
                    </div>
                </div>
                <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">Entries</div>
                    <div style="font-size: 2rem; font-weight: 700; color: #007bff;">${stats.entriesCount}</div>
                </div>
            </div>

            <!-- Recent Entries -->
            <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="margin: 0 0 1rem 0; font-size: 1.2rem; color: #333;">Recent Entries</h2>
                ${renderEntriesList(getFilteredEntries().slice(0, 5))}
                <div style="margin-top: 1rem; text-align: center;">
                    <button id="view-all-entries" style="padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        View All Entries
                    </button>
                </div>
            </div>
        `;
    }

    function renderEntries(): string {
        return `
            <!-- Filters -->
            <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 500;">From Date</label>
                        <input type="date" id="filter-date-from" value="${filterDateFrom}" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" />
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 500;">To Date</label>
                        <input type="date" id="filter-date-to" value="${filterDateTo}" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" />
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 500;">Category</label>
                        <select id="filter-category" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="all">All Categories</option>
                            ${workCategories.map((cat) => `<option value="${cat.id}" ${filterCategory === cat.id ? 'selected' : ''}>${cat.name}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button id="apply-filters-btn" style="padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Apply Filters</button>
                    <button id="export-csv-btn" style="padding: 0.5rem 1rem; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">📥 Export CSV</button>
                    <button id="add-manual-entry-btn" style="padding: 0.5rem 1rem; background: #ffc107; color: #333; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">➕ Add Manual Entry</button>
                </div>
            </div>

            ${
                showAddManualEntry
                    ? `
                <!-- Add Manual Entry Form -->
                <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
                    <h3 style="margin: 0 0 1rem 0; color: #333;">Add Manual Entry</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 500;">Start Date & Time</label>
                            <input type="datetime-local" id="manual-start" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" />
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 500;">End Date & Time</label>
                            <input type="datetime-local" id="manual-end" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" />
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 1rem; margin-bottom: 1rem;">
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 500;">Category</label>
                            <select id="manual-category" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                                ${workCategories.map((cat) => `<option value="${cat.id}">${cat.name}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 500;">Description</label>
                            <input type="text" id="manual-description" placeholder="What did you work on?" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" />
                        </div>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button id="save-manual-entry-btn" style="padding: 0.5rem 1rem; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">Save Entry</button>
                        <button id="cancel-manual-entry-btn" style="padding: 0.5rem 1rem; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
                    </div>
                </div>
            `
                    : ''
            }

            <!-- Entries List -->
            <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="margin: 0 0 1rem 0; font-size: 1.2rem; color: #333;">Time Entries (${getFilteredEntries().length})</h2>
                ${renderEntriesList(getFilteredEntries())}
            </div>
        `;
    }

    function renderEntriesList(entries: TimeEntry[]): string {
        if (entries.length === 0) {
            return '<p style="color: #666; text-align: center; padding: 2rem;">No entries found.</p>';
        }

        return `
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                            <th style="padding: 0.75rem; text-align: left; font-weight: 600; color: #495057;">Date</th>
                            <th style="padding: 0.75rem; text-align: left; font-weight: 600; color: #495057;">Start</th>
                            <th style="padding: 0.75rem; text-align: left; font-weight: 600; color: #495057;">End</th>
                            <th style="padding: 0.75rem; text-align: left; font-weight: 600; color: #495057;">Duration</th>
                            <th style="padding: 0.75rem; text-align: left; font-weight: 600; color: #495057;">Category</th>
                            <th style="padding: 0.75rem; text-align: left; font-weight: 600; color: #495057;">Description</th>
                            <th style="padding: 0.75rem; text-align: left; font-weight: 600; color: #495057;">Type</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${entries
                            .map((entry) => {
                                const start = new Date(entry.startTime);
                                const end = entry.endTime ? new Date(entry.endTime) : new Date();
                                const duration = formatDuration(end.getTime() - start.getTime());
                                const category = workCategories.find((c) => c.id === entry.categoryId);

                                return `
                                <tr style="border-bottom: 1px solid #dee2e6;">
                                    <td style="padding: 0.75rem;">${start.toLocaleDateString()}</td>
                                    <td style="padding: 0.75rem;">${start.toLocaleTimeString()}</td>
                                    <td style="padding: 0.75rem;">${entry.endTime ? end.toLocaleTimeString() : '<span style="color: #28a745; font-weight: 600;">Active</span>'}</td>
                                    <td style="padding: 0.75rem; font-weight: 600;">${duration}</td>
                                    <td style="padding: 0.75rem;">
                                        <span style="background: ${category?.color || '#6c757d'}; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.85rem;">
                                            ${entry.categoryName}
                                        </span>
                                    </td>
                                    <td style="padding: 0.75rem;">${entry.description || '-'}</td>
                                    <td style="padding: 0.75rem;">
                                        <span style="color: ${entry.isManual ? '#ffc107' : '#6c757d'}; font-size: 0.85rem;">
                                            ${entry.isManual ? '📝 Manual' : '⏱️ Tracked'}
                                        </span>
                                    </td>
                                </tr>
                            `;
                            })
                            .join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    function renderReports(stats: any): string {
        // Group entries by category
        const entriesByCategory: { [key: string]: { hours: number; count: number } } = {};
        getFilteredEntries().forEach((entry) => {
            if (!entriesByCategory[entry.categoryId]) {
                entriesByCategory[entry.categoryId] = { hours: 0, count: 0 };
            }
            const start = new Date(entry.startTime).getTime();
            const end = entry.endTime ? new Date(entry.endTime).getTime() : new Date().getTime();
            const hours = (end - start) / (1000 * 60 * 60);
            entriesByCategory[entry.categoryId].hours += hours;
            entriesByCategory[entry.categoryId].count += 1;
        });

        return `
            <!-- Period Selection -->
            <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="margin: 0 0 1rem 0; font-size: 1.2rem; color: #333;">Report Period</h2>
                <div style="display: grid; grid-template-columns: 1fr 1fr auto; gap: 1rem; align-items: end;">
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 500;">From Date</label>
                        <input type="date" id="report-date-from" value="${filterDateFrom}" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" />
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 500;">To Date</label>
                        <input type="date" id="report-date-to" value="${filterDateTo}" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" />
                    </div>
                    <button id="apply-report-filters-btn" style="padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Update Report</button>
                </div>
            </div>

            <!-- Summary Stats -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">Total Worked Hours</div>
                    <div style="font-size: 2.5rem; font-weight: 700; color: #007bff;">${stats.totalHours}h</div>
                    <div style="color: #999; font-size: 0.85rem; margin-top: 0.5rem;">${stats.entriesCount} entries</div>
                </div>
                <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">Absence Hours</div>
                    <div style="font-size: 2.5rem; font-weight: 700; color: #ffc107;">${stats.absenceHours}h</div>
                    <div style="color: #999; font-size: 0.85rem; margin-top: 0.5rem;">${stats.absenceDays} days off</div>
                </div>
                <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">Expected Hours</div>
                    <div style="font-size: 2.5rem; font-weight: 700; color: #6c757d;">${stats.expectedHours}h</div>
                    <div style="color: #999; font-size: 0.85rem; margin-top: 0.5rem;">Adjusted for absences</div>
                </div>
                <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">Overtime / Undertime</div>
                    <div style="font-size: 2.5rem; font-weight: 700; color: ${parseFloat(stats.overtime) >= 0 ? '#28a745' : '#dc3545'};">
                        ${parseFloat(stats.overtime) >= 0 ? '+' : ''}${stats.overtime}h
                    </div>
                    <div style="color: #999; font-size: 0.85rem; margin-top: 0.5rem;">
                        ${parseFloat(stats.overtime) >= 0 ? 'Extra hours worked' : 'Hours under target'}
                    </div>
                </div>
            </div>

            <!-- Breakdown by Category -->
            <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="margin: 0 0 1rem 0; font-size: 1.2rem; color: #333;">Time by Category</h2>
                <div style="display: grid; gap: 1rem;">
                    ${Object.keys(entriesByCategory)
                        .map((catId) => {
                            const category = workCategories.find((c) => c.id === catId);
                            const data = entriesByCategory[catId];
                            const percentage =
                                (data.hours / parseFloat(stats.totalHours)) * 100;
                            return `
                        <div style="padding: 1rem; border: 1px solid #dee2e6; border-radius: 6px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                <span style="background: ${category?.color || '#6c757d'}; color: white; padding: 0.25rem 0.75rem; border-radius: 4px; font-weight: 600;">
                                    ${category?.name || 'Unknown'}
                                </span>
                                <span style="font-size: 1.2rem; font-weight: 700; color: #333;">
                                    ${data.hours.toFixed(2)}h
                                </span>
                            </div>
                            <div style="background: #e9ecef; height: 8px; border-radius: 4px; overflow: hidden;">
                                <div style="background: ${category?.color || '#6c757d'}; height: 100%; width: ${percentage}%; transition: width 0.3s;"></div>
                            </div>
                            <div style="margin-top: 0.5rem; color: #666; font-size: 0.85rem;">
                                ${data.count} entries • ${percentage.toFixed(1)}% of total time
                            </div>
                        </div>
                    `;
                        })
                        .join('')}
                </div>
            </div>

            <!-- Absences in Period -->
            ${absences.length > 0 ? `
            <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="margin: 0 0 1rem 0; font-size: 1.2rem; color: #333;">Absences in Period</h2>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                                <th style="padding: 0.75rem; text-align: left; font-weight: 600; color: #495057;">From</th>
                                <th style="padding: 0.75rem; text-align: left; font-weight: 600; color: #495057;">To</th>
                                <th style="padding: 0.75rem; text-align: left; font-weight: 600; color: #495057;">Reason</th>
                                <th style="padding: 0.75rem; text-align: left; font-weight: 600; color: #495057;">Hours</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${absences.filter(absence => {
                                const absenceStart = new Date(absence.startDate);
                                const absenceEnd = new Date(absence.endDate);
                                const fromDate = new Date(filterDateFrom);
                                const toDate = new Date(filterDateTo);
                                return !(absenceEnd < fromDate || absenceStart > toDate);
                            }).map(absence => {
                                const isAllDay = absence.startTime === null || absence.endTime === null;
                                const start = new Date(absence.startDate);
                                const end = new Date(absence.endDate);

                                let hours = 0;
                                if (isAllDay) {
                                    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                                    hours = days * settings.defaultHoursPerDay;
                                } else {
                                    const startTime = new Date(absence.startTime!);
                                    const endTime = new Date(absence.endTime!);
                                    hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
                                }

                                return `
                                <tr style="border-bottom: 1px solid #dee2e6;">
                                    <td style="padding: 0.75rem;">${start.toLocaleDateString()}${!isAllDay ? ' ' + new Date(absence.startTime!).toLocaleTimeString() : ''}</td>
                                    <td style="padding: 0.75rem;">${end.toLocaleDateString()}${!isAllDay ? ' ' + new Date(absence.endTime!).toLocaleTimeString() : ''}</td>
                                    <td style="padding: 0.75rem;">
                                        <span style="background: #ffc107; color: #333; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.85rem;">
                                            ${absence.absenceReason?.name || 'Unknown'}
                                        </span>
                                    </td>
                                    <td style="padding: 0.75rem; font-weight: 600;">${hours.toFixed(2)}h</td>
                                </tr>
                            `}).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            ` : ''}

            <!-- Export Options -->
            <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="margin: 0 0 1rem 0; font-size: 1.2rem; color: #333;">Export Report</h2>
                <button id="export-report-csv-btn" style="padding: 0.75rem 1.5rem; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">
                    📥 Export to CSV
                </button>
            </div>
        `;
    }

    // Attach event handlers
    function attachEventHandlers() {
        // View switchers
        const viewDashboard = element.querySelector('#view-dashboard') as HTMLButtonElement;
        const viewEntries = element.querySelector('#view-entries') as HTMLButtonElement;
        const viewReports = element.querySelector('#view-reports') as HTMLButtonElement;
        const viewAllEntries = element.querySelector('#view-all-entries') as HTMLButtonElement;

        viewDashboard?.addEventListener('click', () => {
            currentView = 'dashboard';
            render();
        });

        viewEntries?.addEventListener('click', () => {
            currentView = 'entries';
            render();
        });

        viewReports?.addEventListener('click', () => {
            currentView = 'reports';
            render();
        });

        viewAllEntries?.addEventListener('click', () => {
            currentView = 'entries';
            render();
        });

        // Clock in/out
        const clockInBtn = element.querySelector('#clock-in-btn') as HTMLButtonElement;
        const clockOutBtn = element.querySelector('#clock-out-btn') as HTMLButtonElement;

        clockInBtn?.addEventListener('click', async () => {
            const categorySelect = element.querySelector(
                '#clock-in-category'
            ) as HTMLSelectElement;
            const descriptionInput = element.querySelector(
                '#clock-in-description'
            ) as HTMLInputElement;
            await clockIn(categorySelect.value, descriptionInput.value);
        });

        clockOutBtn?.addEventListener('click', async () => {
            await clockOut();
        });

        // Filters
        const applyFiltersBtn = element.querySelector('#apply-filters-btn') as HTMLButtonElement;
        const exportCsvBtn = element.querySelector('#export-csv-btn') as HTMLButtonElement;
        const exportReportCsvBtn = element.querySelector(
            '#export-report-csv-btn'
        ) as HTMLButtonElement;

        applyFiltersBtn?.addEventListener('click', () => {
            const dateFromInput = element.querySelector(
                '#filter-date-from'
            ) as HTMLInputElement;
            const dateToInput = element.querySelector('#filter-date-to') as HTMLInputElement;
            const categorySelect = element.querySelector(
                '#filter-category'
            ) as HTMLSelectElement;

            filterDateFrom = dateFromInput.value;
            filterDateTo = dateToInput.value;
            filterCategory = categorySelect.value;

            render();
        });

        exportCsvBtn?.addEventListener('click', () => {
            exportToCSV();
        });

        exportReportCsvBtn?.addEventListener('click', () => {
            exportToCSV();
        });

        // Report filters
        const applyReportFiltersBtn = element.querySelector(
            '#apply-report-filters-btn'
        ) as HTMLButtonElement;

        applyReportFiltersBtn?.addEventListener('click', () => {
            const dateFromInput = element.querySelector(
                '#report-date-from'
            ) as HTMLInputElement;
            const dateToInput = element.querySelector('#report-date-to') as HTMLInputElement;

            filterDateFrom = dateFromInput.value;
            filterDateTo = dateToInput.value;

            render();
        });

        // Manual entry
        const addManualEntryBtn = element.querySelector(
            '#add-manual-entry-btn'
        ) as HTMLButtonElement;
        const cancelManualEntryBtn = element.querySelector(
            '#cancel-manual-entry-btn'
        ) as HTMLButtonElement;
        const saveManualEntryBtn = element.querySelector(
            '#save-manual-entry-btn'
        ) as HTMLButtonElement;

        addManualEntryBtn?.addEventListener('click', () => {
            showAddManualEntry = true;
            render();
        });

        cancelManualEntryBtn?.addEventListener('click', () => {
            showAddManualEntry = false;
            render();
        });

        saveManualEntryBtn?.addEventListener('click', async () => {
            const startInput = element.querySelector('#manual-start') as HTMLInputElement;
            const endInput = element.querySelector('#manual-end') as HTMLInputElement;
            const categorySelect = element.querySelector(
                '#manual-category'
            ) as HTMLSelectElement;
            const descriptionInput = element.querySelector(
                '#manual-description'
            ) as HTMLInputElement;

            if (!startInput.value || !endInput.value) {
                alert('Please fill in both start and end times.');
                return;
            }

            const start = new Date(startInput.value);
            const end = new Date(endInput.value);

            if (end <= start) {
                alert('End time must be after start time.');
                return;
            }

            try {
                const category = workCategories.find((c) => c.id === categorySelect.value);
                const newEntry: TimeEntry = {
                    userId: user?.id!,
                    startTime: start.toISOString(),
                    endTime: end.toISOString(),
                    categoryId: categorySelect.value,
                    categoryName: category?.name || 'Unknown',
                    description: descriptionInput.value,
                    isManual: true,
                    createdAt: new Date().toISOString(),
                };

                // Save to KV store
                const cat = await getCustomDataCategory<object>('timeentries');
                if (cat) {
                    await createCustomDataValue(
                        {
                            dataCategoryId: cat.id,
                            value: JSON.stringify(newEntry),
                        },
                        moduleId!
                    );
                }

                timeEntries.unshift(newEntry);
                timeEntries.sort(
                    (a, b) =>
                        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
                );

                showAddManualEntry = false;
                render();
            } catch (error) {
                console.error('[TimeTracker] Failed to add manual entry:', error);
                alert('Failed to add manual entry. Please try again.');
            }
        });
    }

    // Initialize
    initialize();

    // Cleanup
    return () => {
        console.log('[TimeTracker] Cleaning up');
        stopTimerUpdate();
    };
};

// Named export for simple mode
export { mainEntryPoint };

// Default export for advanced mode
export default mainEntryPoint;
