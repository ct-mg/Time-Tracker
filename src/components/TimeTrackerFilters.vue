<script setup lang="ts">
import { computed } from 'vue';
import { useTimeEntriesStore } from '../stores/time-entries.store';
import type { GroupingMode } from '../types/time-tracker';

const store = useTimeEntriesStore();

// Options
const groupingOptions: { label: string; value: GroupingMode }[] = [
    { label: 'Day', value: 'day' },
    { label: 'Week', value: 'week' },
    { label: 'Month', value: 'month' }
];

const datePresets = [
    { label: 'This Week', action: () => setDateRange('week', 0) },
    { label: 'Last Week', action: () => setDateRange('week', -1) },
    { label: 'This Month', action: () => setDateRange('month', 0) },
    { label: 'Last Month', action: () => setDateRange('month', -1) }
];

// Helper to set date range
function setDateRange(type: 'week' | 'month', offset: number) {
    const now = new Date();
    let start, end;
    
    if (type === 'week') {
         // Simple week calc (assuming Monday start)
        const d = new Date(now);
        const day = d.getDay(); 
        const diff = d.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
        const monday = new Date(d.setDate(diff));
        
        // Add offset weeks
        monday.setDate(monday.getDate() + (offset * 7));
        
        start = new Date(monday);
        end = new Date(monday);
        end.setDate(end.getDate() + 6);
    } else {
        // Month
        start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
        end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
    }
    
    // Set hours
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);
    
    store.dateRange = { start, end };
}

// Categories for filter
const categories = computed(() => store.workCategories);

// Handle category toggle
function toggleCategory(catId: string) {
    const current = store.selectedCategoryIds;
    if (current.includes(catId)) {
        store.selectedCategoryIds = current.filter(id => id !== catId);
    } else {
        store.selectedCategoryIds = [...current, catId];
    }
}
</script>

<template>
    <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6 space-y-4">
        <!-- Top Row: Search & Presets -->
        <div class="flex flex-col md:flex-row gap-4 justify-between">
            <!-- Search -->
            <div class="relative flex-grow max-w-md">
                <input 
                    v-model="store.searchTerm"
                    type="text" 
                    placeholder="Search entries..." 
                    class="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:text-white dark:border-gray-600 pl-10 focus:ring-2 focus:ring-blue-500"
                />
                <svg class="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
            </div>

            <!-- Grouping Toggle -->
            <div class="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button 
                    v-for="opt in groupingOptions" 
                    :key="opt.value"
                    @click="store.groupingMode = opt.value"
                    :class="['px-3 py-1.5 text-sm font-medium rounded-md transition-colors', 
                             store.groupingMode === opt.value 
                                ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' 
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200']"
                >
                    {{ opt.label }}
                </button>
            </div>
        </div>

        <!-- Bottom Row: Filters -->
        <div class="flex flex-wrap gap-4 items-center pt-2 border-t border-gray-100 dark:border-gray-700">
            <span class="text-sm font-medium text-gray-500 dark:text-gray-400">Filters:</span>
            
            <!-- Date Presets -->
            <div class="flex gap-2">
                <button 
                    v-for="preset in datePresets" 
                    :key="preset.label"
                    @click="preset.action"
                    class="px-3 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 transition-colors"
                >
                    {{ preset.label }}
                </button>
                <button 
                    @click="store.dateRange = { start: null, end: null }"
                    v-if="store.dateRange.start"
                    class="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                >
                    Clear Dates
                </button>
            </div>

            <!-- Category Filter -->
            <div class="flex flex-wrap gap-2 ml-auto">
                <button
                    v-for="cat in categories"
                    :key="cat.id"
                    @click="toggleCategory(cat.id)"
                    :class="['px-2 py-1 text-xs rounded border transition-colors flex items-center gap-1', 
                             store.selectedCategoryIds.includes(cat.id)
                             ? 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300'
                             : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400']"
                >
                    <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: cat.color }"></span>
                    {{ cat.name }}
                </button>
            </div>
        </div>
    </div>
</template>
