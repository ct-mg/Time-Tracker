import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import type { TimeEntry, WorkCategory } from '../types/time-tracker';
import { useSettingsStore } from './settings.store';
import { useAuthStore } from './auth.store';
import {
    getCustomDataCategory,
    getCustomDataValues,
    createCustomDataValue,
    updateCustomDataValue,
    createCustomDataCategory,
    deleteCustomDataValue
} from '../services/kv-store';

export const useTimeEntriesStore = defineStore('timeEntries', () => {
    const entries = ref<TimeEntry[]>([]);
    const workCategories = ref<WorkCategory[]>([]);
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    const settingsStore = useSettingsStore();
    const authStore = useAuthStore();

    // Getters
    const activeEntry = computed(() => {
        return entries.value.find(entry => entry.endTime === null && entry.userId === authStore.user?.id) || null;
    });

    const sortedEntries = computed(() => {
        return [...entries.value].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    });

    // Helper: Create settings snapshot
    function createSettingsSnapshot(userId: number): TimeEntry['settingsSnapshot'] {
        const settings = settingsStore.settings;

        // Priority 1: User-specific settings from store
        const userConfig = settings.userHoursConfig?.find((u) => u.userId === userId);

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

                    return entry;
                });

                // Filter based on permissions
                // Filter based on permissions
                const user = authStore.user;
                if (user) {
                    const permissions = authStore.permissions;

                    if (permissions.canSeeAllEntries) {
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

    return {
        entries,
        workCategories,
        isLoading,
        error,
        activeEntry,
        sortedEntries,
        loadWorkCategories,
        loadTimeEntries,
        clockIn,
        clockOut,
        deleteTimeEntry,
        saveManualEntry
    };
});
