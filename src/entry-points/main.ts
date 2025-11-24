import type { EntryPoint } from '../lib/main';
import type { MainModuleData } from '@churchtools/extension-points/main';
import type { Absence, AbsenceReason, EventMasterData } from '../utils/ct-types';
import * as XLSX from 'xlsx';
import {
    getModule,
    getCustomDataCategory,
    getCustomDataValues,
    createCustomDataCategory,
    createCustomDataValue,
    updateCustomDataValue,
    deleteCustomDataValue,
} from '../utils/kv-store';
import { initI18n, detectBrowserLanguage, t } from '../utils/i18n';

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
    isBreak: boolean; // If true, does not count towards work hours
    createdAt: string;
    settingsSnapshot?: { // Settings at time of entry creation (for accurate historical SOLL calculations)
        hoursPerDay: number;
        hoursPerWeek: number;
        workWeekDays: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday
    };
}

interface WorkCategory {
    id: string;
    name: string;
    color: string;
    kvStoreId?: number; // Optional: KV-Store ID (used in admin)
}

interface UserHoursConfig {
    userId: number;
    userName: string;
    hoursPerDay: number;
    hoursPerWeek: number;
    isActive?: boolean; // False if user was removed from employee group (soft delete)
    workWeekDays?: number[]; // Individual work week (0=Sun, 1=Mon, ..., 6=Sat). Falls back to global setting if undefined.
}


interface Settings {
    defaultHoursPerDay: number;
    defaultHoursPerWeek: number;
    excelImportEnabled: boolean; // Alpha feature toggle
    reportPeriod?: 'week' | 'month' | 'year' | 'custom'; // User's preferred report period
    employeeGroupId?: number; // ChurchTools group ID for employees (with individual SOLL)
    volunteerGroupId?: number; // ChurchTools group ID for volunteers (no SOLL requirements)
    userHoursConfig?: UserHoursConfig[]; // Individual SOLL hours for employees
    workWeekDays?: number[]; // Days of week that count as work days (0=Sunday, 1=Monday, ..., 6=Saturday). Default: [1,2,3,4,5] (Mon-Fri)
    language?: 'auto' | 'de' | 'en'; // UI language (auto = browser detection)
}


const mainEntryPoint: EntryPoint<MainModuleData> = ({
    element,
    churchtoolsClient,
    user,
    KEY,
}) => {
    // State
    let timeEntries: TimeEntry[] = [];
    let workCategories: WorkCategory[] = [];
    let settings: Settings = {
        defaultHoursPerDay: 8,
        defaultHoursPerWeek: 40,
        excelImportEnabled: false, // Default: disabled (Alpha)
        workWeekDays: [1, 2, 3, 4, 5] // Default: Monday to Friday
    };
    let currentEntry: TimeEntry | null = null;
    let absences: Absence[] = [];
    let absenceReasons: AbsenceReason[] = [];
    let isLoading = true;
    let errorMessage = '';
    let moduleId: number | null = null;

    // Filters - Initialize to This Week (Monday to Sunday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    let filterDateFrom = monday.toISOString().split('T')[0];
    let filterDateTo = sunday.toISOString().split('T')[0];
    let filterCategory = 'all';
    let filterSearch = ''; // Description search term

    // UI state
    let currentView: 'dashboard' | 'entries' | 'absences' | 'reports' = 'dashboard';
    let showAddManualEntry = false;
    let editingEntry: TimeEntry | null = null;
    let showBulkEntry = false;
    let reportPeriod: 'week' | 'month' | 'year' | 'custom' = 'week';
    let showAddAbsence = false;
    let editingAbsence: Absence | null = null;

    // Bulk entry rows
    interface BulkEntryRow {
        id: number;
        startDate: string;
        startTime: string;
        endDate: string;
        endTime: string;
        categoryId: string;
        description: string;
        isBreak: boolean;
    }
    let bulkEntryRows: BulkEntryRow[] = [];
    let nextBulkRowId = 1;

    // Pagination for entries
    let entriesPage = 1;
    const ENTRIES_PER_PAGE = 50;

    // Cache for filtered entries and stats
    let cachedFilteredEntries: TimeEntry[] | null = null;
    let cachedStats: any | null = null;
    let lastFilterState = '';

    // Refresh data
    async function refreshData() {
        try {
            // Clear cache
            cachedFilteredEntries = null;
            cachedStats = null;
            lastFilterState = '';

            // Reload all data
            await Promise.all([
                loadWorkCategories(),
                loadSettings(),
                loadTimeEntries(),
                loadAbsences(),
                loadAbsenceReasons(),
            ]);

            // Check if there's a currently active entry
            currentEntry =
                timeEntries.find((entry) => entry.endTime === null && entry.userId === user?.id) ||
                null;

            // Re-render
            render();

            // Restart timer if there's an active entry
            if (currentEntry) {
                startTimerUpdate();
            }
        } catch (error) {
            console.error('[TimeTracker] Refresh error:', error);
            showNotification('Failed to refresh data. Please try again.', 'error');
        }
    }

    // Initialize
    async function initialize() {
        try {
            isLoading = true;
            render();

            // Get module
            const module = await getModule(KEY);
            moduleId = module.id;

            // Load settings first (needed for language detection)
            await loadSettings();

            // Initialize i18n with user's language preference
            const language = settings.language || 'auto';
            const languageToUse = language === 'auto' ? detectBrowserLanguage() : language;
            await initI18n(languageToUse);

            // Load remaining data
            await Promise.all([
                loadWorkCategories(),
                loadTimeEntries(),
                loadAbsences(),
                loadAbsenceReasons(),
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
                // Call API directly to get raw values (we need the unparsed "value" field)
                const rawValues: Array<{ id: number; dataCategoryId: number; value: string }> =
                    await churchtoolsClient.get(
                        `/custommodules/${moduleId}/customdatacategories/${category.id}/customdatavalues`
                    );

                // Parse each value and preserve the string ID
                workCategories = rawValues.map(rawVal => {
                    const parsedCategory = JSON.parse(rawVal.value) as WorkCategory;
                    return {
                        id: parsedCategory.id, // String ID from stored data
                        name: parsedCategory.name,
                        color: parsedCategory.color
                    };
                });
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

    // Check if current user has access
    async function checkUserAccess(): Promise<boolean> {
        if (!user?.id) return false;
        if (!settings.employeeGroupId && !settings.volunteerGroupId) return true; // No groups configured = allow all

        try {
            // Get user's groups from ChurchTools
            const userGroups = await churchtoolsClient.get(`/persons/${user.id}/groups`) as Array<{ id: number }>;
            const groupIds = userGroups.map((g: { id: number }) => g.id);

            // Check if user is in either employee or volunteer group
            const hasAccess = (!!settings.employeeGroupId && groupIds.includes(settings.employeeGroupId)) ||
                (!!settings.volunteerGroupId && groupIds.includes(settings.volunteerGroupId));

            return hasAccess;
        } catch (error) {
            console.error('[TimeTracker] Failed to check user access:', error);
            return true; // Allow access if check fails
        }
    }

    // Get user-specific hours (from employee config) or default hours
    function getUserHours(): { hoursPerDay: number; hoursPerWeek: number } {
        if (!user?.id) {
            return {
                hoursPerDay: settings.defaultHoursPerDay,
                hoursPerWeek: settings.defaultHoursPerWeek
            };
        }

        // Check if user has individual config (employees only)
        const userConfig = settings.userHoursConfig?.find(c => c.userId === user.id);
        if (userConfig) {
            return {
                hoursPerDay: userConfig.hoursPerDay,
                hoursPerWeek: userConfig.hoursPerWeek
            };
        }

        // Check if user is volunteer (no SOLL requirements)
        // We'll check this during access check and set SOLL to 0 if needed

        // Default to settings
        return {
            hoursPerDay: settings.defaultHoursPerDay,
            hoursPerWeek: settings.defaultHoursPerWeek
        };
    }

    // Create settings snapshot for a time entry (preserves settings at time of creation)
    function createSettingsSnapshot(userId: number): TimeEntry['settingsSnapshot'] {
        // Priority 1: User-specific settings
        const userConfig = settings.userHoursConfig?.find(u => u.userId === userId);

        return {
            hoursPerDay: userConfig?.hoursPerDay ?? settings.defaultHoursPerDay,
            hoursPerWeek: userConfig?.hoursPerWeek ?? settings.defaultHoursPerWeek,
            workWeekDays: userConfig?.workWeekDays ?? settings.workWeekDays ?? [1, 2, 3, 4, 5]
        };
    }

    // Check if a date is a work day according to settings
    function isWorkDay(date: Date, userId?: number): boolean {
        const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

        // Priority 1: User-specific work week
        if (userId !== undefined && settings.userHoursConfig) {
            const userConfig = settings.userHoursConfig.find(u => u.userId === userId);
            if (userConfig?.workWeekDays) {
                return userConfig.workWeekDays.includes(dayOfWeek);
            }
        }

        // Priority 2: Global work week setting
        const workWeekDays = settings.workWeekDays || [1, 2, 3, 4, 5]; // Default: Mon-Fri
        return workWeekDays.includes(dayOfWeek);
    }

    // Count work days in a date range
    function countWorkDays(startDate: Date, endDate: Date, userId?: number): number {
        let count = 0;
        const current = new Date(startDate);
        current.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(0, 0, 0, 0);

        while (current <= end) {
            if (isWorkDay(current, userId)) { // Pass userId to isWorkDay
                count++;
            }
            current.setDate(current.getDate() + 1);
        }

        return count;
    }

    // Load settings from KV store
    async function loadSettings(): Promise<void> {
        try {
            const category = await getCustomDataCategory<object>('settings');
            if (category) {
                const values = await getCustomDataValues<Settings>(category.id, moduleId!);
                if (values.length > 0) {
                    settings = values[0];

                    // Apply saved report period if it exists
                    if (settings.reportPeriod) {
                        reportPeriod = settings.reportPeriod;
                        setReportPeriod(settings.reportPeriod, false); // Don't save on load
                    }

                    // Check user access
                    const hasAccess = await checkUserAccess();
                    if (!hasAccess) {
                        isLoading = false;
                        errorMessage = 'You do not have access to the Time Tracker. Please contact your administrator.';
                        render();
                        return;
                    }
                }
            }
        } catch (error) {
            console.error('[TimeTracker] Failed to load settings:', error);
        }
    }

    // Save settings to KV store
    async function saveSettings(): Promise<void> {
        try {
            const category = await getCustomDataCategory<object>('settings');
            if (category) {
                const values = await getCustomDataValues<Settings>(category.id, moduleId!);

                if (values.length > 0) {
                    // Update existing settings
                    const existingId = (values[0] as any).id;
                    await updateCustomDataValue(
                        category.id,
                        existingId,
                        { value: JSON.stringify(settings) },
                        moduleId!
                    );
                } else {
                    // Create new settings
                    await createCustomDataValue(
                        {
                            dataCategoryId: category.id,
                            value: JSON.stringify(settings),
                        },
                        moduleId!
                    );
                }
            }
        } catch (error) {
            console.error('[TimeTracker] Failed to save settings:', error);
        }
    }

    // Load time entries from KV store
    async function loadTimeEntries(): Promise<void> {
        try {
            const category = await getCustomDataCategory<object>('timeentries');
            if (category) {
                // Call API directly to get raw values to preserve correct data
                const rawValues: Array<{ id: number; dataCategoryId: number; value: string }> =
                    await churchtoolsClient.get(
                        `/custommodules/${moduleId}/customdatacategories/${category.id}/customdatavalues`
                    );

                // Parse each value and update categoryName from current categories
                timeEntries = rawValues.map(rawVal => {
                    const entry = JSON.parse(rawVal.value) as TimeEntry;

                    // Backward compatibility: set isBreak to false if undefined
                    if (entry.isBreak === undefined) {
                        entry.isBreak = false;
                    }

                    // Update categoryName from current categories (in case it was renamed)
                    const currentCategory = workCategories.find(c => c.id === entry.categoryId);
                    if (currentCategory) {
                        entry.categoryName = currentCategory.name;
                    }

                    return entry;
                }).sort(
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
        } catch (error) {
            console.error('[TimeTracker] Failed to load absences:', error);
            absences = [];
        }
    }

    // Load absence reasons from ChurchTools Event Masterdata
    async function loadAbsenceReasons(): Promise<void> {
        try {
            console.log('[TimeTracker] Loading absence reasons from /event/masterdata...');
            const response = await churchtoolsClient.get<EventMasterData>('/event/masterdata');
            console.log('[TimeTracker] Masterdata response:', response);
            absenceReasons = response?.absenceReasons || [];
            console.log('[TimeTracker] Loaded absence reasons:', absenceReasons.length, absenceReasons);
        } catch (error) {
            console.error('[TimeTracker] Failed to load absence reasons:', error);
            absenceReasons = [];
        }
    }

    // Create absence
    async function createAbsence(data: {
        absenceReasonId: number;
        comment: string;
        startDate: string;
        endDate: string;
        startTime?: string;
        endTime?: string;
    }) {
        if (!user?.id) return;

        try {
            const isAllDay = !data.startTime || !data.endTime;
            const payload: any = {
                personId: user.id,
                absenceReasonId: data.absenceReasonId,
                comment: data.comment || null,
                startDate: data.startDate,
                endDate: data.endDate,
            };

            if (!isAllDay) {
                payload.startTime = data.startTime;
                payload.endTime = data.endTime;
            }

            await churchtoolsClient.post(`/persons/${user.id}/absences`, payload);
            await loadAbsences();
            showAddAbsence = false;
            render();
            showNotification('Absence created successfully!', 'success');
        } catch (error) {
            console.error('[TimeTracker] Failed to create absence:', error);
            showNotification('Failed to create absence. Please try again.', 'error');
        }
    }

    // Update absence
    async function updateAbsence(
        absenceId: number,
        data: {
            absenceReasonId: number;
            comment: string;
            startDate: string;
            endDate: string;
            startTime?: string;
            endTime?: string;
        }
    ) {
        if (!user?.id) return;

        try {
            const isAllDay = !data.startTime || !data.endTime;
            const payload: any = {
                absenceReasonId: data.absenceReasonId,
                comment: data.comment || null,
                startDate: data.startDate,
                endDate: data.endDate,
            };

            if (!isAllDay) {
                payload.startTime = data.startTime;
                payload.endTime = data.endTime;
            }

            await churchtoolsClient.put(`/persons/${user.id}/absences/${absenceId}`, payload);
            await loadAbsences();
            editingAbsence = null;
            render();
            showNotification('Absence updated successfully!', 'success');
        } catch (error) {
            console.error('[TimeTracker] Failed to update absence:', error);
            showNotification('Failed to update absence. Please try again.', 'error');
        }
    }

    // Delete absence
    async function deleteAbsence(absenceId: number) {
        if (!user?.id) return;

        try {
            // Use the generic request method with DELETE
            await (churchtoolsClient as any).request('DELETE', `/persons/${user.id}/absences/${absenceId}`);
            await loadAbsences();
            render();
            showNotification('Absence deleted successfully!', 'success');
        } catch (error) {
            console.error('[TimeTracker] Failed to delete absence:', error);
            showNotification('Failed to delete absence. Please try again.', 'error');
        }
    }

    // Clock in
    async function clockIn(categoryId: string, description: string, isBreak: boolean = false) {
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
                isBreak,
                createdAt: new Date().toISOString(),
                settingsSnapshot: createSettingsSnapshot(user.id), // Preserve settings at time of clock-in
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
            showNotification('Failed to clock in. Please try again.', 'error');
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
            showNotification('Failed to clock out. Please try again.', 'error');
            // Reload to get fresh state
            await loadTimeEntries();
            currentEntry = timeEntries.find((entry) => entry.endTime === null && entry.userId === user?.id) || null;
            render();
        }
    }

    // Delete time entry
    async function deleteTimeEntry(startTime: string) {
        try {
            const cat = await getCustomDataCategory<object>('timeentries');
            if (!cat) {
                throw new Error('Time entries category not found');
            }

            // Find the entry in KV store
            const allValues = await getCustomDataValues<TimeEntry>(cat.id, moduleId!);
            const existingValue = allValues.find(v => v.startTime === startTime);

            if (!existingValue) {
                throw new Error('Time entry not found in database');
            }

            const kvStoreId = (existingValue as any).id;
            await deleteCustomDataValue(cat.id, kvStoreId, moduleId!);

            // Remove from local array
            timeEntries = timeEntries.filter(e => e.startTime !== startTime);

            render();
        } catch (error) {
            console.error('[TimeTracker] Delete entry failed:', error);
            showNotification('Failed to delete entry. Please try again.', 'error');
        }
    }

    // Bulk entry management
    function addBulkEntryRow() {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().slice(0, 5);

        bulkEntryRows.push({
            id: nextBulkRowId++,
            startDate: dateStr,
            startTime: timeStr,
            endDate: dateStr,
            endTime: timeStr,
            categoryId: workCategories[0]?.id || '',
            description: '',
            isBreak: false,
        });
        render();
    }

    function removeBulkEntryRow(rowId: number) {
        bulkEntryRows = bulkEntryRows.filter(row => row.id !== rowId);
        render();
    }

    function updateBulkEntryRow(rowId: number, field: keyof BulkEntryRow, value: string | boolean) {
        const row = bulkEntryRows.find(r => r.id === rowId);
        if (row && field !== 'id') {
            (row as any)[field] = value;
        }
    }

    async function saveBulkEntries() {
        if (bulkEntryRows.length === 0) {
            showNotification('No entries to save.', 'warning');
            return;
        }

        // Validate all rows
        const invalidRows: number[] = [];
        const invalidCategories: string[] = [];

        for (let i = 0; i < bulkEntryRows.length; i++) {
            const row = bulkEntryRows[i];

            // Check required fields
            if (!row.startDate || !row.startTime || !row.endDate || !row.endTime) {
                showNotification('All date and time fields are required.', 'error');
                return;
            }

            // Check time validity
            const start = new Date(`${row.startDate}T${row.startTime}`);
            const end = new Date(`${row.endDate}T${row.endTime}`);

            if (end <= start) {
                showNotification('End time must be after start time for all entries.', 'error');
                return;
            }

            // Check if category exists
            const category = workCategories.find((c) => c.id === row.categoryId);
            if (!category) {
                invalidRows.push(i + 1);
                if (!invalidCategories.includes(row.categoryId)) {
                    invalidCategories.push(row.categoryId);
                }
            }
        }

        // If there are invalid categories, show error
        if (invalidRows.length > 0) {
            const availableCategoryIds = workCategories.map(c => `"${c.id}"`).join(', ');
            showNotification(
                `Invalid category IDs in row(s) ${invalidRows.join(', ')}: ${invalidCategories.join(', ')}. Available: ${availableCategoryIds}`,
                'error',
                7000
            );
            return;
        }

        try {
            const cat = await getCustomDataCategory<object>('timeentries');
            if (!cat) {
                throw new Error('Time entries category not found');
            }

            let savedCount = 0;

            // Save all entries
            for (const row of bulkEntryRows) {
                const category = workCategories.find((c) => c.id === row.categoryId);
                const newEntry: TimeEntry = {
                    userId: user?.id!,
                    startTime: new Date(`${row.startDate}T${row.startTime}`).toISOString(),
                    endTime: new Date(`${row.endDate}T${row.endTime}`).toISOString(),
                    categoryId: row.categoryId,
                    categoryName: category!.name, // We know category exists due to validation above
                    description: row.description,
                    isManual: true,
                    isBreak: row.isBreak,
                    createdAt: new Date().toISOString(),
                    settingsSnapshot: createSettingsSnapshot(user?.id!), // Preserve settings at time of bulk entry creation
                };

                console.log('[TimeTracker] Saving bulk entry:', newEntry);

                await createCustomDataValue(
                    {
                        dataCategoryId: cat.id,
                        value: JSON.stringify(newEntry),
                    },
                    moduleId!
                );

                savedCount++;
            }

            // Clear bulk entries and close form
            bulkEntryRows = [];
            showBulkEntry = false;

            // Reload all entries from database to ensure consistency
            await loadTimeEntries();

            render();

            // Only show success message if entries were actually saved
            if (savedCount > 0) {
                showNotification(`Successfully saved ${savedCount} ${savedCount === 1 ? 'entry' : 'entries'}!`, 'success');
            } else {
                showNotification('No entries were saved.', 'warning');
            }
        } catch (error) {
            console.error('[TimeTracker] Failed to save bulk entries:', error);
            showNotification('Failed to save entries. Please try again.', 'error');
        }
    }

    // Download Excel template
    function downloadExcelTemplate() {
        if (workCategories.length === 0) {
            showNotification('No categories available. Please create categories in the Admin panel first.', 'error');
            return;
        }

        // Create worksheet data with headers and example row
        const firstCategoryId = workCategories[0]?.id || '';
        const worksheetData = [
            ['Start Date', 'Start Time', 'End Date', 'End Time', 'Category ID', 'Description'],
            ['2025-01-20', '09:00', '2025-01-20', '17:00', firstCategoryId, 'Example work entry'],
        ];

        // Create worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

        // Set column widths
        worksheet['!cols'] = [
            { wch: 15 },  // Start Date
            { wch: 12 },  // Start Time
            { wch: 15 },  // End Date
            { wch: 12 },  // End Time
            { wch: 20 },  // Category ID
            { wch: 40 },  // Description
        ];

        // Create workbook
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Time Entries');

        // Add a second sheet with category reference (for copy/paste)
        const categoriesData = [
            ['Category Name', 'Category ID (copy this to Time Entries sheet)', 'Color'],
            ...workCategories.map(cat => [cat.name, cat.id, cat.color])
        ];
        const categoriesSheet = XLSX.utils.aoa_to_sheet(categoriesData);
        categoriesSheet['!cols'] = [{ wch: 25 }, { wch: 45 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(workbook, categoriesSheet, 'Available Categories');

        // Generate Excel file and trigger download
        XLSX.writeFile(workbook, `TimeTracker_Template_${new Date().toISOString().split('T')[0]}.xlsx`);

        showNotification('Excel template downloaded! Check the "Available Categories" sheet for valid category IDs.', 'success', 5000);
    }

    // Import from Excel
    function importFromExcel(file: File) {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });

                // Read first sheet
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json<any>(firstSheet, { header: 1 });

                // Skip header row
                const dataRows = rows.slice(1);

                if (dataRows.length === 0) {
                    showNotification('No data found in Excel file.', 'error');
                    return;
                }

                // Clear existing rows and ensure bulk entry is shown
                bulkEntryRows = [];
                nextBulkRowId = 1;
                showBulkEntry = true;
                showAddManualEntry = false;
                editingEntry = null;

                // Parse each row
                let importedCount = 0;
                let skippedCount = 0;

                for (const row of dataRows) {
                    // Skip empty rows
                    if (!row[0] && !row[1] && !row[2] && !row[3]) continue;

                    const startDate = row[0] ? String(row[0]) : '';
                    const startTime = row[1] ? String(row[1]) : '';
                    const endDate = row[2] ? String(row[2]) : '';
                    const endTime = row[3] ? String(row[3]) : '';
                    const categoryIdOrName = row[4] ? String(row[4]).trim() : '';
                    const description = row[5] ? String(row[5]) : '';

                    // Validate required fields
                    if (!startDate || !startTime || !endDate || !endTime) {
                        skippedCount++;
                        continue;
                    }

                    // Parse date if it's an Excel serial date
                    let parsedStartDate = startDate;
                    let parsedEndDate = endDate;

                    // Check if it's a number (Excel serial date)
                    if (!isNaN(Number(startDate))) {
                        const date = XLSX.SSF.parse_date_code(Number(startDate));
                        parsedStartDate = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
                    } else if (startDate.includes('/')) {
                        // Convert MM/DD/YYYY or DD/MM/YYYY to YYYY-MM-DD
                        const parts = startDate.split('/');
                        if (parts.length === 3) {
                            parsedStartDate = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
                        }
                    }

                    if (!isNaN(Number(endDate))) {
                        const date = XLSX.SSF.parse_date_code(Number(endDate));
                        parsedEndDate = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
                    } else if (endDate.includes('/')) {
                        const parts = endDate.split('/');
                        if (parts.length === 3) {
                            parsedEndDate = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
                        }
                    }

                    // Parse time if needed (handle HH:MM:SS or HH:MM format)
                    let parsedStartTime = startTime;
                    let parsedEndTime = endTime;

                    if (startTime.includes(':')) {
                        const timeParts = startTime.split(':');
                        parsedStartTime = `${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}`;
                    }

                    if (endTime.includes(':')) {
                        const timeParts = endTime.split(':');
                        parsedEndTime = `${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}`;
                    }

                    // Find category by ID or name (case-insensitive)
                    let categoryId = categoryIdOrName;
                    const categoryMatch = workCategories.find(
                        c => c.name.toLowerCase() === categoryIdOrName.toLowerCase() ||
                            c.id.toLowerCase() === categoryIdOrName.toLowerCase()
                    );
                    if (categoryMatch) {
                        categoryId = categoryMatch.id;
                    } else if (categoryIdOrName) {
                        // If a category was specified but not found, keep it (will be caught by validation)
                        categoryId = categoryIdOrName;
                    } else if (workCategories.length > 0) {
                        // Default to first category if no category specified
                        categoryId = workCategories[0].id;
                    }

                    bulkEntryRows.push({
                        id: nextBulkRowId++,
                        startDate: parsedStartDate,
                        startTime: parsedStartTime,
                        endDate: parsedEndDate,
                        endTime: parsedEndTime,
                        categoryId: categoryId,
                        description: description,
                        isBreak: false, // Default to non-break for imported entries
                    });

                    importedCount++;
                }

                render();

                if (skippedCount > 0) {
                    showNotification(`Successfully imported ${importedCount} entries. ${skippedCount} rows were skipped due to missing required fields.`, 'success', 5000);
                } else {
                    showNotification(`Successfully imported ${importedCount} entries from Excel!`, 'success');
                }
            } catch (error) {
                console.error('[TimeTracker] Failed to import Excel:', error);
                showNotification('Failed to import Excel file. Please make sure it uses the correct template format.', 'error');
            }
        };

        reader.onerror = () => {
            showNotification('Failed to read Excel file. Please try again.', 'error');
        };

        reader.readAsBinaryString(file);
    }

    // Show notification toast
    function showNotification(message: string, type: 'success' | 'error' | 'warning' = 'success', duration: number = 3000) {
        // Create or get notification container
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            padding: 1rem 1.5rem;
            padding-right: ${type !== 'success' ? '3rem' : '1.5rem'};
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#ffc107'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            font-weight: 600;
            max-width: 400px;
            animation: slideIn 0.3s ease-out;
            position: relative;
            pointer-events: auto;
        `;
        // Add close button for errors and warnings
        if (type !== 'success') {
            const closeButton = document.createElement('button');
            closeButton.innerHTML = '✕';
            closeButton.style.cssText = `
                position: absolute;
                top: 0.5rem;
                right: 0.5rem;
                background: transparent;
                border: none;
                color: white;
                font-size: 1.2rem;
                cursor: pointer;
                padding: 0.25rem 0.5rem;
                line-height: 1;
                opacity: 0.8;
                transition: opacity 0.2s;
            `;
            closeButton.onmouseover = () => closeButton.style.opacity = '1';
            closeButton.onmouseout = () => closeButton.style.opacity = '0.8';
            closeButton.onclick = () => {
                notification.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => {
                    if (container?.contains(notification)) {
                        container.removeChild(notification);
                    }
                }, 300);
            };
            notification.appendChild(closeButton);
        }

        // Add message text
        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;
        messageSpan.style.cssText = 'display: block;';
        notification.appendChild(messageSpan);

        // Add animation styles (only once)
        if (!document.head.querySelector('style[data-notification-styles]')) {
            const style = document.createElement('style');
            style.setAttribute('data-notification-styles', 'true');
            style.textContent = `
                @keyframes slideIn {
                    from {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        container.appendChild(notification);

        // Auto-remove only for success messages
        if (type === 'success') {
            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => {
                    if (container?.contains(notification)) {
                        container.removeChild(notification);
                    }
                }, 300);
            }, duration);
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

    // Calculate statistics (with caching)
    function calculateStats() {
        const currentFilterState = getFilterState();

        // Return cached if available and filters haven't changed
        if (cachedStats && lastFilterState === currentFilterState) {
            return cachedStats;
        }

        const filtered = getFilteredEntries();
        // Exclude breaks from work hour calculations
        const workEntries = filtered.filter(entry => !entry.isBreak);
        const totalMs = workEntries.reduce((sum, entry) => {
            const start = new Date(entry.startTime).getTime();
            const end = entry.endTime ? new Date(entry.endTime).getTime() : new Date().getTime();
            return sum + (end - start);
        }, 0);

        const totalHours = totalMs / (1000 * 60 * 60);

        // Calculate absence hours in the filtered period
        const absenceHours = calculateAbsenceHours();

        // Get user-specific hours
        const userHours = getUserHours();

        // Count actual work days in the period (respecting workWeekDays configuration)
        const workDaysCount = countWorkDays(new Date(filterDateFrom), new Date(filterDateTo), user?.id);

        // Expected hours = work days count * hours per day - absence hours
        const expectedHours = workDaysCount * userHours.hoursPerDay - absenceHours;
        const overtime = totalHours - expectedHours;

        cachedStats = {
            totalHours: totalHours.toFixed(2),
            expectedHours: expectedHours.toFixed(2),
            overtime: overtime.toFixed(2),
            entriesCount: filtered.length,
            absenceHours: absenceHours.toFixed(2),
            absenceDays: (absenceHours / userHours.hoursPerDay).toFixed(1),
        };

        return cachedStats;
    }

    // Set report period dates
    function setReportPeriod(period: 'week' | 'month' | 'year' | 'custom', saveToSettings: boolean = true) {
        reportPeriod = period;
        const now = new Date();

        switch (period) {
            case 'week':
                // Current week (Monday to Sunday)
                const dayOfWeek = now.getDay();
                const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                const monday = new Date(now);
                monday.setDate(now.getDate() + mondayOffset);
                monday.setHours(0, 0, 0, 0);

                const sunday = new Date(monday);
                sunday.setDate(monday.getDate() + 6);
                sunday.setHours(23, 59, 59, 999);

                filterDateFrom = monday.toISOString().split('T')[0];
                filterDateTo = sunday.toISOString().split('T')[0];
                break;

            case 'month':
                // Current month
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

                filterDateFrom = firstDay.toISOString().split('T')[0];
                filterDateTo = lastDay.toISOString().split('T')[0];
                break;

            case 'year':
                // Current year
                const yearStart = new Date(now.getFullYear(), 0, 1);
                const yearEnd = new Date(now.getFullYear(), 11, 31);

                filterDateFrom = yearStart.toISOString().split('T')[0];
                filterDateTo = yearEnd.toISOString().split('T')[0];
                break;

            case 'custom':
                // Keep current dates
                break;
        }

        // Save period to settings
        if (saveToSettings) {
            settings.reportPeriod = period;
            saveSettings();
        }
    }

    // Calculate dashboard statistics (Today, This Week, This Month, Last Month)
    function calculateDashboardStats() {
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        // Helper: Count workdays (Monday-Friday) in date range
        function countWorkdays(startDate: Date, endDate: Date): number {
            let count = 0;
            const current = new Date(startDate);
            while (current <= endDate) {
                const dayOfWeek = current.getDay();
                if (dayOfWeek >= 1 && dayOfWeek <= 5) count++;
                current.setDate(current.getDate() + 1);
            }
            return count;
        }

        // Helper: Calculate hours for date range
        function calculateHours(startDate: string, endDate: string) {
            const entries = timeEntries.filter(e => {
                if (e.isBreak || !e.endTime) return false;
                const entryDate = new Date(e.startTime).toISOString().split('T')[0];
                return entryDate >= startDate && entryDate <= endDate;
            });
            const totalMs = entries.reduce((sum, e) => {
                const start = new Date(e.startTime).getTime();
                const end = new Date(e.endTime!).getTime();
                return sum + (end - start);
            }, 0);
            return totalMs / (1000 * 60 * 60); // Convert to hours
        }

        // Get user-specific hours
        const userHours = getUserHours();

        // TODAY
        const todayIst = calculateHours(today, today);
        const todayDate = new Date(today);
        const isTodayWorkday = todayDate.getDay() >= 1 && todayDate.getDay() <= 5;
        const todaySoll = isTodayWorkday ? userHours.hoursPerDay : 0;

        // THIS WEEK
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(now);
        monday.setDate(now.getDate() + mondayOffset);
        monday.setHours(0, 0, 0, 0);
        const weekStart = monday.toISOString().split('T')[0];
        const weekEnd = today;
        const weekIst = calculateHours(weekStart, weekEnd);
        const weekWorkdays = countWorkdays(new Date(weekStart), new Date(weekEnd));
        const weekSoll = weekWorkdays * userHours.hoursPerDay;
        const weekNumber = getISOWeek(now);
        const weekYear = getISOWeekYear(now);

        // THIS MONTH
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const monthEnd = today;
        const monthIst = calculateHours(monthStart, monthEnd);
        const monthWorkdays = countWorkdays(new Date(monthStart), new Date(monthEnd));
        const monthSoll = monthWorkdays * userHours.hoursPerDay;

        // LAST MONTH
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthStart = lastMonthDate.toISOString().split('T')[0];
        const lastMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0);
        const lastMonthEnd = lastMonthLastDay.toISOString().split('T')[0];
        const lastMonthIst = calculateHours(lastMonthStart, lastMonthEnd);
        const lastMonthWorkdays = countWorkdays(lastMonthDate, lastMonthLastDay);
        const lastMonthSoll = lastMonthWorkdays * userHours.hoursPerDay;

        return {
            today: { ist: todayIst, soll: todaySoll },
            week: { ist: weekIst, soll: weekSoll, weekNumber, year: weekYear },
            month: { ist: monthIst, soll: monthSoll },
            lastMonth: { ist: lastMonthIst, soll: lastMonthSoll }
        };
    }

    // Calculate absence hours in the filtered date range
    function calculateAbsenceHours(): number {
        const fromDate = new Date(filterDateFrom);
        const toDate = new Date(filterDateTo);

        // Get user-specific hours
        const userHours = getUserHours();

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
                totalAbsenceHours += days * userHours.hoursPerDay;
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

    // Get current filter state for cache invalidation
    function getFilterState(): string {
        return `${filterDateFrom}|${filterDateTo}|${filterCategory}|${filterSearch}|${timeEntries.length}`;
    }

    // Get filtered entries (with caching)
    function getFilteredEntries(): TimeEntry[] {
        const currentFilterState = getFilterState();

        // Return cached if available and filters haven't changed
        if (cachedFilteredEntries && lastFilterState === currentFilterState) {
            return cachedFilteredEntries;
        }

        // Calculate filtered entries
        cachedFilteredEntries = timeEntries.filter((entry) => {
            // Filter by user
            if (entry.userId !== user?.id) return false;

            // Filter by date
            const entryDate = new Date(entry.startTime).toISOString().split('T')[0];
            if (entryDate < filterDateFrom || entryDate > filterDateTo) return false;

            // Filter by category
            if (filterCategory !== 'all' && entry.categoryId !== filterCategory) return false;

            // Filter by description search
            if (filterSearch && !entry.description?.toLowerCase().includes(filterSearch.toLowerCase())) return false;

            return true;
        });

        lastFilterState = currentFilterState;
        return cachedFilteredEntries;
    }

    // Format duration
    function formatDuration(ms: number): string {
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((ms % (1000 * 60)) / 1000);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Format decimal hours to hours and minutes (e.g. 5.5 -> "5h 30m")
    function formatDecimalHours(decimalHours: number): string {
        const hours = Math.floor(decimalHours);
        const minutes = Math.round((decimalHours - hours) * 60);

        if (minutes === 0) {
            return `${hours}h`;
        }
        return `${hours}h ${minutes}m`;
    }

    // Get ISO week number (KW)
    function getISOWeek(date: Date): number {
        const target = new Date(date.valueOf());
        const dayNr = (date.getDay() + 6) % 7; // Monday = 0, Sunday = 6
        target.setDate(target.getDate() - dayNr + 3); // Nearest Thursday
        const firstThursday = target.valueOf();
        target.setMonth(0, 1); // January 1st
        if (target.getDay() !== 4) {
            target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
        }
        return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000); // 604800000 = 7 * 24 * 3600 * 1000
    }

    // Get ISO week year
    function getISOWeekYear(date: Date): number {
        const target = new Date(date.valueOf());
        target.setDate(target.getDate() + 3 - (target.getDay() + 6) % 7);
        return target.getFullYear();
    }

    // Format hours from milliseconds (e.g., 8.5h -> "8h 30m")
    function formatHours(ms: number): string {
        const hours = ms / (1000 * 60 * 60);
        return formatDecimalHours(hours);
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
                        <div style="margin-bottom: 1rem; display: flex; justify-content: center;">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#007bff" stroke-width="2" style="animation: spin 1s linear infinite;">
                                <style>
                                    @keyframes spin {
                                        from { transform: rotate(0deg); }
                                        to { transform: rotate(360deg); }
                                    }
                                </style>
                                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
                            </svg>
                        </div>
                        <p style="color: #666;">${t('ct.extension.timetracker.common.loadingTitle')}</p>
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

        element.innerHTML = `
            <div style="min-height: 100vh; background: #f8f9fa; padding: 2rem;">
                <div style="max-width: 1400px; margin: 0 auto;">

                    <!-- Header -->
                    <div style="background: #fff; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <div style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: center;">
                            <div style="flex: 1 1 250px; min-width: 250px;">
                                <h1 style="margin: 0 0 0.5rem 0; font-size: clamp(1.3rem, 4vw, 1.8rem); color: #333;">
                                    Time Tracker
                                </h1>
                                <div style="font-size: 1.1rem; color: #555; margin-bottom: 2rem;">
                    ${t('ct.extension.timetracker.dashboard.welcome').replace('{name}', user?.firstName || 'User')}
                </div>            </div>
                            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; flex: 0 1 auto;">
                                <button id="refresh-data-btn" style="padding: 0.5rem; border: 1px solid #28a745; background: #fff; color: #28a745; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Refresh data">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="23 4 23 10 17 10"></polyline>
                                        <polyline points="1 20 1 14 7 14"></polyline>
                                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                    </svg>
                                </button>
                                <div style="width: 1px; height: 30px; background: #ddd; display: none;" class="nav-divider"></div>
                                <button id="view-dashboard" style="padding: 0.5rem 1rem; border: ${currentView === 'dashboard' ? '2px' : '1px'} solid ${currentView === 'dashboard' ? '#007bff' : '#ddd'}; background: ${currentView === 'dashboard' ? '#e7f3ff' : '#fff'}; color: ${currentView === 'dashboard' ? '#007bff' : '#666'}; border-radius: 4px; cursor: pointer; font-weight: ${currentView === 'dashboard' ? '600' : '400'}; white-space: nowrap;">${t('ct.extension.timetracker.dashboard.title')}</button>
                                <button id="view-entries" style="padding: 0.5rem 1rem; border: ${currentView === 'entries' ? '2px' : '1px'} solid ${currentView === 'entries' ? '#007bff' : '#ddd'}; background: ${currentView === 'entries' ? '#e7f3ff' : '#fff'}; color: ${currentView === 'entries' ? '#007bff' : '#666'}; border-radius: 4px; cursor: pointer; font-weight: ${currentView === 'entries' ? '600' : '400'}; white-space: nowrap;">${t('ct.extension.timetracker.timeEntries.title')}</button>
                                <button id="view-absences" style="padding: 0.5rem 1rem; border: ${currentView === 'absences' ? '2px' : '1px'} solid ${currentView === 'absences' ? '#007bff' : '#ddd'}; background: ${currentView === 'absences' ? '#e7f3ff' : '#fff'}; color: ${currentView === 'absences' ? '#007bff' : '#666'}; border-radius: 4px; cursor: pointer; font-weight: ${currentView === 'absences' ? '600' : '400'}; white-space: nowrap;">${t('ct.extension.timetracker.absences.title')}</button>
                                <button id="view-reports" style="padding: 0.5rem 1rem; border: ${currentView === 'reports' ? '2px' : '1px'} solid ${currentView === 'reports' ? '#007bff' : '#ddd'}; background: ${currentView === 'reports' ? '#e7f3ff' : '#fff'}; color: ${currentView === 'reports' ? '#007bff' : '#666'}; border-radius: 4px; cursor: pointer; font-weight: ${currentView === 'reports' ? '600' : '400'}; white-space: nowrap;">${t('ct.extension.timetracker.reports.title')}</button>
                            </div>
                        </div>
                        <style>
                            @media (min-width: 900px) {
                                .nav-divider {
                                    display: block !important;
                                }
                            }
                        </style>
                    </div>

                    ${renderCurrentView()}
                </div>
            </div>
        `;

        attachEventHandlers();
    }

    // Render the appropriate view based on currentView
    function renderCurrentView(): string {
        switch (currentView) {
            case 'dashboard':
                return renderDashboard();
            case 'entries':
                return renderEntries();
            case 'absences':
                return renderAbsences();
            case 'reports':
                return renderReports();
            default:
                return '';
        }
    }

    function renderDashboard(): string {
        return `
            <!-- Current Status -->
            <div style="background: ${currentEntry ? '#d4edda' : '#fff'}; border: 1px solid ${currentEntry ? '#c3e6cb' : '#ddd'}; border-radius: 8px; padding: 2rem; margin-bottom: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                ${currentEntry
                ? `
                    <div style="text-align: center;">
                        <div style="font-size: 1.2rem; color: #666; margin-bottom: 2rem; font-weight: 600;">
                            ${t('ct.extension.timetracker.dashboard.whatAreYouWorkingOn')}
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
                        <button id="clock-out-btn" style="padding: 1rem 2rem; background: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 1.1rem; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.2); display: inline-flex; align-items: center; gap: 0.5rem; justify-content: center;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <rect x="6" y="4" width="12" height="16" rx="2"></rect>
                            </svg>
                            ${t('ct.extension.timetracker.dashboard.clockOut')}
                        </button>
                    </div>
                `
                : `
                    <div style="text-align: center;">
                        <div style="font-size: 1.2rem; color: #666; margin-bottom: 2rem; font-weight: 600;">
                            ${t('ct.extension.timetracker.dashboard.currentlyWorking')}
                        </div>
                        <div style="max-width: 500px; margin: 0 auto;">
                            <label for="clock-in-category" style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 500; text-align: left;">${t('ct.extension.timetracker.dashboard.category')}</label>
                            <select id="clock-in-category" name="category" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 1rem; font-size: 1rem;">
                                ${workCategories.map((cat) => `<option value="${cat.id}">${cat.name}</option>`).join('')}
                            </select>

                            <label for="clock-in-description" style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 500; text-align: left;">${t('ct.extension.timetracker.dashboard.description')}</label>
                            <input
                                type="text"
                                id="clock-in-description"
                                name="description"
                                autocomplete="off"
                                data-lpignore="true"
                                data-1p-ignore="true"
                                placeholder="${t('ct.extension.timetracker.dashboard.whatAreYouWorkingOnPlaceholder')}"
                                style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 1rem; font-size: 1rem;"
                            />

                            <label style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem; cursor: pointer; text-align: left;">
                                <input type="checkbox" id="clock-in-is-break" style="width: 18px; height: 18px; cursor: pointer;" />
                                <span style="color: #666; font-size: 0.95rem;">${t('ct.extension.timetracker.dashboard.isBreak')}</span>
                            </label>

                            <button id="clock-in-btn" style="flex: 1; padding: 1rem; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 1rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                </svg>
                                ${t('ct.extension.timetracker.dashboard.clockIn')}
                            </button>
                        </div>
                    </div>
                `
            }
            </div>

            <!-- Dashboard Statistics -->
            ${(() => {
                const dashStats = calculateDashboardStats();
                return `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                <!-- Today -->
                <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem; font-weight: 600;">${t('ct.extension.timetracker.dashboard.stats.today')}</div>
                    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
                        <div>
                            <div style="color: #999; font-size: 0.75rem;">IST</div>
                            <div style="font-size: 1.5rem; font-weight: 700; color: ${dashStats.today.ist >= dashStats.today.soll ? '#28a745' : (dashStats.today.soll > 0 ? '#dc3545' : '#6c757d')};">
                                ${formatDecimalHours(dashStats.today.ist)}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="color: #999; font-size: 0.75rem;">SOLL</div>
                            <div style="font-size: 1.5rem; font-weight: 700; color: #6c757d;">
                                ${formatDecimalHours(dashStats.today.soll)}
                            </div>
                        </div>
                    </div>
                    <div style="height: 4px; background: #e9ecef; border-radius: 2px; overflow: hidden;">
                        <div style="height: 100%; background: ${dashStats.today.ist >= dashStats.today.soll ? '#28a745' : '#dc3545'}; width: ${dashStats.today.soll > 0 ? Math.min(100, (dashStats.today.ist / dashStats.today.soll) * 100) : 0}%; transition: width 0.3s;"></div>
                    </div>
                </div>

                <!-- This Week -->
                <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem; font-weight: 600;">${t('ct.extension.timetracker.dashboard.stats.thisWeek')} (${t('ct.extension.timetracker.dashboard.calendarWeek')} ${dashStats.week.weekNumber})</div>
                    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
                        <div>
                            <div style="color: #999; font-size: 0.75rem;">IST</div>
                            <div style="font-size: 1.5rem; font-weight: 700; color: ${dashStats.week.ist >= dashStats.week.soll ? '#28a745' : '#dc3545'};">
                                ${formatDecimalHours(dashStats.week.ist)}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="color: #999; font-size: 0.75rem;">SOLL</div>
                            <div style="font-size: 1.5rem; font-weight: 700; color: #6c757d;">
                                ${formatDecimalHours(dashStats.week.soll)}
                            </div>
                        </div>
                    </div>
                    <div style="height: 4px; background: #e9ecef; border-radius: 2px; overflow: hidden;">
                        <div style="height: 100%; background: ${dashStats.week.ist >= dashStats.week.soll ? '#28a745' : '#dc3545'}; width: ${Math.min(100, (dashStats.week.ist / dashStats.week.soll) * 100)}%; transition: width 0.3s;"></div>
                    </div>
                </div>

                <!-- This Month -->
                <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem; font-weight: 600;">${t('ct.extension.timetracker.dashboard.stats.thisMonth')}</div>
                    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
                        <div>
                            <div style="color: #999; font-size: 0.75rem;">IST</div>
                            <div style="font-size: 1.5rem; font-weight: 700; color: ${dashStats.month.ist >= dashStats.month.soll ? '#28a745' : '#dc3545'};">
                                ${formatDecimalHours(dashStats.month.ist)}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="color: #999; font-size: 0.75rem;">SOLL</div>
                            <div style="font-size: 1.5rem; font-weight: 700; color: #6c757d;">
                                ${formatDecimalHours(dashStats.month.soll)}
                            </div>
                        </div>
                    </div>
                    <div style="height: 4px; background: #e9ecef; border-radius: 2px; overflow: hidden;">
                        <div style="height: 100%; background: ${dashStats.month.ist >= dashStats.month.soll ? '#28a745' : '#dc3545'}; width: ${Math.min(100, (dashStats.month.ist / dashStats.month.soll) * 100)}%; transition: width 0.3s;"></div>
                    </div>
                </div>

                <!-- Last Month -->
                <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem; font-weight: 600;">${t('ct.extension.timetracker.dashboard.stats.lastMonth')}</div>
                    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
                        <div>
                            <div style="color: #999; font-size: 0.75rem;">IST</div>
                            <div style="font-size: 1.5rem; font-weight: 700; color: ${dashStats.lastMonth.ist >= dashStats.lastMonth.soll ? '#28a745' : '#dc3545'};">
                                ${formatDecimalHours(dashStats.lastMonth.ist)}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="color: #999; font-size: 0.75rem;">SOLL</div>
                            <div style="font-size: 1.5rem; font-weight: 700; color: #6c757d;">
                                ${formatDecimalHours(dashStats.lastMonth.soll)}
                            </div>
                        </div>
                    </div>
                    <div style="height: 4px; background: #e9ecef; border-radius: 2px; overflow: hidden;">
                        <div style="height: 100%; background: ${dashStats.lastMonth.ist >= dashStats.lastMonth.soll ? '#28a745' : '#dc3545'}; width: ${Math.min(100, (dashStats.lastMonth.ist / dashStats.lastMonth.soll) * 100)}%; transition: width 0.3s;"></div>
                    </div>
                </div>
            </div>
            `;
            })()}

            <!-- Recent Entries -->
            <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="margin: 0; font-size: 1.2rem; color: #333;">${t('ct.extension.timetracker.dashboard.recentEntries')}</h2>
                ${renderEntriesList(getFilteredEntries().slice(0, 5))}
                <div style="margin-top: 1rem; text-align: center;">
                    <button id="view-all-entries-btn" style="background: none; border: none; color: #007bff; cursor: pointer; font-size: 0.9rem; font-weight: 500;">
                        ${t('ct.extension.timetracker.dashboard.viewAllEntries')} &rarr;
                    </button>
                </div>
            </div>
        `;
    }

    function renderBulkEntryForm(): string {
        if (!showBulkEntry) return '';

        return `
            <!-- Bulk Entry Form -->
            <div style="background: #e7e3ff; border: 2px solid #6f42c1; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h1 style="margin: 0; font-size: 1.5rem; color: #333; display: flex; align-items: center; gap: 0.75rem;">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                ${t('ct.extension.timetracker.common.timeTracker')}
            </h1>rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                            <line x1="12" y1="11" x2="12" y2="17"></line>
                            <line x1="9" y1="14" x2="15" y2="14"></line>
                        </svg>
                        Bulk Add Time Entries
                    </h3>
                    <button id="close-bulk-entry-btn" style="padding: 0.25rem 0.5rem; background: #6c757d; color: white; border: none; border-radius: 3px; cursor: pointer;">✕ Close</button>
                </div>

                <div style="overflow-x: auto; margin-bottom: 1rem;">
                    <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 4px; overflow: hidden;">
                        <thead>
                            <tr style="background: #6f42c1; color: white;">
                                <th style="padding: 0.75rem; text-align: left; font-weight: 600;">Start Date</th>
                                <th style="padding: 0.75rem; text-align: left; font-weight: 600;">Start Time</th>
                                <th style="padding: 0.75rem; text-align: left; font-weight: 600;">End Date</th>
                                <th style="padding: 0.75rem; text-align: left; font-weight: 600;">End Time</th>
                                <th style="padding: 0.75rem; text-align: left; font-weight: 600;">Category</th>
                                <th style="padding: 0.75rem; text-align: left; font-weight: 600;">Description</th>
                                <th style="padding: 0.75rem; text-align: center; font-weight: 600;">Break?</th>
                                <th style="padding: 0.75rem; text-align: center; font-weight: 600;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${bulkEntryRows.length === 0 ? `
                                <tr>
                                    <td colspan="8" style="padding: 2rem; text-align: center; color: #666;">
                                        No entries yet. Click "Add Row" to start.
                                    </td>
                                </tr>
                            ` : bulkEntryRows.map(row => `
                                <tr style="border-bottom: 1px solid #dee2e6;" data-row-id="${row.id}">
                                    <td style="padding: 0.5rem;">
                                        <input
                                            type="date"
                                            class="bulk-input"
                                            data-row-id="${row.id}"
                                            data-field="startDate"
                                            value="${row.startDate}"
                                            style="width: 100%; padding: 0.375rem; border: 1px solid #ddd; border-radius: 3px;"
                                        />
                                    </td>
                                    <td style="padding: 0.5rem;">
                                        <input
                                            type="time"
                                            class="bulk-input"
                                            data-row-id="${row.id}"
                                            data-field="startTime"
                                            value="${row.startTime}"
                                            style="width: 100%; padding: 0.375rem; border: 1px solid #ddd; border-radius: 3px;"
                                        />
                                    </td>
                                    <td style="padding: 0.5rem;">
                                        <input
                                            type="date"
                                            class="bulk-input"
                                            data-row-id="${row.id}"
                                            data-field="endDate"
                                            value="${row.endDate}"
                                            style="width: 100%; padding: 0.375rem; border: 1px solid #ddd; border-radius: 3px;"
                                        />
                                    </td>
                                    <td style="padding: 0.5rem;">
                                        <input
                                            type="time"
                                            class="bulk-input"
                                            data-row-id="${row.id}"
                                            data-field="endTime"
                                            value="${row.endTime}"
                                            style="width: 100%; padding: 0.375rem; border: 1px solid #ddd; border-radius: 3px;"
                                        />
                                    </td>
                                    <td style="padding: 0.5rem;">
                                        <select
                                            class="bulk-input"
                                            data-row-id="${row.id}"
                                            data-field="categoryId"
                                            style="width: 100%; padding: 0.375rem; border: 1px solid #ddd; border-radius: 3px;"
                                        >
                                            ${workCategories.map(cat => `
                                                <option value="${cat.id}" ${row.categoryId === cat.id ? 'selected' : ''}>${cat.name}</option>
                                            `).join('')}
                                        </select>
                                    </td>
                                    <td style="padding: 0.5rem;">
                                        <input
                                            type="text"
                                            class="bulk-input"
                                            data-row-id="${row.id}"
                                            data-field="description"
                                            value="${row.description}"
                                            placeholder="Description..."
                                            style="width: 100%; padding: 0.375rem; border: 1px solid #ddd; border-radius: 3px;"
                                        />
                                    </td>
                                    <td style="padding: 0.5rem; text-align: center;">
                                        <input
                                            type="checkbox"
                                            class="bulk-input-checkbox"
                                            data-row-id="${row.id}"
                                            data-field="isBreak"
                                            ${row.isBreak ? 'checked' : ''}
                                            style="width: 18px; height: 18px; cursor: pointer;"
                                        />
                                    </td>
                                    <td style="padding: 0.5rem; text-align: center;">
                                        <button
                                            class="remove-bulk-row-btn"
                                            data-row-id="${row.id}"
                                            style="padding: 0.25rem 0.5rem; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 0.85rem;"
                                            title="Remove"
                                        ><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                            </svg></button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- Excel Import/Export (Alpha Feature) -->
                ${settings.excelImportEnabled ? `
                <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 1rem; margin-bottom: 1rem;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#856404" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                        <strong style="color: #856404;">Excel Import/Export</strong>
                        <span style="background: #ff9800; color: white; padding: 0.125rem 0.5rem; border-radius: 3px; font-size: 0.75rem; margin-left: 0.5rem; font-weight: 700;">ALPHA</span>
                    </div>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
                        <button id="download-excel-template-btn" style="padding: 0.5rem 1rem; background: #17a2b8; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            Download Template
                        </button>
                        <input type="file" id="import-excel-input" accept=".xlsx,.xls" style="display: none;" />
                        <button id="import-excel-btn" style="padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="17 8 12 3 7 8"></polyline>
                                <line x1="12" y1="3" x2="12" y2="15"></line>
                            </svg>
                            Import from Excel
                        </button>
                        <span style="color: #856404; font-size: 0.85rem; font-style: italic;">Import will replace existing entries in the table</span>
                    </div>
                </div>
                ` : ''}

                <div style="display: flex; gap: 0.5rem; justify-content: space-between; flex-wrap: wrap;">
                    <button id="add-bulk-row-btn" style="padding: 0.5rem 1rem; background: #6f42c1; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Add Row
                    </button>
                    <div style="display: flex; gap: 0.5rem;">
                        <button id="save-bulk-entries-btn" ${bulkEntryRows.length === 0 ? 'disabled' : ''} style="padding: 0.5rem 1.5rem; background: ${bulkEntryRows.length === 0 ? '#6c757d' : '#28a745'}; color: white; border: none; border-radius: 4px; cursor: ${bulkEntryRows.length === 0 ? 'not-allowed' : 'pointer'}; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                <polyline points="7 3 7 8 15 8"></polyline>
                            </svg>
                            Save All Entries (${bulkEntryRows.length})
                        </button>
                    </div>
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
                        <label for="filter-date-from" style="display: block; margin-bottom: 0.25rem; color: #666; font-size: 0.85rem;">${t('ct.extension.timetracker.reports.from')}</label>
                        <input
                            type="date"
                            id="filter-date-from"
                            name="filter-from"
                            value="${filterDateFrom}"
                            style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;"
                        />
                    </div>
                    <div>
                        <label for="filter-date-to" style="display: block; margin-bottom: 0.25rem; color: #666; font-size: 0.85rem;">${t('ct.extension.timetracker.reports.to')}</label>
                        <input
                            type="date"
                            id="filter-date-to"
                            name="filter-to"
                            value="${filterDateTo}"
                            style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;"
                        />
                    </div>
                    <div>
                        <label for="filter-category" style="display: block; margin-bottom: 0.25rem; color: #666; font-size: 0.85rem;">${t('ct.extension.timetracker.dashboard.category')}</label>
                        <select id="filter-category" name="filter-category" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="all">${t('ct.extension.timetracker.common.allCategories')}</option>
                            ${workCategories.map((cat) => `<option value="${cat.id}" ${filterCategory === cat.id ? 'selected' : ''}>${cat.name}</option>`).join('')}
                        </select>
                    </div>
                    <div style="flex: 1;">
                        <label for="filter-search" style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #555;">${t('ct.extension.timetracker.timeEntries.searchDescription')}</label>
                        <input 
                            type="text" 
                            id="filter-search" 
                            placeholder="${t('ct.extension.timetracker.timeEntries.searchPlaceholder')}" 
                            value="${filterSearch}"
                            style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;"
                        />
                    </div>
                </div>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    <button id="apply-filters-btn" style="padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">${t('ct.extension.timetracker.common.applyFilter')}</button>
                    <button id="export-csv-btn" style="padding: 0.5rem 1rem; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        ${t('ct.extension.timetracker.reports.exportCSV')}
                    </button>
                    <button id="add-manual-entry-btn" style="padding: 0.5rem 1rem; background: #ffc107; color: #333; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        ${t('ct.extension.timetracker.timeEntries.addManualEntryTitle')}
                    </button>
                    <button id="bulk-add-entries-btn" style="padding: 0.5rem 1rem; background: #6f42c1; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                            <line x1="12" y1="11" x2="12" y2="17"></line>
                            <line x1="9" y1="14" x2="15" y2="14"></line>
                        </svg>
                        ${t('ct.extension.timetracker.timeEntries.bulkAddEntries')}
                    </button>
                </div>
            </div>

            ${renderBulkEntryForm()}

            ${showAddManualEntry || editingEntry
                ? `
                <!-- Add/Edit Manual Entry Form -->
                <div style="background: ${editingEntry ? '#d1ecf1' : '#fff3cd'}; border: 1px solid ${editingEntry ? '#17a2b8' : '#ffc107'}; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
                    <h3 style="margin: 0 0 1rem 0; color: #333; display: flex; align-items: center; gap: 0.5rem;">
                    ${editingEntry ? `
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        ${t('ct.extension.timetracker.common.edit')}
                    ` : `
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        ${t('ct.extension.timetracker.timeEntries.addManualEntryTitle')}
                    `}
                </h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                        <div>
                            <label for="manual-start" style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 500;">Start Date & Time</label>
                            <input
                                type="datetime-local"
                                id="manual-start"
                                name="start-time"
                                value="${editingEntry ? editingEntry.startTime.slice(0, 16) : ''}"
                                autocomplete="off"
                                data-lpignore="true"
                                data-1p-ignore="true"
                                style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;"
                            />
                        </div>
                        <div>
                            <label for="manual-end" style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 500;">End Date & Time</label>
                            <input
                                type="datetime-local"
                                id="manual-end"
                                name="end-time"
                                value="${editingEntry && editingEntry.endTime ? editingEntry.endTime.slice(0, 16) : ''}"
                                autocomplete="off"
                                data-lpignore="true"
                                data-1p-ignore="true"
                                style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;"
                            />
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 1rem; margin-bottom: 1rem;">
                        <div>
                            <label for="manual-category" style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 500;">Category</label>
                            <select
                                id="manual-category"
                                name="manual-category"
                                style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;"
                            >
                                ${workCategories.map((cat) => `<option value="${cat.id}" ${editingEntry && editingEntry.categoryId === cat.id ? 'selected' : ''}>${cat.name}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label for="manual-description" style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 500;">Description</label>
                            <input
                                type="text"
                                id="manual-description"
                                name="manual-description"
                                value="${editingEntry ? editingEntry.description : ''}"
                                autocomplete="off"
                                data-lpignore="true"
                                data-1p-ignore="true"
                                placeholder="What did you work on?"
                                style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;"
                            />
                        </div>
                    </div>
                    <label style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; cursor: pointer; text-align: left;">
                        <input type="checkbox" id="manual-is-break" ${editingEntry && editingEntry.isBreak ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;" />
                        <span style="color: #666; font-size: 0.95rem;">This is a break/pause (won't count towards work hours)</span>
                    </label>
                    <div style="display: flex; gap: 0.5rem;">
                        <button id="save-manual-entry-btn" style="padding: 0.5rem 1rem; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                <polyline points="7 3 7 8 15 8"></polyline>
                            </svg>
                            ${editingEntry ? 'Update Entry' : 'Save Entry'}
                        </button>
                        <button id="cancel-manual-entry-btn" style="padding: 0.5rem 1rem; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
                    </div>
                </div>
            `
                : ''
            }

            <!-- Entries List -->
            <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h2 style="margin: 0; font-size: 1.2rem; color: #333;">Time Entries (${getFilteredEntries().length})</h2>
                    ${getFilteredEntries().length > ENTRIES_PER_PAGE ? `
                        <div style="display: flex; gap: 0.5rem; align-items: center;">
                            <span style="color: #666; font-size: 0.9rem;">Page ${entriesPage} of ${Math.ceil(getFilteredEntries().length / ENTRIES_PER_PAGE)}</span>
                            <button id="entries-prev-page" ${entriesPage === 1 ? 'disabled' : ''} style="padding: 0.25rem 0.5rem; background: ${entriesPage === 1 ? '#e9ecef' : '#007bff'}; color: ${entriesPage === 1 ? '#6c757d' : 'white'}; border: none; border-radius: 3px; cursor: ${entriesPage === 1 ? 'not-allowed' : 'pointer'};">‹ Prev</button>
                            <button id="entries-next-page" ${entriesPage >= Math.ceil(getFilteredEntries().length / ENTRIES_PER_PAGE) ? 'disabled' : ''} style="padding: 0.25rem 0.5rem; background: ${entriesPage >= Math.ceil(getFilteredEntries().length / ENTRIES_PER_PAGE) ? '#e9ecef' : '#007bff'}; color: ${entriesPage >= Math.ceil(getFilteredEntries().length / ENTRIES_PER_PAGE) ? '#6c757d' : 'white'}; border: none; border-radius: 3px; cursor: ${entriesPage >= Math.ceil(getFilteredEntries().length / ENTRIES_PER_PAGE) ? 'not-allowed' : 'pointer'};">Next ›</button>
                        </div>
                    ` : ''}
                </div>
                ${renderEntriesList(getFilteredEntries())}
            </div>
        `;
    }

    function renderEntriesList(entries: TimeEntry[]): string {
        if (entries.length === 0) {
            return `<p style="color: #666; text-align: center; padding: 2rem;">${t('ct.extension.timetracker.timeEntries.noEntries')}</p>`;
        }

        // Get user-specific hours
        const userHours = getUserHours();

        // Group entries by calendar week, then by day
        type WeekGroup = {
            weekNumber: number;
            year: number;
            days: Map<string, TimeEntry[]>; // key: YYYY-MM-DD
        };

        const weekGroups = new Map<string, WeekGroup>(); // key: "YYYY-WW"

        entries.forEach(entry => {
            const date = new Date(entry.startTime);
            const weekNum = getISOWeek(date);
            const yearNum = getISOWeekYear(date);
            const weekKey = `${yearNum}-${String(weekNum).padStart(2, '0')}`;
            const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

            if (!weekGroups.has(weekKey)) {
                weekGroups.set(weekKey, {
                    weekNumber: weekNum,
                    year: yearNum,
                    days: new Map()
                });
            }

            const week = weekGroups.get(weekKey)!;
            if (!week.days.has(dayKey)) {
                week.days.set(dayKey, []);
            }
            week.days.get(dayKey)!.push(entry);
        });

        // Convert to array and sort by week (newest first)
        const sortedWeeks = Array.from(weekGroups.entries())
            .sort((a, b) => b[0].localeCompare(a[0]));

        let html = '<div style="display: flex; flex-direction: column; gap: 1.5rem;">';

        for (const [, week] of sortedWeeks) { // weekKey unused, use _ or omit
            // Calculate week totals
            const weekWorkEntries = Array.from(week.days.values())
                .flat()
                .filter(e => !e.isBreak && e.endTime);
            const weekIstMs = weekWorkEntries.reduce((sum, e) => {
                const start = new Date(e.startTime).getTime();
                const end = new Date(e.endTime!).getTime();
                return sum + (end - start);
            }, 0);
            const weekIst = formatHours(weekIstMs);
            const weekSoll = formatHours(userHours.hoursPerWeek * 3600000); // Convert hours to ms

            html += `
                <div style="background: #f8f9fa; border: 2px solid #dee2e6; border-radius: 8px; padding: 1rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h3 style="margin: 0; color: #333; font-size: 1.1rem;">
                            ${t('ct.extension.timetracker.dashboard.calendarWeek')} ${week.weekNumber} (${week.year})
                        </h3>
                        <div style="display: flex; gap: 1rem; font-size: 0.9rem;">
                            <span style="color: #666;">
                                <strong>${t('ct.extension.timetracker.dashboard.weekActual')}:</strong> <span style="color: ${weekIstMs >= userHours.hoursPerWeek * 3600000 ? '#28a745' : '#dc3545'}; font-weight: 600;">${weekIst}</span>
                            </span>
                            <span style="color: #666;">
                                <strong>${t('ct.extension.timetracker.dashboard.weekTarget')}:</strong> <span style="font-weight: 600;">${weekSoll}</span>
                            </span>
                        </div>
                    </div>`;

            // Sort days (newest first)
            const sortedDays = Array.from(week.days.entries())
                .sort((a, b) => b[0].localeCompare(a[0]));

            for (const [dayKey, dayEntries] of sortedDays) {
                const date = new Date(dayKey);
                const dayName = date.toLocaleDateString('de-DE', { weekday: 'long' });
                const dateStr = date.toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });

                // Calculate day totals (excluding breaks)
                const dayWorkEntries = dayEntries.filter(e => !e.isBreak && e.endTime);
                const dayIstMs = dayWorkEntries.reduce((sum, e) => {
                    const start = new Date(e.startTime).getTime();
                    const end = new Date(e.endTime!).getTime();
                    return sum + (end - start);
                }, 0);
                const dayIst = formatHours(dayIstMs);

                // Determine day SOLL (based on configured work week days)
                const isWorkday = isWorkDay(date);
                const daySoll = isWorkday ? formatHours(userHours.hoursPerDay * 3600000) : '0h';

                html += `
                    <div style="background: white; border: 1px solid #dee2e6; border-radius: 6px; padding: 0.75rem; margin-bottom: 0.75rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid #e9ecef;">
                            <h4 style="margin: 0; color: #495057; font-size: 0.95rem; font-weight: 600;">
                                ${dayName}, ${dateStr}
                            </h4>
                            <div style="display: flex; gap: 1rem; font-size: 0.85rem;">
                                <span style="color: #666;">
                                    <strong>${t('ct.extension.timetracker.dashboard.dayActual')}:</strong> <span style="color: ${dayIstMs >= userHours.hoursPerDay * 3600000 ? '#28a745' : (isWorkday ? '#dc3545' : '#6c757d')}; font-weight: 600;">${dayIst}</span>
                                </span>
                                <span style="color: #666;">
                                    <strong>${t('ct.extension.timetracker.dashboard.dayTarget')}:</strong> <span style="font-weight: 600;">${daySoll}</span>
                                </span>
                            </div>
                        </div>
                        <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                            <thead>
                                <tr style="background: #f8f9fa; border-bottom: 1px solid #dee2e6;">
                                    <th style="padding: 0.5rem; text-align: left; font-weight: 600; color: #495057; font-size: 0.85rem;">${t('ct.extension.timetracker.timeEntries.startTime')}</th>
                                    <th style="padding: 0.5rem; text-align: left; font-weight: 600; color: #495057; font-size: 0.85rem;">${t('ct.extension.timetracker.timeEntries.endTime')}</th>
                                    <th style="padding: 0.5rem; text-align: left; font-weight: 600; color: #495057; font-size: 0.85rem;">${t('ct.extension.timetracker.timeEntries.duration')}</th>
                                    <th style="padding: 0.5rem; text-align: left; font-weight: 600; color: #495057; font-size: 0.85rem;">${t('ct.extension.timetracker.dashboard.category')}</th>
                                    <th style="padding: 0.5rem; text-align: left; font-weight: 600; color: #495057; font-size: 0.85rem;">${t('ct.extension.timetracker.dashboard.description')}</th>
                                    <th style="padding: 0.5rem; text-align: left; font-weight: 600; color: #495057; font-size: 0.85rem;">${t('ct.extension.timetracker.timeEntries.type')}</th>
                                    <th style="padding: 0.5rem; text-align: center; font-weight: 600; color: #495057; font-size: 0.85rem;">${t('ct.extension.timetracker.timeEntries.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${dayEntries.map(entry => {
                    const start = new Date(entry.startTime);
                    const end = entry.endTime ? new Date(entry.endTime) : new Date();
                    const duration = formatDuration(end.getTime() - start.getTime());
                    const category = workCategories.find((c) => c.id === entry.categoryId);

                    return `
                                        <tr style="border-bottom: 1px solid #e9ecef;">
                                            <td style="padding: 0.5rem;">${start.toLocaleTimeString()}</td>
                                            <td style="padding: 0.5rem;">${entry.endTime ? end.toLocaleTimeString() : '<span style="color: #28a745; font-weight: 600;">Active</span>'}</td>
                                            <td style="padding: 0.5rem; font-weight: 600;">${duration}</td>
                                            <td style="padding: 0.5rem;">
                                                <span style="background: ${category?.color || '#6c757d'}; color: white; padding: 0.2rem 0.4rem; border-radius: 3px; font-size: 0.8rem;">
                                                    ${entry.categoryName}
                                                </span>
                                            </td>
                                            <td style="padding: 0.5rem; font-size: 0.85rem;">${entry.description || '-'}</td>
                                            <td style="padding: 0.5rem;">
                                                <div style="display: flex; flex-direction: column; gap: 0.15rem;">
                                                    <span style="color: ${entry.isManual ? '#ffc107' : '#6c757d'}; font-size: 0.75rem;">
                                                        <span style="display: inline-flex; align-items: center; gap: 0.2rem;">
                                                            ${entry.isManual ? `
                                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                                </svg>
                                                                ${t('ct.extension.timetracker.timeEntries.manual')}
                                                            ` : `
                                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                                    <circle cx="12" cy="12" r="10"></circle>
                                                                    <polyline points="12 6 12 12 16 14"></polyline>
                                                                </svg>
                                                                ${t('ct.extension.timetracker.timeEntries.clockedIn')}
                                                            `}
                                                        </span>
                                                    </span>
                                                    ${entry.isBreak ? `
                                                        <span style="background: #e7f5f7; color: #17a2b8; padding: 0.15rem 0.4rem; border-radius: 3px; font-size: 0.75rem; font-weight: 600; border: 1px solid #b8dfe4;">
                                                            <span style="display: inline-flex; align-items: center; gap: 0.25rem;">
                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                                                    <rect x="6" y="4" width="4" height="16" rx="1"></rect>
                                                                    <rect x="14" y="4" width="4" height="16" rx="1"></rect>
                                                                </svg>
                                                                ${t('ct.extension.timetracker.timeEntries.break')}
                                                            </span>
                                                        </span>
                                                    ` : ''}
                                                </div>
                                            </td>
                                            <td style="padding: 0.5rem; text-align: center;">
                                                ${entry.endTime ? `
                                                    <div style="display: flex; gap: 0.2rem; justify-content: center;">
                                                        <button
                                                            class="edit-entry-btn"
                                                            data-entry-start="${entry.startTime}"
                                                            style="padding: 0.2rem 0.4rem; background: #ffc107; color: #333; border: none; border-radius: 3px; cursor: pointer; font-size: 0.75rem;"
                                                            title="${t('ct.extension.timetracker.common.edit')}"
                                                        ><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                        </svg></button>
                                                        <button
                                                            class="delete-entry-btn"
                                                            data-entry-start="${entry.startTime}"
                                                            style="padding: 0.2rem 0.4rem; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 0.75rem;"
                                                            title="${t('ct.extension.timetracker.common.delete')}"
                                                        ><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                            <polyline points="3 6 5 6 21 6"></polyline>
                                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                        </svg></button>
                                                    </div>
                                                ` : '<span style="color: #999; font-size: 0.75rem;">-</span>'}
                                            </td>
                                        </tr>
                                    `;
                }).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            }

            html += `</div>`; // Close week group
        }

        html += '</div>'; // Close main container
        return html;
    }

    function renderAbsences(): string {
        return `
            ${showAddAbsence || editingAbsence
                ? `
            <!-- Add/Edit Absence Form -->
            <div style="background: ${editingAbsence ? '#d1ecf1' : '#d4edda'}; border: 1px solid ${editingAbsence ? '#17a2b8' : '#28a745'}; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
                <h3 style="margin: 0 0 1rem 0; color: #333; display: flex; align-items: center; gap: 0.5rem;">
                    ${editingAbsence ? `
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        ${t('ct.extension.timetracker.absences.editAbsence')}
                    ` : `
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        ${t('ct.extension.timetracker.absences.addAbsence')}
                    `}
                </h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div>
                        <label for="absence-start-date" style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 500;">${t('ct.extension.timetracker.absences.startDate')}</label>
                        <input
                            type="date"
                            id="absence-start-date"
                            value="${editingAbsence ? editingAbsence.startDate : ''}"
                            style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;"
                        />
                    </div>
                    <div>
                        <label for="absence-end-date" style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 500;">${t('ct.extension.timetracker.absences.endDate')}</label>
                        <input
                            type="date"
                            id="absence-end-date"
                            value="${editingAbsence ? editingAbsence.endDate : ''}"
                            style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;"
                        />
                    </div>
                </div>
                <div style="margin-bottom: 1rem;">
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                        <input
                            type="checkbox"
                            id="absence-all-day"
                            ${!editingAbsence || !editingAbsence.startTime ? 'checked' : ''}
                            style="cursor: pointer;"
                        />
                        <span style="color: #333; font-weight: 500;">${t('ct.extension.timetracker.absences.allDay')}</span>
                    </label>
                </div>
                <div id="absence-time-fields" style="display: ${!editingAbsence || !editingAbsence.startTime ? 'none' : 'grid'}; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div>
                        <label for="absence-start-time" style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 500;">${t('ct.extension.timetracker.absences.startTime')}</label>
                        <input
                            type="time"
                            id="absence-start-time"
                            value="${editingAbsence && editingAbsence.startTime ? new Date(editingAbsence.startTime).toTimeString().slice(0, 5) : ''}"
                            style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;"
                        />
                    </div>
                    <div>
                        <label for="absence-end-time" style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 500;">${t('ct.extension.timetracker.absences.endTime')}</label>
                        <input
                            type="time"
                            id="absence-end-time"
                            value="${editingAbsence && editingAbsence.endTime ? new Date(editingAbsence.endTime).toTimeString().slice(0, 5) : ''}"
                            style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;"
                        />
                    </div>
                </div>
                <div style="margin-bottom: 1rem;">
                    <label for="absence-reason" style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 500;">${t('ct.extension.timetracker.absences.reason')}</label>
                    <select
                        id="absence-reason"
                        style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;"
                        ${absenceReasons.length === 0 ? 'disabled' : ''}
                    >
                        ${absenceReasons.length === 0 ?
                    '<option value="">No reasons available - check admin settings</option>' :
                    (editingAbsence ? '' : `<option value="">-- ${t('ct.extension.timetracker.absences.selectReason')} --</option>`) +
                    absenceReasons.map(reason => `
                                <option value="${reason.id}" ${editingAbsence && editingAbsence.absenceReason.id === reason.id ? 'selected' : ''}>${reason.nameTranslated || reason.name}</option>
                            `).join('')
                }
                    </select>
                </div>
                <div style="margin-bottom: 1rem;">
                    <label for="absence-comment" style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 500;">${t('ct.extension.timetracker.absences.comment')}</label>
                    <textarea
                        id="absence-comment"
                        rows="3"
                        placeholder="Add additional details..."
                        style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; resize: vertical;"
                    >${editingAbsence ? editingAbsence.comment || '' : ''}</textarea>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button id="save-absence-btn" style="padding: 0.5rem 1rem; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                            <polyline points="17 21 17 13 7 13 7 21"></polyline>
                            <polyline points="7 3 7 8 15 8"></polyline>
                        </svg>
                        ${editingAbsence ? t('ct.extension.timetracker.common.save') : t('ct.extension.timetracker.common.add')}
                    </button>
                    <button id="cancel-absence-btn" style="padding: 0.5rem 1rem; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">${t('ct.extension.timetracker.common.cancel')}</button>
                </div>
            </div>
            `
                : ''
            }

            <!-- Absences List -->
            <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h2 style="margin: 0; font-size: 1.2rem; color: #333;">${t('ct.extension.timetracker.absences.title')} (${absences.length})</h2>
                    <button id="add-absence-btn" style="padding: 0.5rem 1rem; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        ${t('ct.extension.timetracker.absences.addAbsence')}
                    </button>
                </div>
                ${absences.length === 0 ? `<p style="color: #666; text-align: center; padding: 2rem;">${t('ct.extension.timetracker.absences.noAbsences')}</p>` : `
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                                <th style="padding: 0.75rem; text-align: left; font-weight: 600; color: #495057;">${t('ct.extension.timetracker.reports.from')}</th>
                                <th style="padding: 0.75rem; text-align: left; font-weight: 600; color: #495057;">${t('ct.extension.timetracker.reports.to')}</th>
                                <th style="padding: 0.75rem; text-align: left; font-weight: 600; color: #495057;">${t('ct.extension.timetracker.absences.reason')}</th>
                                <th style="padding: 0.75rem; text-align: left; font-weight: 600; color: #495057;">${t('ct.extension.timetracker.absences.comment')}</th>
                                <th style="padding: 0.75rem; text-align: left; font-weight: 600; color: #495057;">${t('ct.extension.timetracker.timeEntries.type')}</th>
                                <th style="padding: 0.75rem; text-align: left; font-weight: 600; color: #495057;">${t('ct.extension.timetracker.timeEntries.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${absences.map(absence => {
                const isAllDay = absence.startTime === null || absence.endTime === null;
                const start = new Date(absence.startDate);
                const end = new Date(absence.endDate);
                return `
                                <tr style="border-bottom: 1px solid #dee2e6;">
                                    <td style="padding: 0.75rem;">${start.toLocaleDateString()}${!isAllDay ? ' ' + new Date(absence.startTime!).toLocaleTimeString() : ''}</td>
                                    <td style="padding: 0.75rem;">${end.toLocaleDateString()}${!isAllDay ? ' ' + new Date(absence.endTime!).toLocaleTimeString() : ''}</td>
                                    <td style="padding: 0.75rem;">
                                        <span style="background: #ffc107; color: #333; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.85rem;">
                                            ${absence.absenceReason?.nameTranslated || absence.absenceReason?.name || 'Unknown'}
                                        </span>
                                    </td>
                                    <td style="padding: 0.75rem;">${absence.comment || '-'}</td>
                                    <td style="padding: 0.75rem;">${isAllDay ? t('ct.extension.timetracker.absences.allDay') : 'Timed'}</td>
                                    <td style="padding: 0.75rem;">
                                        <div style="display: flex; gap: 0.25rem;">
                                            <button
                                                class="edit-absence-btn"
                                                data-absence-id="${absence.id}"
                                                style="padding: 0.25rem 0.5rem; background: #ffc107; color: #333; border: none; border-radius: 3px; cursor: pointer; font-size: 0.85rem;"
                                                title="Edit"
                                            ><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                            </svg></button>
                                            <button
                                                class="delete-absence-btn"
                                                data-absence-id="${absence.id}"
                                                style="padding: 0.25rem 0.5rem; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 0.85rem;"
                                                title="Delete"
                                            ><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                            </svg></button>
                                        </div>
                                    </td>
                                </tr>
                            `}).join('')}
                        </tbody>
                    </table>
                </div>
                `}
            </div>
        `;
    }

    function renderReports(): string {
        const stats = calculateStats();
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
            <!-- Period Quick Select -->
            <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="margin: 0 0 1rem 0; font-size: 1.2rem; color: #333;">${t('ct.extension.timetracker.reports.period')}</h2>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    <button id="report-period-week" style="padding: 0.75rem 1.5rem; border: ${reportPeriod === 'week' ? '2px' : '1px'} solid ${reportPeriod === 'week' ? '#007bff' : '#ddd'}; background: ${reportPeriod === 'week' ? '#e7f3ff' : '#fff'}; color: ${reportPeriod === 'week' ? '#007bff' : '#666'}; border-radius: 4px; cursor: pointer; font-weight: ${reportPeriod === 'week' ? '600' : '400'};">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        ${t('ct.extension.timetracker.reports.periodSelect.thisWeek')}
                    </button>
                    <button id="report-period-month" style="padding: 0.75rem 1.5rem; border: ${reportPeriod === 'month' ? '2px' : '1px'} solid ${reportPeriod === 'month' ? '#007bff' : '#ddd'}; background: ${reportPeriod === 'month' ? '#e7f3ff' : '#fff'}; color: ${reportPeriod === 'month' ? '#007bff' : '#666'}; border-radius: 4px; cursor: pointer; font-weight: ${reportPeriod === 'month' ? '600' : '400'};">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                            <line x1="8" y1="14" x2="8" y2="14"></line>
                            <line x1="12" y1="14" x2="12" y2="14"></line>
                            <line x1="16" y1="14" x2="16" y2="14"></line>
                            <line x1="8" y1="18" x2="8" y2="18"></line>
                            <line x1="12" y1="18" x2="12" y2="18"></line>
                            <line x1="16" y1="18" x2="16" y2="18"></line>
                        </svg>
                        ${t('ct.extension.timetracker.reports.periodSelect.thisMonth')}
                    </button>
                    <button id="report-period-year" style="padding: 0.75rem 1.5rem; border: ${reportPeriod === 'year' ? '2px' : '1px'} solid ${reportPeriod === 'year' ? '#007bff' : '#ddd'}; background: ${reportPeriod === 'year' ? '#e7f3ff' : '#fff'}; color: ${reportPeriod === 'year' ? '#007bff' : '#666'}; border-radius: 4px; cursor: pointer; font-weight: ${reportPeriod === 'year' ? '600' : '400'};">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;">
                            <line x1="12" y1="20" x2="12" y2="10"></line>
                            <line x1="18" y1="20" x2="18" y2="4"></line>
                            <line x1="6" y1="20" x2="6" y2="16"></line>
                        </svg>
                        ${t('ct.extension.timetracker.reports.periodSelect.thisYear')}
                    </button>
                    <button id="report-period-custom" style="padding: 0.75rem 1.5rem; border: ${reportPeriod === 'custom' ? '2px' : '1px'} solid ${reportPeriod === 'custom' ? '#007bff' : '#ddd'}; background: ${reportPeriod === 'custom' ? '#e7f3ff' : '#fff'}; color: ${reportPeriod === 'custom' ? '#007bff' : '#666'}; border-radius: 4px; cursor: pointer; font-weight: ${reportPeriod === 'custom' ? '600' : '400'};">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M12 1v6m0 6v6m9-9h-6M8 12H2m15.36-6.36l-4.24 4.24m0 4.24l4.24 4.24M6.64 17.64l4.24-4.24m0-4.24L6.64 6.64"></path>
                        </svg>
                        ${t('ct.extension.timetracker.reports.periodSelect.custom')}
                    </button>
                </div>
            </div>

            <!-- Custom Period Selection -->
            ${reportPeriod === 'custom' ? `
            <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="margin: 0 0 1rem 0; font-size: 1.2rem; color: #333;">${t('ct.extension.timetracker.reports.periodSelect.custom')}</h2>
                <div style="display: grid; grid-template-columns: 1fr 1fr auto; gap: 1rem; align-items: end;">
                    <div>
                        <label for="report-date-from" style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 500;">${t('ct.extension.timetracker.reports.from')}</label>
                        <input
                            type="date"
                            id="report-date-from"
                            name="report-from"
                            value="${filterDateFrom}"
                            style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;"
                        />
                    </div>
                    <div>
                        <label for="report-date-to" style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 500;">${t('ct.extension.timetracker.reports.to')}</label>
                        <input
                            type="date"
                            id="report-date-to"
                            name="report-to"
                            value="${filterDateTo}"
                            style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;"
                        />
                    </div>
                    <button id="apply-report-filters-btn" style="padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">${t('ct.extension.timetracker.common.refresh')}</button>
                </div>
            </div>
            ` : ''}

            <!-- Summary Stats -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">${t('ct.extension.timetracker.reports.totalWorked')}</div>
                    <div style="font-size: 2.5rem; font-weight: 700; color: #007bff;">${stats.totalHours}h</div>
                    <div style="color: #999; font-size: 0.85rem; margin-top: 0.5rem;">${stats.entriesCount} ${t('ct.extension.timetracker.dashboard.stats.entries')}</div>
                </div>
                <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">${t('ct.extension.timetracker.absences.title')}</div>
                    <div style="font-size: 2.5rem; font-weight: 700; color: #ffc107;">${stats.absenceHours}h</div>
                    <div style="color: #999; font-size: 0.85rem; margin-top: 0.5rem;">${stats.absenceDays} ${t('ct.extension.timetracker.dashboard.stats.daysOff')}</div>
                </div>
                <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">${t('ct.extension.timetracker.reports.targetHours')}</div>
                    <div style="font-size: 2.5rem; font-weight: 700; color: #6c757d;">${stats.expectedHours}h</div>
                    <div style="color: #999; font-size: 0.85rem; margin-top: 0.5rem;">${t('ct.extension.timetracker.reports.adjustedForAbsences')}</div>
                </div>
                <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">${t('ct.extension.timetracker.reports.overtime')} / ${t('ct.extension.timetracker.reports.undertime')}</div>
                    <div style="font-size: 2.5rem; font-weight: 700; color: ${parseFloat(stats.overtime) >= 0 ? '#28a745' : '#dc3545'};">
                        ${parseFloat(stats.overtime) >= 0 ? '+' : ''}${stats.overtime}h
                    </div>
                    <div style="color: #999; font-size: 0.85rem; margin-top: 0.5rem;">
                        ${parseFloat(stats.overtime) >= 0 ? t('ct.extension.timetracker.reports.extraHours') : t('ct.extension.timetracker.reports.hoursUnderTarget')}
                    </div>
                </div>
            </div>

            <!-- IST vs SOLL Comparison -->
            <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="margin: 0 0 1rem 0; font-size: 1.2rem; color: #333;">${t('ct.extension.timetracker.reports.istVsSoll')}</h2>
                ${(() => {
                const ist = parseFloat(stats.totalHours);
                const soll = parseFloat(stats.expectedHours);
                const percentage = soll > 0 ? (ist / soll) * 100 : 0;
                const isOverTarget = ist >= soll;
                const progressColor = isOverTarget ? '#28a745' : (percentage >= 80 ? '#ffc107' : '#dc3545');

                return `
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 1.5rem;">
                            <div>
                                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
                                    <span style="font-weight: 600; color: #007bff; font-size: 1.1rem;">${t('ct.extension.timetracker.dashboard.stats.actual')}:</span>
                                    <span style="font-size: 2rem; font-weight: 700; color: #007bff;">${stats.totalHours}h</span>
                                </div>
                                <div style="color: #666; font-size: 0.85rem;">
                                    ${stats.entriesCount} ${t('ct.extension.timetracker.reports.entriesRecorded')}
                                </div>
                            </div>
                            <div>
                                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
                                    <span style="font-weight: 600; color: #6c757d; font-size: 1.1rem;">${t('ct.extension.timetracker.dashboard.stats.target')}:</span>
                                    <span style="font-size: 2rem; font-weight: 700; color: #6c757d;">${stats.expectedHours}h</span>
                                </div>
                                <div style="color: #666; font-size: 0.85rem;">
                                    ${t('ct.extension.timetracker.reports.expectedHoursHelp').replace('{hours}', stats.absenceHours)}
                                </div>
                            </div>
                        </div>

                        <div style="margin-bottom: 1rem;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                <span style="font-weight: 600; color: #333;">Progress:</span>
                                <span style="font-size: 1.2rem; font-weight: 700; color: ${progressColor};">
                                    ${percentage.toFixed(1)}%
                                </span>
                            </div>
                            <div style="background: #e9ecef; height: 24px; border-radius: 12px; overflow: hidden; position: relative;">
                                <div style="background: ${progressColor}; height: 100%; width: ${Math.min(percentage, 100)}%; transition: width 0.3s; display: flex; align-items: center; justify-content: center;">
                                    ${percentage > 100 ? '' : (percentage >= 10 ? `<span style="color: white; font-weight: 600; font-size: 0.85rem;">${percentage.toFixed(1)}%</span>` : '')}
                                </div>
                                ${percentage > 100 ? `
                                    <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                                        <span style="color: white; font-weight: 700; font-size: 0.85rem;">Target Exceeded! 🎉</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>

                        <div style="padding: 1rem; background: ${isOverTarget ? '#d4edda' : (percentage >= 80 ? '#fff3cd' : '#f8d7da')}; border-radius: 6px; border-left: 4px solid ${progressColor};">

                            <div style="font-weight: 600; color: ${isOverTarget ? '#155724' : (percentage >= 80 ? '#856404' : '#721c24')}; margin-bottom: 0.25rem;">
                                ${isOverTarget ? `
                                    <span style="display: inline-flex; align-items: center; gap: 0.25rem;">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                        </svg>
                                        ${t('ct.extension.timetracker.reports.targetAchieved')}
                                    </span>
                                ` : (percentage >= 80 ? `
                                    <span style="display: inline-flex; align-items: center; gap: 0.25rem;">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                            <line x1="12" y1="9" x2="12" y2="13"></line>
                                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                        </svg>
                                        Close to Target
                                    </span>
                                ` : `
                                    <span style="display: inline-flex; align-items: center; gap: 0.25rem;">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <line x1="15" y1="9" x2="9" y2="15"></line>
                                            <line x1="9" y1="9" x2="15" y2="15"></line>
                                        </svg>
                                        Below Target
                                    </span>
                                `)}
                            </div>
                            <div style="color: ${isOverTarget ? '#155724' : (percentage >= 80 ? '#856404' : '#721c24')}; font-size: 0.9rem;">
                                ${isOverTarget
                        ? `${t('ct.extension.timetracker.reports.targetAchievedMessage').replace('{hours}', parseFloat(stats.overtime).toFixed(0) + 'h ' + Math.round((parseFloat(stats.overtime) % 1) * 60) + 'm')}`
                        : `You need to work ${formatDecimalHours(Math.abs(parseFloat(stats.overtime)))} more to reach your target.`
                    }
                            </div>
                        </div>
                    `;
            })()}
            </div>

            <!-- Breakdown by Category -->
            <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="margin: 0 0 1rem 0; font-size: 1.2rem; color: #333;">${t('ct.extension.timetracker.reports.categoryBreakdown')}</h2>
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
                                    ${formatDecimalHours(data.hours)}
                                </span>
                            </div>
                            <div style="background: #e9ecef; height: 8px; border-radius: 4px; overflow: hidden;">
                                <div style="background: ${category?.color || '#6c757d'}; height: 100%; width: ${percentage}%; transition: width 0.3s;"></div>
                            </div>
                            <div style="margin-top: 0.5rem; color: #666; font-size: 0.85rem;">
                                ${t('ct.extension.timetracker.reports.categoryDetails').replace('{count}', data.count.toString()).replace('{percent}', percentage.toFixed(1))}
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
                <h2 style="margin: 0 0 1rem 0; font-size: 1.2rem; color: #333;">${t('ct.extension.timetracker.absences.title')}</h2>
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
                        const userConfig = getUserHours();
                        hours = days * userConfig.hoursPerDay;
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
                                            ${absence.absenceReason?.nameTranslated || absence.absenceReason?.name || 'Unknown'}
                                        </span>
                                    </td>
                                    <td style="padding: 0.75rem; font-weight: 600;">${formatDecimalHours(hours)}</td>
                                </tr>
                            `}).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            ` : ''}

            <!-- Export Options -->
            <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="margin: 0 0 1rem 0; font-size: 1.2rem; color: #333;">${t('ct.extension.timetracker.reports.exportReport')}</h2>
                <button id="export-report-csv-btn" style="padding: 0.75rem 1.5rem; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Export to CSV
                </button>
            </div>
        `;
    }

    // Attach event handlers
    function attachEventHandlers() {
        // Refresh button
        const refreshBtn = element.querySelector('#refresh-data-btn') as HTMLButtonElement;
        refreshBtn?.addEventListener('click', async () => {
            const originalContent = refreshBtn.innerHTML;
            refreshBtn.disabled = true;
            refreshBtn.style.opacity = '0.6';
            refreshBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg><style>@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }</style>';

            await refreshData();

            refreshBtn.innerHTML = originalContent;
            refreshBtn.disabled = false;
            refreshBtn.style.opacity = '1';
            showNotification('Data refreshed successfully!', 'success');
        });

        // View switchers
        const viewDashboard = element.querySelector('#view-dashboard') as HTMLButtonElement;
        const viewEntries = element.querySelector('#view-entries') as HTMLButtonElement;
        const viewAbsences = element.querySelector('#view-absences') as HTMLButtonElement;
        const viewReports = element.querySelector('#view-reports') as HTMLButtonElement;
        const viewAllEntries = element.querySelector('#view-all-entries') as HTMLButtonElement;

        viewDashboard?.addEventListener('click', () => {
            currentView = 'dashboard';
            render();
        });

        viewEntries?.addEventListener('click', () => {
            currentView = 'entries';
            entriesPage = 1; // Reset to first page when switching to entries view
            render();
        });

        viewAbsences?.addEventListener('click', () => {
            currentView = 'absences';
            render();
        });

        viewReports?.addEventListener('click', () => {
            currentView = 'reports';
            render();
        });

        viewAllEntries?.addEventListener('click', () => {
            currentView = 'entries';
            entriesPage = 1; // Reset to first page
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
            const isBreakCheckbox = element.querySelector(
                '#clock-in-is-break'
            ) as HTMLInputElement;
            await clockIn(categorySelect.value, descriptionInput.value, isBreakCheckbox?.checked || false);
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
            const searchInput = element.querySelector('#filter-search') as HTMLInputElement;

            filterDateFrom = dateFromInput.value;
            filterDateTo = dateToInput.value;
            filterCategory = categorySelect.value;
            filterSearch = searchInput?.value || '';
            entriesPage = 1; // Reset to first page when filters change

            render();
        });

        exportCsvBtn?.addEventListener('click', () => {
            exportToCSV();
        });

        exportReportCsvBtn?.addEventListener('click', () => {
            exportToCSV();
        });

        // Pagination
        const entriesPrevPage = element.querySelector('#entries-prev-page') as HTMLButtonElement;
        const entriesNextPage = element.querySelector('#entries-next-page') as HTMLButtonElement;

        entriesPrevPage?.addEventListener('click', () => {
            if (entriesPage > 1) {
                entriesPage--;
                render();
            }
        });

        entriesNextPage?.addEventListener('click', () => {
            const totalPages = Math.ceil(getFilteredEntries().length / ENTRIES_PER_PAGE);
            if (entriesPage < totalPages) {
                entriesPage++;
                render();
            }
        });

        // Report period buttons
        const reportPeriodWeek = element.querySelector('#report-period-week') as HTMLButtonElement;
        const reportPeriodMonth = element.querySelector('#report-period-month') as HTMLButtonElement;
        const reportPeriodYear = element.querySelector('#report-period-year') as HTMLButtonElement;
        const reportPeriodCustom = element.querySelector('#report-period-custom') as HTMLButtonElement;

        reportPeriodWeek?.addEventListener('click', () => {
            setReportPeriod('week');
            render();
        });

        reportPeriodMonth?.addEventListener('click', () => {
            setReportPeriod('month');
            render();
        });

        reportPeriodYear?.addEventListener('click', () => {
            setReportPeriod('year');
            render();
        });

        reportPeriodCustom?.addEventListener('click', () => {
            reportPeriod = 'custom';
            settings.reportPeriod = 'custom';
            saveSettings();
            render();
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
            reportPeriod = 'custom';
            settings.reportPeriod = 'custom';
            saveSettings();

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
            editingEntry = null;
            showBulkEntry = false;
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
            const isBreakCheckbox = element.querySelector('#manual-is-break') as HTMLInputElement;

            if (!startInput.value || !endInput.value) {
                showNotification('Please fill in both start and end times.', 'error');
                return;
            }

            const start = new Date(startInput.value);
            const end = new Date(endInput.value);

            if (end <= start) {
                showNotification('End time must be after start time.', 'error');
                return;
            }

            try {
                const category = workCategories.find((c) => c.id === categorySelect.value);
                const cat = await getCustomDataCategory<object>('timeentries');
                if (!cat) {
                    throw new Error('Time entries category not found');
                }

                if (editingEntry) {
                    // UPDATE existing entry
                    const updatedEntry: TimeEntry = {
                        ...editingEntry,
                        startTime: start.toISOString(),
                        endTime: end.toISOString(),
                        categoryId: categorySelect.value,
                        categoryName: category?.name || 'Unknown',
                        description: descriptionInput.value,
                        isBreak: isBreakCheckbox?.checked || false,
                    };

                    // Find in KV store and update
                    const allValues = await getCustomDataValues<TimeEntry>(cat.id, moduleId!);
                    const existingValue = allValues.find(v => v.startTime === editingEntry!.startTime);

                    if (existingValue) {
                        const kvStoreId = (existingValue as any).id;
                        await updateCustomDataValue(
                            cat.id,
                            kvStoreId,
                            { value: JSON.stringify(updatedEntry) },
                            moduleId!
                        );
                    }

                    // Update local array
                    const index = timeEntries.findIndex(e => e.startTime === editingEntry!.startTime);
                    if (index !== -1) {
                        timeEntries[index] = updatedEntry;
                    }

                    editingEntry = null;
                } else {
                    // CREATE new entry
                    const newEntry: TimeEntry = {
                        userId: user?.id!,
                        startTime: start.toISOString(),
                        endTime: end.toISOString(),
                        categoryId: categorySelect.value,
                        categoryName: category?.name || 'Unknown',
                        description: descriptionInput.value,
                        isManual: true,
                        isBreak: isBreakCheckbox?.checked || false,
                        createdAt: new Date().toISOString(),
                        settingsSnapshot: createSettingsSnapshot(user?.id!), // Preserve settings at time of manual entry creation
                    };

                    await createCustomDataValue(
                        {
                            dataCategoryId: cat.id,
                            value: JSON.stringify(newEntry),
                        },
                        moduleId!
                    );

                    timeEntries.unshift(newEntry);
                    timeEntries.sort(
                        (a, b) =>
                            new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
                    );

                    showAddManualEntry = false;
                }

                render();
            } catch (error) {
                console.error('[TimeTracker] Failed to save entry:', error);
                showNotification('Failed to save entry. Please try again.', 'error');
            }
        });

        // Bulk entry
        const bulkAddEntriesBtn = element.querySelector('#bulk-add-entries-btn') as HTMLButtonElement;
        const closeBulkEntryBtn = element.querySelector('#close-bulk-entry-btn') as HTMLButtonElement;
        const addBulkRowBtn = element.querySelector('#add-bulk-row-btn') as HTMLButtonElement;
        const saveBulkEntriesBtn = element.querySelector('#save-bulk-entries-btn') as HTMLButtonElement;

        bulkAddEntriesBtn?.addEventListener('click', () => {
            showBulkEntry = true;
            showAddManualEntry = false;
            editingEntry = null;
            // Start with 3 empty rows
            if (bulkEntryRows.length === 0) {
                addBulkEntryRow();
                addBulkEntryRow();
                addBulkEntryRow();
            }
            render();
        });

        closeBulkEntryBtn?.addEventListener('click', () => {
            showBulkEntry = false;
            render();
        });

        addBulkRowBtn?.addEventListener('click', () => {
            addBulkEntryRow();
        });

        saveBulkEntriesBtn?.addEventListener('click', async () => {
            await saveBulkEntries();
        });

        // Excel import/export (Alpha Feature)
        if (settings.excelImportEnabled) {
            const downloadExcelTemplateBtn = element.querySelector('#download-excel-template-btn') as HTMLButtonElement;
            const importExcelBtn = element.querySelector('#import-excel-btn') as HTMLButtonElement;
            const importExcelInput = element.querySelector('#import-excel-input') as HTMLInputElement;

            downloadExcelTemplateBtn?.addEventListener('click', () => {
                downloadExcelTemplate();
            });

            importExcelBtn?.addEventListener('click', () => {
                importExcelInput?.click();
            });

            importExcelInput?.addEventListener('change', (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                    importFromExcel(file);
                    // Reset input so the same file can be imported again
                    importExcelInput.value = '';
                }
            });
        }

        // Bulk input change handlers (using event delegation)
        const bulkInputs = element.querySelectorAll('.bulk-input');
        bulkInputs.forEach((input) => {
            input.addEventListener('change', (e) => {
                const target = e.target as HTMLInputElement | HTMLSelectElement;
                const rowId = parseInt(target.dataset.rowId || '0');
                const field = target.dataset.field as keyof BulkEntryRow;
                if (rowId && field) {
                    updateBulkEntryRow(rowId, field, target.value);
                }
            });
        });

        // Bulk checkbox change handlers (for isBreak)
        const bulkCheckboxes = element.querySelectorAll('.bulk-input-checkbox');
        bulkCheckboxes.forEach((checkbox) => {
            checkbox.addEventListener('change', (e) => {
                const target = e.target as HTMLInputElement;
                const rowId = parseInt(target.dataset.rowId || '0');
                const field = target.dataset.field as keyof BulkEntryRow;
                if (rowId && field) {
                    updateBulkEntryRow(rowId, field, target.checked);
                }
            });
        });

        // Remove bulk row buttons (using event delegation)
        const removeBulkRowBtns = element.querySelectorAll('.remove-bulk-row-btn');
        removeBulkRowBtns.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                const rowId = parseInt(target.dataset.rowId || '0');
                if (rowId && confirm(t('ct.extension.timetracker.timeEntries.deleteConfirm'))) {
                    removeBulkEntryRow(rowId);
                }
            });
        });

        // Absences
        const addAbsenceBtn = element.querySelector('#add-absence-btn') as HTMLButtonElement;
        const cancelAbsenceBtn = element.querySelector('#cancel-absence-btn') as HTMLButtonElement;
        const saveAbsenceBtn = element.querySelector('#save-absence-btn') as HTMLButtonElement;
        const absenceAllDayCheckbox = element.querySelector('#absence-all-day') as HTMLInputElement;

        addAbsenceBtn?.addEventListener('click', () => {
            showAddAbsence = true;
            editingAbsence = null;
            render();
        });

        cancelAbsenceBtn?.addEventListener('click', () => {
            showAddAbsence = false;
            editingAbsence = null;
            render();
        });

        // Toggle time fields based on all-day checkbox
        absenceAllDayCheckbox?.addEventListener('change', () => {
            const timeFields = element.querySelector('#absence-time-fields') as HTMLElement;
            if (timeFields) {
                timeFields.style.display = absenceAllDayCheckbox.checked ? 'none' : 'grid';
            }
        });

        saveAbsenceBtn?.addEventListener('click', async () => {
            const startDateInput = element.querySelector('#absence-start-date') as HTMLInputElement;
            const endDateInput = element.querySelector('#absence-end-date') as HTMLInputElement;
            const startTimeInput = element.querySelector('#absence-start-time') as HTMLInputElement;
            const endTimeInput = element.querySelector('#absence-end-time') as HTMLInputElement;
            const reasonSelect = element.querySelector('#absence-reason') as HTMLSelectElement;
            const commentTextarea = element.querySelector('#absence-comment') as HTMLTextAreaElement;
            const allDayCheckbox = element.querySelector('#absence-all-day') as HTMLInputElement;

            if (!startDateInput?.value || !endDateInput?.value || !reasonSelect?.value) {
                showNotification('Please fill in all required fields.', 'error');
                return;
            }

            const data = {
                absenceReasonId: parseInt(reasonSelect.value),
                comment: commentTextarea?.value || '',
                startDate: startDateInput.value,
                endDate: endDateInput.value,
                startTime: !allDayCheckbox?.checked && startTimeInput?.value ? startTimeInput.value : undefined,
                endTime: !allDayCheckbox?.checked && endTimeInput?.value ? endTimeInput.value : undefined,
            };

            if (editingAbsence) {
                await updateAbsence(editingAbsence.id, data);
            } else {
                await createAbsence(data);
            }
        });

        // Edit/Delete absence buttons (using event delegation)
        const editAbsenceBtns = element.querySelectorAll('.edit-absence-btn');
        editAbsenceBtns.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                const absenceId = parseInt(target.dataset.absenceId || '0');
                const absence = absences.find((a) => a.id === absenceId);
                if (absence) {
                    editingAbsence = absence;
                    showAddAbsence = false;
                    render();
                }
            });
        });

        const deleteAbsenceBtns = element.querySelectorAll('.delete-absence-btn');
        deleteAbsenceBtns.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                const absenceId = parseInt(target.dataset.absenceId || '0');
                const absence = absences.find((a) => a.id === absenceId);

                if (
                    absence &&
                    confirm(
                        `${t('ct.extension.timetracker.absences.deleteConfirm')}\n\n${t('ct.extension.timetracker.reports.from')}: ${new Date(absence.startDate).toLocaleDateString()}\n${t('ct.extension.timetracker.reports.to')}: ${new Date(absence.endDate).toLocaleDateString()}\n${t('ct.extension.timetracker.absences.reason')}: ${absence.absenceReason?.nameTranslated || absence.absenceReason?.name}`
                    )
                ) {
                    deleteAbsence(absenceId);
                }
            });
        });
    }

    // Setup event delegation for edit/delete entry buttons (only once)
    element.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;

        // Check if clicked element is an edit button
        const editBtn = target.closest('.edit-entry-btn') as HTMLElement;
        if (editBtn) {
            const startTime = editBtn.dataset.entryStart;
            const entry = timeEntries.find((e) => e.startTime === startTime);
            if (entry) {
                editingEntry = entry;
                showAddManualEntry = false;
                currentView = 'entries'; // Switch to entries view to show edit form
                render();
            }
            return;
        }

        // Check if clicked element is a delete button
        const deleteBtn = target.closest('.delete-entry-btn') as HTMLElement;
        if (deleteBtn) {
            const startTime = deleteBtn.dataset.entryStart;
            const entry = timeEntries.find((e) => e.startTime === startTime);

            if (
                entry &&
                confirm(
                    `${t('ct.extension.timetracker.timeEntries.deleteConfirm')}\n\n${t('ct.extension.timetracker.timeEntries.startTime')}: ${new Date(entry.startTime).toLocaleString()}\n${t('ct.extension.timetracker.timeEntries.endTime')}: ${entry.endTime ? new Date(entry.endTime).toLocaleString() : 'N/A'}\n${t('ct.extension.timetracker.dashboard.category')}: ${entry.categoryName}${entry.isBreak ? ` (${t('ct.extension.timetracker.timeEntries.break')})` : ''}`
                )
            ) {
                deleteTimeEntry(startTime!);
            }
            return;
        }
    });

    // Initialize
    initialize();

    // Cleanup
    return () => {
        stopTimerUpdate();
    };
};

// Named export for simple mode
export { mainEntryPoint };

// Default export for advanced mode
export default mainEntryPoint;
