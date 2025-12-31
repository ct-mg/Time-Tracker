<script setup lang="ts">
import { computed } from 'vue';
import { useTimeEntries } from '../composables/useTimeEntries';
import { useTimeEntriesStore } from '../stores/time-entries.store';
import { useSettingsStore } from '../stores/settings.store';
import TimeEntryItem from './TimeEntryItem.vue';

const { groupedEntries, searchTerm } = useTimeEntries();
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
        <!-- Search -->
        <div class="relative">
            <input 
                v-model="searchTerm"
                type="text" 
                placeholder="Search entries..." 
                class="w-full px-4 py-2 border rounded-md dark:bg-gray-800 dark:text-white dark:border-gray-700 pl-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg class="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
        </div>

        <div v-for="week in groupedEntries" :key="week.weekKey" class="bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <!-- Week Header -->
            <div class="flex justify-between items-center mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                <h3 class="text-lg font-bold text-gray-800 dark:text-white">
                    Week {{ week.weekNumber }} <span class="text-gray-500 font-normal">({{ week.year }})</span>
                </h3>
                <div class="flex gap-4 text-sm">
                    <span class="text-gray-600 dark:text-gray-300">
                        Actual: 
                        <span :class="week.weekTotalMs >= week.weekTargetMs ? 'text-green-600 dark:text-green-400 font-bold' : 'text-red-600 dark:text-red-400'">
                            {{ week.weekTotalDisplay }}
                        </span>
                    </span>
                    <span class="text-gray-500">
                        Target: <span class="font-medium">{{ week.weekTargetDisplay }}</span>
                    </span>
                </div>
            </div>

            <!-- Days -->
            <div class="space-y-4">
                <div v-for="day in week.sortedDays" :key="day.date" class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
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
    </div>
</template>
