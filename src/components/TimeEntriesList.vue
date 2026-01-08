<script setup lang="ts">
import { computed } from 'vue';
import { useTimeEntries } from '../composables/useTimeEntries';
import { useTimeEntriesStore } from '../stores/time-entries.store';
import { useSettingsStore } from '../stores/settings.store';
import TimeEntryItem from './TimeEntryItem.vue';
import BulkActionsToolbar from './BulkActionsToolbar.vue';
import { listTransition } from '../utils/animations';

const { groupedEntries } = useTimeEntries();
const store = useTimeEntriesStore();
const settingsStore = useSettingsStore();

const workCategories = computed(() => store.workCategories);

const emit = defineEmits<{
    (e: 'edit', entry: any): void;
}>();

function handleEdit(entry: any) {
    emit('edit', entry);
}

// Select All functionality
const allVisibleEntryIds = computed(() => {
    const ids: string[] = [];
    groupedEntries.value.forEach(group => {
        group.sortedDays.forEach(day => {
            day.entries.forEach(entry => {
                if (entry.endTime) { // Only selectable if not active
                    ids.push(entry.startTime);
                }
            });
        });
    });
    return ids;
});

const allSelected = computed(() => {
    if (allVisibleEntryIds.value.length === 0) return false;
    return allVisibleEntryIds.value.every(id => store.selectedEntryIds.includes(id));
});

const someSelected = computed(() => {
    return store.selectedEntryIds.length > 0 && !allSelected.value;
});

function toggleSelectAll() {
    if (allSelected.value) {
        store.clearSelection();
    } else {
        store.selectAll(allVisibleEntryIds.value);
    }
}

async function handleDelete(entry: any) {
    if (confirm('Are you sure you want to delete this entry?')) {
        try {
            const moduleId = settingsStore.moduleId; // Assuming this is available
            if (moduleId) {
                await store.deleteTimeEntry(moduleId, entry);
            }
        } catch (e) {
            alert('Failed to delete entry');
        }
    }
}
</script>

<template>
    <div class="space-y-6">
        <div v-if="groupedEntries.length === 0" class="text-center p-8 text-gray-500 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            No entries found matching your filters.
        </div>

        <TransitionGroup 
            name="list"
            tag="div"
            class="space-y-6"
            v-bind="listTransition"
        >
            <div 
                v-for="group in groupedEntries" 
                :key="group.key" 
                class="bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 transition-all duration-200 hover:shadow-md"
            >
            <!-- Group Header (Week/Month/Day) -->
            <div class="flex justify-between items-center mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                <h3 class="text-lg font-bold text-gray-800 dark:text-white">
                    {{ group.title }} <span v-if="group.subTitle" class="text-gray-500 font-normal">{{ group.subTitle }}</span>
                </h3>
                <div class="flex gap-4 text-sm">
                    <span class="text-gray-600 dark:text-gray-300">
                        Actual: 
                        <span :class="group.totalMs >= group.targetMs ? 'text-green-600 dark:text-green-400 font-bold' : 'text-red-600 dark:text-red-400'">
                            {{ group.totalDisplay }}
                        </span>
                    </span>
                    <span class="text-gray-500">
                        Target: <span class="font-medium">{{ group.targetDisplay }}</span>
                    </span>
                </div>
            </div>

            <!-- Days -->
            <div class="space-y-4">
                <div v-for="day in group.sortedDays" :key="day.date" class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                    <!-- Day Header -->
                    <div class="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <h4 class="font-semibold text-gray-700 dark:text-gray-200">
                            {{ new Date(day.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}
                        </h4>
                        <div class="flex gap-4 text-xs">
                             <span class="text-gray-600 dark:text-gray-400">
                                Actual: 
                                <span :class="{
                                    'text-green-600 dark:text-green-400 font-bold': day.dayTotalMs >= day.dayTargetMs,
                                    'text-red-600 dark:text-red-400': day.dayTotalMs < day.dayTargetMs && day.isWorkDay,
                                    'text-gray-500': !day.isWorkDay
                                }">
                                    {{ day.dayTotalDisplay }}
                                </span>
                            </span>
                             <span class="text-gray-500">Target: {{ day.dayTargetDisplay }}</span>
                        </div>
                    </div>

                    <!-- Entries Table -->
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700 text-xs text-gray-500 uppercase tracking-wider">
                                    <th class="p-3 w-12">
                                        <input 
                                            type="checkbox" 
                                            :checked="allSelected"
                                            :indeterminate.prop="someSelected"
                                            @change="toggleSelectAll"
                                            class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 cursor-pointer"
                                            title="Select All"
                                        />
                                    </th>
                                    <th class="px-3 py-2">Start</th>
                                    <th class="px-3 py-2">End</th>
                                    <th class="px-3 py-2">Duration</th>
                                    <th class="px-3 py-2">Category</th>
                                    <th class="px-3 py-2">Description</th>
                                    <th class="px-3 py-2">Type</th>
                                    <th class="px-3 py-2 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <TimeEntryItem 
                                    v-for="entry in day.entries" 
                                    :key="entry.startTime" 
                                    :entry="entry" 
                                    :workCategories="workCategories"
                                    @edit="handleEdit"
                                    @delete="handleDelete"
                                />
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            </div>
        </TransitionGroup>

        <!-- Bulk Actions Toolbar -->
        <BulkActionsToolbar />
    </div>
</template>
