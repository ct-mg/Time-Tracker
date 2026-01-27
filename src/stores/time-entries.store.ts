import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import type { TimeEntry, WorkCategory, GroupingMode, DateRange, ActivityLog } from '../types/time-tracker';
import { useSettingsStore } from './settings.store';
import { useAuthStore } from './auth.store';
import { parseISO, differenceInMilliseconds, isWithinInterval, startOfDay, endOfDay, format, subDays } from 'date-fns';
import {
    getCustomDataCategory,
    getCustomDataValues,
    createCustomDataValue,
    updateCustomDataValue,
    createCustomDataCategory,
    deleteCustomDataValue
} from '../services/kv-store';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export const useTimeEntriesStore = defineStore('timeEntries', () => {
    const entries = ref<TimeEntry[]>([]);
    const workCategories = ref<WorkCategory[]>([]);
    const isLoading = ref(false);
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

    // Actions
    async function loadWorkCategories(moduleId: number) {
        try {
            const category = await getCustomDataCategory<object>('workcategories');
            if (category) {
                const rawValues: Array<{ id: number; dataCategoryId: number; value: string }> =
                    await churchtoolsClient.get(
                        `/custommodules/${moduleId}/customdatacategories/${category.id}/customdatavalues`
                    );

                workCategories.value = rawValues.map((rawVal) => {
                    const parsedCategory = JSON.parse(rawVal.value) as WorkCategory;
                    return {
                        id: parsedCategory.id,
                        name: parsedCategory.name,
                        color: parsedCategory.color,
                        kvStoreId: rawVal.id
                    };
                });
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

    async function loadTimeEntries(moduleId: number) {
        isLoading.value = true;
        try {
            const category = await getCustomDataCategory<object>('timeentries');
            if (category) {
                const rawValues: Array<{ id: number; dataCategoryId: number; value: string }> =
                    await churchtoolsClient.get(
                        `/custommodules/${moduleId}/customdatacategories/${category.id}/customdatavalues`
                    );

                let loadedEntries = rawValues.map(rawVal => {
                    const entry = JSON.parse(rawVal.value) as TimeEntry;
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
                }, moduleId);
                entries.value = [];
            }
        } catch (e) {
            console.error('Failed to load entries', e);
            error.value = 'Failed to load entries';
        } finally {
            isLoading.value = false;
        }
    }

    async function clockIn(moduleId: number, categoryId: string, description: string, isBreak: boolean = false) {
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
                }, moduleId);
            }

            entries.value.unshift(newEntry);
            // activeEntry computed will update automatically
        } catch (e) {
            console.error('Clock in failed', e);
            throw e;
        }
    }

    async function saveManualEntry(moduleId: number, entryData: Partial<TimeEntry>, originalEntry?: TimeEntry) {
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
                    }, moduleId);

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
                }, moduleId);

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

    async function deleteTimeEntry(moduleId: number, entry: TimeEntry) {
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
                await deleteCustomDataValue(cat.id, (match as any).id, moduleId);

                // Remove from local state
                entries.value = entries.value.filter(e => e.startTime !== entry.startTime);
            }
        } catch (e) {
            console.error('Failed to delete entry', e);
            throw e;
        }
    }

    async function saveWorkCategory(moduleId: number, categoryData: Partial<WorkCategory>) {
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
                }, moduleId);

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
                }, moduleId);

                // Update local
                workCategories.value.push({ ...payload, kvStoreId: res.id });
            }
        } catch (e) {
            console.error('Failed to save category', e);
            throw e;
        }
    }

    async function deleteWorkCategory(moduleId: number, categoryId: string) {
        try {
            const cat = await getCustomDataCategory<object>('workcategories');
            if (!cat) throw new Error('Work Categories container not found');

            const category = workCategories.value.find(c => c.id === categoryId);
            if (!category || !category.kvStoreId) {
                throw new Error('Category not found or cannot be deleted');
            }

            await deleteCustomDataValue(cat.id, category.kvStoreId, moduleId);

            // Update local
            workCategories.value = workCategories.value.filter(c => c.id !== categoryId);
        } catch (e) {
            console.error('Failed to delete category', e);
            throw e;
        }
    }

    // Helper: Map KV ID to entry for easier updates (Refactor needed later for optimization)
    // For now we do the lookup in delete/update

    async function clockOut(moduleId: number) {
        if (!activeEntry.value) return;
        const entryToUpdate = { ...activeEntry.value }; // Copy
        entryToUpdate.endTime = new Date().toISOString();

        try {
            const cat = await getCustomDataCategory<object>('timeentries');
            if (cat) {
                const allValues = await getCustomDataValues<TimeEntry>(cat.id, moduleId);
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
                        { value: JSON.stringify(entryToUpdate) },
                        moduleId
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
        const settingsStore = useSettingsStore();
        if (settingsStore.moduleId) {
            loadTimeEntries(settingsStore.moduleId);
        }
    }

    async function loadActivityLogs(moduleId: number) {
        try {
            const cat = await getCustomDataCategory<object>('activitylogs');
            if (cat) {
                const rawValues = await getCustomDataValues<ActivityLog>(cat.id, moduleId);
                // Sort by newest first
                activityLogs.value = rawValues.sort((a, b) => b.timestamp - a.timestamp);
            } else {
                activityLogs.value = [];
            }
        } catch (e) {
            console.error('Failed to load activity logs', e);
        }
    }

    async function cleanOldActivityLogs(moduleId: number, daysToKeep: number) {
        try {
            const cat = await getCustomDataCategory<object>('activitylogs');
            if (!cat) return;

            const cutoff = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
            const rawValues = await getCustomDataValues<ActivityLog>(cat.id, moduleId);

            const toDelete = rawValues.filter(l => l.timestamp < cutoff);

            for (const log of toDelete) {
                // Iterate and delete (could be slow but safe for now)
                if ((log as any).id) {
                    await deleteCustomDataValue(cat.id, (log as any).id, moduleId);
                }
            }

            // Refresh
            await loadActivityLogs(moduleId);
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

    async function bulkDeleteEntries(moduleId: number, entryIds: string[]) {
        try {
            const cat = await getCustomDataCategory<object>('timeentries');
            if (!cat) throw new Error('Category not found');

            const allValues = await getCustomDataValues<TimeEntry>(cat.id, moduleId);

            for (const entryId of entryIds) {
                const match = allValues.find(v => v.startTime === entryId);
                if (match) {
                    await deleteCustomDataValue(cat.id, (match as any).id, moduleId);
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

    async function bulkUpdateEntries(moduleId: number, entryIds: string[], updates: Partial<TimeEntry>) {
        try {
            const cat = await getCustomDataCategory<object>('timeentries');
            if (!cat) throw new Error('Category not found');

            const allValues = await getCustomDataValues<TimeEntry>(cat.id, moduleId);

            for (const entryId of entryIds) {
                const match = allValues.find(v => v.startTime === entryId);
                if (match) {
                    const updated = { ...match, ...updates };
                    await updateCustomDataValue(cat.id, (match as any).id, {
                        value: JSON.stringify(updated)
                    }, moduleId);

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
        if (filteredEntries.value.length === 0) return;

        try {
            // Use local XLSX import
            const data = filteredEntries.value.map(e => {
                const startDate = parseISO(e.startTime);
                const endDate = e.endTime ? parseISO(e.endTime) : null;
                const durationMs = endDate ? differenceInMilliseconds(endDate, startDate) : 0;

                return {
                    'Date': format(startDate, 'yyyy-MM-dd'),
                    'Start': format(startDate, 'HH:mm'),
                    'End': endDate ? format(endDate, 'HH:mm') : '...',
                    'Category': e.categoryName,
                    'Description': e.description,
                    'Duration (h)': Number((durationMs / 3600000).toFixed(2)),
                    'Is Break': e.isBreak ? 'Yes' : 'No',
                    'User': e.userName || e.userId
                };
            });

            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Time Entries');

            // Generate XLSX file
            XLSX.writeFile(workbook, `time-entries-export-${format(new Date(), 'yyyy-MM-dd-HHmm')}.xlsx`);
        } catch (err) {
            console.error('Export failed:', err);
        }
    }

    function exportToPDF() {
        if (filteredEntries.value.length === 0) return;

        try {
            const doc = new jsPDF();
            const user = authStore.user;
            const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'User';

            // Title
            doc.setFontSize(18);
            doc.text('Time Tracker Report', 14, 22);

            doc.setFontSize(11);
            doc.setTextColor(100);

            // Header Info
            doc.text(`User: ${userName}`, 14, 32);
            doc.text(`Generated: ${format(new Date(), 'dd.MM.yyyy HH:mm')}`, 14, 38);

            // Period
            if (dateRange.value.start && dateRange.value.end) {
                const period = `${format(dateRange.value.start, 'dd.MM.yyyy')} - ${format(dateRange.value.end, 'dd.MM.yyyy')}`;
                doc.text(`Period: ${period}`, 14, 44);
            }

            // Summary Stats
            const stats = categoryStats.value;
            const totalHours = stats.reduce((acc, curr) => acc + curr.totalHours, 0);

            doc.setFontSize(14);
            doc.setTextColor(0);
            doc.text('Summary', 14, 55);

            doc.setFontSize(11);
            doc.text(`Total working hours: ${totalHours.toFixed(1)}h`, 14, 62);

            let yPos = 70;
            stats.forEach(stat => {
                doc.text(`${stat.name}: ${stat.totalHours.toFixed(1)}h`, 20, yPos);
                yPos += 6;
            });

            // Table
            const tableData = filteredEntries.value.map(e => {
                const startDate = parseISO(e.startTime);
                const endDate = e.endTime ? parseISO(e.endTime) : null;
                const durationMs = endDate ? differenceInMilliseconds(endDate, startDate) : 0;

                return [
                    format(startDate, 'dd.MM.yyyy'),
                    format(startDate, 'HH:mm'),
                    endDate ? format(endDate, 'HH:mm') : '...',
                    e.categoryName,
                    e.description || '-',
                    (durationMs / 3600000).toFixed(2) + 'h',
                    e.userName || '-'
                ];
            });

            autoTable(doc, {
                startY: yPos + 5,
                head: [['Date', 'Start', 'End', 'Category', 'Description', 'Duration', 'User']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [0, 123, 255] }
            });

            doc.save(`time-tracker-report-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`);
        } catch (err) {
            console.error('PDF Export failed:', err);
        }
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
        categoryStats,
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
