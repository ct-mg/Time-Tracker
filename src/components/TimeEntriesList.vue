<script setup lang="ts">
import { computed } from 'vue';
import { useTimeEntries } from '../composables/useTimeEntries';
import { useTimeEntriesStore } from '../stores/time-entries.store';
import { useSettingsStore } from '../stores/settings.store';
import TimeEntryItem from './TimeEntryItem.vue';
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
    </div>
</template>
