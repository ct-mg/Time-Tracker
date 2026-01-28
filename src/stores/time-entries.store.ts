import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useSettingsStore } from './settings.store';
import { useAuthStore } from './auth.store';
import { useAbsencesStore } from './absences.store';
import { parseISO, differenceInMilliseconds, isWithinInterval, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { getISOWeek, getISOWeekYear, formatHours } from '../utils/date';
import type { TimeEntry, WorkCategory, ActivityLog, GroupingMode, DateRange, TimeEntryGroup, DayGroup } from '../types/time-tracker';
import {
    getCustomDataCategory,
    getCustomDataValues,
    createCustomDataValue,
    updateCustomDataValue,
    createCustomDataCategory,
    deleteCustomDataValue
} from '../services/kv-store';
import { exportToCSV as exportCSV, exportToPDF as exportPDF } from '../services/export.service';

export const useTimeEntriesStore = defineStore('timeEntries', () => {
    const entries = ref<TimeEntry[]>([]);
    const workCategories = ref<WorkCategory[]>([]);
    const isLoading = ref(true);
    const error = ref<string | null>(null);
    const activityLogs = ref<ActivityLog[]>([]);

    // Filter State (Centralized for sharing between Filters vs List components)
    const searchTerm = ref('');
    const groupingMode = ref<GroupingMode>('week');
    const dateRange = ref<DateRange>({
        start: subDays(new Date(), 365),
        end: new Date()
    });
    const selectedCategoryIds = ref<string[]>([]);
    const selectedUserIds = ref<number[]>([]);
    const userId = ref<number | undefined>(undefined); // Global user filter (Manager view)

    // Bulk Actions State
    const selectedEntryIds = ref<string[]>([]); // Using startTime as unique ID

    const settingsStore = useSettingsStore();
    const authStore = useAuthStore();
    const absencesStore = useAbsencesStore();

    // Getters
    const activeEntry = computed(() => {
        return entries.value.find(entry => entry.endTime === null && entry.userId === authStore.user?.id) || null;
    });

    const filteredEntries = computed(() => {
        let result = [...entries.value];

        // Search Term
        if (searchTerm.value) {
            const query = searchTerm.value.toLowerCase();
            result = result.filter(e =>
                e.description.toLowerCase().includes(query) ||
                e.categoryName.toLowerCase().includes(query)
            );
        }

        // Date Range
        if (dateRange.value.start && dateRange.value.end) {
            const start = startOfDay(dateRange.value.start);
            const end = endOfDay(dateRange.value.end);
            result = result.filter(e => {
                const entryDate = parseISO(e.startTime);
                return isWithinInterval(entryDate, { start, end });
            });
        }

        // Categories
        if (selectedCategoryIds.value.length > 0) {
            result = result.filter(e => selectedCategoryIds.value.includes(e.categoryId));
        }

        // Users
        if (selectedUserIds.value.length > 0) {
            result = result.filter(e => selectedUserIds.value.includes(e.userId));
        }

        return result;
    });

    const sortedEntries = computed(() => {
        return [...filteredEntries.value].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    });

    const categoryStats = computed(() => {
        const stats: Record<string, { id: string; name: string; color: string; totalMs: number; totalHours: number }> = {};

        // Initialize with all work categories
        workCategories.value.forEach(cat => {
            stats[cat.id] = {
                id: cat.id,
                name: cat.name,
                color: cat.color,
                totalMs: 0,
                totalHours: 0
            };
        });

        filteredEntries.value.forEach(entry => {
            if (entry.isBreak) return; // Don't count breaks

            const start = parseISO(entry.startTime);
            const end = entry.endTime ? parseISO(entry.endTime) : new Date();
            const durationMs = differenceInMilliseconds(end, start);

            if (!stats[entry.categoryId]) {
                stats[entry.categoryId] = {
                    id: entry.categoryId,
                    name: entry.categoryName || 'Unknown',
                    color: '#cccccc',
                    totalMs: 0,
                    totalHours: 0
                };
            }

            stats[entry.categoryId].totalMs += durationMs;
        });

        // Convert to array and calc hours
        return Object.values(stats)
            .map(s => ({
                ...s,
                totalHours: Math.round((s.totalMs / (1000 * 60 * 60)) * 100) / 100
            }))
            .filter(s => s.totalMs > 0)
            .sort((a, b) => b.totalMs - a.totalMs);
    });

    // Helper: Create settings snapshot
    function createSettingsSnapshot(userId: number): TimeEntry['settingsSnapshot'] {
        const settings = settingsStore.settings;

        // Priority 1: User-specific settings from store
        const userConfig = settings.userHoursConfig?.find((u: any) => u.userId === userId);

        return {
            hoursPerDay: userConfig?.hoursPerDay ?? settings.defaultHoursPerDay,
            hoursPerWeek: userConfig?.hoursPerWeek ?? settings.defaultHoursPerWeek,
            workWeekDays: userConfig?.workWeekDays ?? settings.workWeekDays ?? [1, 2, 3, 4, 5],
        };
    }

    // Helper: Checks if a date is a work day
    function isWorkDay(date: Date, uId?: number): boolean {
        const dayOfWeek = date.getDay(); // 0 = Sunday
        const settings = settingsStore.settings;

        // Priority 1: User-specific work week
        if (uId !== undefined && settings.userHoursConfig) {
            const userConfig = settings.userHoursConfig.find((u: any) => u.userId === uId);
            if (userConfig?.workWeekDays) {
                return userConfig.workWeekDays.includes(dayOfWeek);
            }
        }

        // Priority 2: Global work week setting
        const workWeekDays = settings.workWeekDays || [1, 2, 3, 4, 5];
        return workWeekDays.includes(dayOfWeek);
    }

    // Helper: Get User Hours (Target)
    function getUserHours(uId?: number): { hoursPerDay: number; hoursPerWeek: number } {
        const settings = settingsStore.settings;
        if (!uId) {
            return {
                hoursPerDay: settings.defaultHoursPerDay,
                hoursPerWeek: settings.defaultHoursPerWeek
            };
        }

        const userConfig = settings.userHoursConfig?.find((c: any) => c.userId === uId);
        if (userConfig) {
            return {
                hoursPerDay: userConfig.hoursPerDay,
                hoursPerWeek: userConfig.hoursPerWeek
            };
        }

        return {
            hoursPerDay: settings.defaultHoursPerDay,
            hoursPerWeek: settings.defaultHoursPerWeek
        };
    }

    // Helper: Calculate actual hours in range
    function calculateActualHours(start: Date, end: Date): number {
        const userId = authStore.user?.id;
        if (!userId) return 0;

        // 1. Regular Time Entries (including active one)
        const entriesInRange = entries.value.filter(entry => {
            if (entry.userId !== userId) return false;
            if (entry.isBreak) return false;

            const entryStart = parseISO(entry.startTime);
            return entryStart >= start && entryStart <= end;
        });

        const entryMs = entriesInRange.reduce((sum, entry) => {
            const entryStart = parseISO(entry.startTime);
            const entryEnd = entry.endTime ? parseISO(entry.endTime) : new Date();
            const duration = differenceInMilliseconds(entryEnd, entryStart);
            return sum + (duration > 0 ? duration : 0);
        }, 0);

        // 2. Absences (that count as worked time)
        const userIdVal = authStore.user?.id;
        const absences = absencesStore.absences.filter(abs => {
            if (abs.userId !== userIdVal) return false;
            const absStart = startOfDay(parseISO(abs.startDate));
            const absEnd = endOfDay(parseISO(abs.endDate));
            return absStart <= end && absEnd >= start;
        });

        const absenceMs = absences.reduce((sum, abs) => {
            if (abs.isFullDay) {
                const intersectStart = new Date(Math.max(start.getTime(), parseISO(abs.startDate).getTime()));
                const intersectEnd = new Date(Math.min(end.getTime(), parseISO(abs.endDate).getTime()));
                const workDays = countWorkDays(intersectStart, intersectEnd);
                return sum + (workDays * getUserHours(userIdVal).hoursPerDay * 3600000);
            } else if (abs.startTime && abs.endTime) {
                const [sh, sm] = abs.startTime.split(':').map(Number);
                const [eh, em] = abs.endTime.split(':').map(Number);
                const durationMs = ((eh * 60 + em) - (sh * 60 + sm)) * 60000;
                return sum + (durationMs > 0 ? durationMs : 0);
            }
            return sum;
        }, 0);

        return (entryMs + absenceMs) / 3600000;
    }

    // Helper: Count work days in range
    function countWorkDays(start: Date, end: Date): number {
        const userId = authStore.user?.id;
        let count = 0;
        const current = new Date(start);

        while (current <= end) {
            if (isWorkDay(current, userId)) {
                count++;
            }
            current.setDate(current.getDate() + 1);
        }

        return count;
    }

    const todayStats = computed(() => {
        const today = new Date();
        const start = startOfDay(today);
        const end = endOfDay(today);

        const actual = calculateActualHours(start, end);
        const target = getUserHours(authStore.user?.id).hoursPerDay;
        const progress = target > 0 ? (actual / target) * 100 : 0;

        return {
            actual,
            target,
            progress,
            remaining: Math.max(0, target - actual),
            isOnTrack: actual >= target
        };
    });

    const thisWeekStats = computed(() => {
        const today = new Date();
        const start = startOfWeek(today, { weekStartsOn: 1 });
        const end = endOfWeek(today, { weekStartsOn: 1 });

        const actual = calculateActualHours(start, end);
        const workDays = countWorkDays(start, end);
        const target = workDays * getUserHours(authStore.user?.id).hoursPerDay;
        const progress = target > 0 ? (actual / target) * 100 : 0;

        return {
            actual,
            target,
            progress,
            remaining: Math.max(0, target - actual),
            isOnTrack: actual >= target,
            workDays
        };
    });

    const thisMonthStats = computed(() => {
        const today = new Date();
        const start = startOfMonth(today);
        const end = endOfMonth(today);

        const actual = calculateActualHours(start, end);
        const workDays = countWorkDays(start, end);
        const target = workDays * getUserHours(authStore.user?.id).hoursPerDay;
        const progress = target > 0 ? (actual / target) * 100 : 0;

        return {
            actual,
            target,
            progress,
            remaining: Math.max(0, target - actual),
            isOnTrack: actual >= target,
            workDays
        };
    });

    const lastMonthStats = computed(() => {
        const today = new Date();
        const lastMonth = subMonths(today, 1);
        const start = startOfMonth(lastMonth);
        const end = endOfMonth(lastMonth);

        const actual = calculateActualHours(start, end);
        const workDays = countWorkDays(start, end);
        const target = workDays * getUserHours(authStore.user?.id).hoursPerDay;
        const progress = target > 0 ? (actual / target) * 100 : 0;

        return {
            actual,
            target,
            progress,
            remaining: Math.max(0, target - actual),
            isOnTrack: actual >= target,
            workDays
        };
    });

    const groupedEntries = computed<TimeEntryGroup[]>(() => {
        const entriesToGroup = filteredEntries.value;
        const mode = groupingMode.value;

        const groups = new Map<string, TimeEntryGroup & { days: Map<string, DayGroup> }>();

        const currentUserId = authStore.user?.id;
        const userHours = getUserHours(currentUserId);

        entriesToGroup.forEach(entry => {
            const date = parseISO(entry.startTime);
            const dayKey = entry.startTime.split('T')[0];

            let groupKey = '';
            let groupTitle = '';
            let groupSubTitle = '';

            if (mode === 'week') {
                const weekNum = getISOWeek(date);
                const yearNum = getISOWeekYear(date);
                groupKey = `${yearNum}-W${String(weekNum).padStart(2, '0')}`;
                groupTitle = `Week ${weekNum}`;
                groupSubTitle = `(${yearNum})`;
            } else if (mode === 'month') {
                const month = date.getMonth();
                const year = date.getFullYear();
                groupKey = `${year}-${String(month + 1).padStart(2, '0')}`;
                groupTitle = date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
            } else {
                groupKey = dayKey;
                groupTitle = date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            }

            if (!groups.has(groupKey)) {
                groups.set(groupKey, {
                    key: groupKey,
                    title: groupTitle,
                    subTitle: groupSubTitle,
                    days: new Map(),
                    totalMs: 0,
                    targetMs: 0,
                    totalDisplay: '0h',
                    targetDisplay: '0h',
                    sortedDays: []
                });
            }

            const group = groups.get(groupKey)!;

            if (!group.days.has(dayKey)) {
                const isWork = isWorkDay(date, currentUserId);
                const dayTargetMs = isWork ? userHours.hoursPerDay * 3600000 : 0;
                group.days.set(dayKey, {
                    date: dayKey,
                    entries: [],
                    dayTotalMs: 0,
                    dayTargetMs,
                    dayTargetDisplay: formatHours(dayTargetMs),
                    dayTotalDisplay: '0h',
                    isWorkDay: isWork
                });

                group.targetMs += dayTargetMs;
            }

            const day = group.days.get(dayKey)!;
            day.entries.push(entry);

            if (!entry.isBreak && entry.endTime) {
                const duration = differenceInMilliseconds(parseISO(entry.endTime), parseISO(entry.startTime));
                day.dayTotalMs += duration;
                group.totalMs += duration;
            } else if (!entry.isBreak && !entry.endTime && entry.userId === currentUserId) {
                const duration = differenceInMilliseconds(new Date(), parseISO(entry.startTime));
                day.dayTotalMs += duration;
                group.totalMs += duration;
            }
        });

        const sortedGroups = Array.from(groups.values()).sort((a, b) => b.key.localeCompare(a.key));

        return sortedGroups.map(group => {
            const result: TimeEntryGroup = {
                key: group.key,
                title: group.title,
                subTitle: group.subTitle,
                totalMs: group.totalMs,
                targetMs: group.targetMs,
                totalDisplay: formatHours(group.totalMs),
                targetDisplay: formatHours(group.targetMs),
                sortedDays: Array.from(group.days.values()).sort((a, b) => b.date.localeCompare(a.date))
            };

            result.sortedDays.forEach(day => {
                day.dayTotalDisplay = formatHours(day.dayTotalMs);
                day.entries.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
            });

            return result;
        });
    });

    // Actions
    async function loadWorkCategories() {
        const moduleId = settingsStore.moduleId;
        if (!moduleId) return;
        try {
            const category = await getCustomDataCategory<object>('workcategories');
            if (category) {
                const results = await getCustomDataValues<WorkCategory>(category.id);

                workCategories.value = results.map((item) => ({
                    id: item.id,
                    name: item.name,
                    color: item.color,
                    kvStoreId: (item as any).id // item.id is from WorkCategory, (item as any).id is from CustomModuleDataValue
                }));
            } else {
                workCategories.value = [
                    { id: 'office', name: 'Office Work', color: '#007bff' },
                    { id: 'pastoral', name: 'Pastoral Care', color: '#28a745' },
                    { id: 'event', name: 'Event Preparation', color: '#ffc107' },
                    { id: 'administration', name: 'Administration', color: '#6c757d' },
                ];
            }
        } catch (e) {
            console.error('Failed to load categories', e);
            // Fallback
            workCategories.value = [{ id: 'general', name: 'General', color: '#007bff' }];
        }
    }

    async function loadTimeEntries() {
        const moduleId = settingsStore.moduleId;
        if (!moduleId) return;
        isLoading.value = true;
        try {
            const category = await getCustomDataCategory<object>('timeentries');
            if (category) {
                const results = await getCustomDataValues<TimeEntry>(category.id);

                let loadedEntries = results.map(entry => {
                    if (entry.isBreak === undefined) entry.isBreak = false;

                    // Update category name if needed
                    const currentCat = workCategories.value.find(c => c.id === entry.categoryId);
                    if (currentCat) entry.categoryName = currentCat.name;

                    // Enrich with User Name from authStore
                    const u = authStore.userList.find(user => user.id === entry.userId);
                    if (u) {
                        entry.userName = u.name;
                    } else if (entry.userId === authStore.user?.id) {
                        const currentUser = authStore.user;
                        entry.userName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || `User ${entry.userId}`;
                    }

                    return entry;
                });

                // Filter based on permissions
                // Filter based on permissions
                const user = authStore.user;
                if (user) {
                    const permissions = authStore.permissions;

                    if (userId.value) {
                        // Manager View: Specific user selected
                        loadedEntries = loadedEntries.filter(e => e.userId === userId.value);
                    } else if (permissions.canSeeAllEntries) {
                        // show all
                    } else if (permissions.managedEmployeeIds.length > 0) {
                        loadedEntries = loadedEntries.filter(e => e.userId === user.id || permissions.managedEmployeeIds.includes(e.userId));
                    } else {
                        loadedEntries = loadedEntries.filter(e => e.userId === user.id);
                    }
                }

                entries.value = loadedEntries;
            } else {
                // Initialize category
                await createCustomDataCategory({
                    customModuleId: moduleId,
                    name: 'Time Entries',
                    shorty: 'timeentries',
                    description: 'Time tracking entries'
                });
                entries.value = [];
            }
        } catch (e) {
            console.error('Failed to load entries', e);
            error.value = 'Failed to load entries';
        } finally {
            isLoading.value = false;
        }
    }

    async function clockIn(categoryId: string, description: string, isBreak: boolean = false) {
        const moduleId = settingsStore.moduleId;
        if (!moduleId) return;
        const user = authStore.user;
        if (!user || activeEntry.value) return;

        try {
            const category = workCategories.value.find(c => c.id === categoryId);
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
                settingsSnapshot: createSettingsSnapshot(user.id)
            };

            const cat = await getCustomDataCategory<object>('timeentries');
            if (cat) {
                await createCustomDataValue({
                    dataCategoryId: cat.id,
                    value: JSON.stringify(newEntry)
                });
            }

            entries.value.unshift(newEntry);
            // activeEntry computed will update automatically
        } catch (e) {
            console.error('Clock in failed', e);
            throw e;
        }
    }

    async function saveManualEntry(entryData: Partial<TimeEntry>, originalEntry?: TimeEntry) {
        const moduleId = settingsStore.moduleId;
        if (!moduleId) return;
        try {
            const cat = await getCustomDataCategory<object>('timeentries');
            if (!cat) throw new Error('Category not found');

            // Construct payload
            const payload: any = {
                startTime: entryData.startTime,
                endTime: entryData.endTime || null,
                categoryId: entryData.categoryId,
                description: entryData.description || '',
                isManual: true,
                isBreak: entryData.isBreak || false,
                userId: authStore.user?.id // Always current user for now
            };

            // If updating, find original and update
            if (originalEntry) {
                const allValues = await getCustomDataValues<TimeEntry>(cat.id, moduleId);
                const match = allValues.find(v =>
                    v.userId === originalEntry.userId &&
                    v.startTime === originalEntry.startTime
                );

                if (match) {
                    // Update
                    await updateCustomDataValue(cat.id, (match as any).id, {
                        value: JSON.stringify(payload)
                    });

                    // Update local
                    const idx = entries.value.findIndex(e => e.startTime === originalEntry.startTime);
                    if (idx !== -1) {
                        entries.value[idx] = { ...entries.value[idx], ...payload, categoryName: entryData.categoryName };
                    }
                }
            } else {
                // Create New
                await createCustomDataValue({
                    dataCategoryId: cat.id,
                    value: JSON.stringify(payload)
                });

                // Add to local (optimisticish - simplified)
                // In reality we should reload or handle the ID, but for now push to list
                entries.value.push({ ...payload, categoryName: entryData.categoryName });
            }

            // Re-sort local entries potentially
            entries.value.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

        } catch (e) {
            console.error('Failed to save manual entry', e);
            throw e;
        }
    }

    async function deleteTimeEntry(entry: TimeEntry) {
        const moduleId = settingsStore.moduleId;
        if (!moduleId) return;
        try {
            const cat = await getCustomDataCategory<object>('timeentries');
            if (!cat) throw new Error('Category not found');

            // We need to find the specific kv-store ID for this entry
            // This is inefficient but necessary given the current store structure where we don't store the ID on the object itself purely
            // Optimization: Store kvStoreId on the TimeEntry object during load

            // Re-fetch to find ID (reliable) or use the loaded list if we map IDs
            // Let's modify loadTimeEntries to map IDs first to avoid extra requests on delete
            // For now, let's fetch matching entries to be safe
            const allValues = await getCustomDataValues<TimeEntry>(cat.id, moduleId);
            const match = allValues.find(v =>
                v.userId === entry.userId &&
                v.startTime === entry.startTime // startTime is our logical ID
            );

            if (match) {
                await deleteCustomDataValue(cat.id, (match as any).id);

                // Remove from local state
                entries.value = entries.value.filter(e => e.startTime !== entry.startTime);
            }
        } catch (e) {
            console.error('Failed to delete entry', e);
            throw e;
        }
    }

    async function saveWorkCategory(categoryData: Partial<WorkCategory>) {
        const moduleId = settingsStore.moduleId;
        if (!moduleId) return;
        try {
            const cat = await getCustomDataCategory<object>('workcategories');
            if (!cat) throw new Error('Work Categories container not found');

            const payload = {
                id: categoryData.id || `custom-${Date.now()}`,
                name: categoryData.name || 'New Category',
                color: categoryData.color || '#cccccc'
            };

            // Check if exists (by ID)
            const existing = workCategories.value.find(c => c.id === payload.id);

            if (existing && existing.kvStoreId) {
                // Update
                await updateCustomDataValue(cat.id, existing.kvStoreId, {
                    value: JSON.stringify(payload)
                });

                // Update local
                const idx = workCategories.value.findIndex(c => c.id === payload.id);
                if (idx !== -1) {
                    workCategories.value[idx] = { ...workCategories.value[idx], ...payload };
                }
            } else {
                // Create
                const res = await createCustomDataValue({
                    dataCategoryId: cat.id,
                    value: JSON.stringify(payload)
                });

                // Update local
                workCategories.value.push({ ...payload, kvStoreId: res.id });
            }
        } catch (e) {
            console.error('Failed to save category', e);
            throw e;
        }
    }

    async function deleteWorkCategory(categoryId: string) {
        const moduleId = settingsStore.moduleId;
        if (!moduleId) return;
        try {
            const cat = await getCustomDataCategory<object>('workcategories');
            if (!cat) throw new Error('Work Categories container not found');

            const category = workCategories.value.find(c => c.id === categoryId);
            if (!category || !category.kvStoreId) {
                throw new Error('Category not found or cannot be deleted');
            }

            await deleteCustomDataValue(cat.id, category.kvStoreId);

            // Update local
            workCategories.value = workCategories.value.filter(c => c.id !== categoryId);
        } catch (e) {
            console.error('Failed to delete category', e);
            throw e;
        }
    }

    // Helper: Map KV ID to entry for easier updates (Refactor needed later for optimization)
    // For now we do the lookup in delete/update

    async function clockOut() {
        const moduleId = settingsStore.moduleId;
        if (!moduleId) return;
        if (!activeEntry.value) return;
        const entryToUpdate = { ...activeEntry.value }; // Copy
        entryToUpdate.endTime = new Date().toISOString();

        try {
            const cat = await getCustomDataCategory<object>('timeentries');
            if (cat) {
                const allValues = await getCustomDataValues<TimeEntry>(cat.id);
                const existingValue = allValues.find(v =>
                    v.userId === entryToUpdate.userId &&
                    v.startTime === entryToUpdate.startTime &&
                    v.endTime === null
                );

                if (existingValue) {
                    // We need the ID from the KV store wrapper not the value itself
                    const kvId = (existingValue as any).id;
                    await updateCustomDataValue(
                        cat.id,
                        kvId,
                        { value: JSON.stringify(entryToUpdate) }
                    );

                    // Update local state
                    const index = entries.value.findIndex(e => e.startTime === entryToUpdate.startTime);
                    if (index !== -1) {
                        entries.value[index] = entryToUpdate;
                    }
                }
            }
        } catch (e) {
            console.error('Clock out failed', e);
            throw e;
        }
    }

    function setUserIdFilter(id: number) {
        userId.value = id;
        loadTimeEntries();
    }

    async function loadActivityLogs() {
        const moduleId = settingsStore.moduleId;
        if (!moduleId) return;
        try {
            const cat = await getCustomDataCategory<object>('activitylogs');
            if (cat) {
                const rawValues = await getCustomDataValues<ActivityLog>(cat.id);
                // Sort by newest first
                activityLogs.value = rawValues.sort((a, b) => b.timestamp - a.timestamp);
            } else {
                activityLogs.value = [];
            }
        } catch (e) {
            console.error('Failed to load activity logs', e);
        }
    }

    async function cleanOldActivityLogs(daysToKeep: number) {
        const moduleId = settingsStore.moduleId;
        if (!moduleId) return;
        try {
            const cat = await getCustomDataCategory<object>('activitylogs');
            if (!cat) return;

            const cutoff = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
            const rawValues = await getCustomDataValues<ActivityLog>(cat.id);

            const toDelete = rawValues.filter(l => l.timestamp < cutoff);

            for (const log of toDelete) {
                // Iterate and delete (could be slow but safe for now)
                if ((log as any).id) {
                    await deleteCustomDataValue(cat.id, (log as any).id);
                }
            }

            // Refresh
            await loadActivityLogs();
        } catch (e) {
            console.error('Failed to clean logs', e);
        }
    }

    // Bulk Actions
    function selectEntry(entryId: string) {
        const index = selectedEntryIds.value.indexOf(entryId);
        if (index > -1) {
            selectedEntryIds.value.splice(index, 1);
        } else {
            selectedEntryIds.value.push(entryId);
        }
    }

    function selectAll(entryIds: string[]) {
        selectedEntryIds.value = [...entryIds];
    }

    function clearSelection() {
        selectedEntryIds.value = [];
    }

    async function bulkDeleteEntries(entryIds: string[]) {
        const moduleId = settingsStore.moduleId;
        if (!moduleId) return;
        try {
            const cat = await getCustomDataCategory<object>('timeentries');
            if (!cat) throw new Error('Category not found');

            const allValues = await getCustomDataValues<TimeEntry>(cat.id);

            for (const entryId of entryIds) {
                const match = allValues.find(v => v.startTime === entryId);
                if (match) {
                    await deleteCustomDataValue(cat.id, (match as any).id);
                }
            }

            // Remove from local state
            entries.value = entries.value.filter(e => !entryIds.includes(e.startTime));

            // Clear selection
            clearSelection();
        } catch (e) {
            console.error('Failed to bulk delete entries', e);
            throw e;
        }
    }

    async function bulkUpdateEntries(entryIds: string[], updates: Partial<TimeEntry>) {
        const moduleId = settingsStore.moduleId;
        if (!moduleId) return;
        try {
            const cat = await getCustomDataCategory<object>('timeentries');
            if (!cat) throw new Error('Category not found');

            const allValues = await getCustomDataValues<TimeEntry>(cat.id);

            for (const entryId of entryIds) {
                const match = allValues.find(v => v.startTime === entryId);
                if (match) {
                    const updated = { ...match, ...updates };
                    await updateCustomDataValue(cat.id, (match as any).id, {
                        value: JSON.stringify(updated)
                    });

                    // Update local state
                    const idx = entries.value.findIndex(e => e.startTime === entryId);
                    if (idx !== -1) {
                        entries.value[idx] = { ...entries.value[idx], ...updates };
                    }
                }
            }

            // Clear selection
            clearSelection();
        } catch (e) {
            console.error('Failed to bulk update entries', e);
            throw e;
        }
    }

    function exportToCSV() {
        exportCSV(filteredEntries.value);
    }

    function exportToPDF() {
        const user = authStore.user;
        const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'User';

        exportPDF(
            filteredEntries.value,
            categoryStats.value,
            userName,
            dateRange.value
        );
    }

    return {
        entries,
        workCategories,
        activityLogs,
        isLoading,
        error,
        activeEntry,
        filteredEntries,
        sortedEntries,
        groupedEntries,
        categoryStats,
        todayStats,
        thisWeekStats,
        thisMonthStats,
        lastMonthStats,
        loadWorkCategories,
        loadTimeEntries,
        clockIn,
        clockOut,
        deleteTimeEntry,
        saveManualEntry,
        setUserIdFilter,
        // Filter State exposure
        searchTerm,
        groupingMode,
        dateRange,
        selectedCategoryIds,
        selectedUserIds,
        userId,
        saveWorkCategory,
        deleteWorkCategory,
        loadActivityLogs,
        cleanOldActivityLogs,
        // Bulk Actions
        selectedEntryIds,
        selectEntry,
        selectAll,
        clearSelection,
        bulkDeleteEntries,
        bulkUpdateEntries,
        exportToCSV,
        exportToPDF
    };
});
