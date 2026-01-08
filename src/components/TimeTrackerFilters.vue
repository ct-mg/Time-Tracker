<script setup lang="ts">
import { computed } from 'vue';
import { useTimeEntriesStore } from '../stores/time-entries.store';
import type { GroupingMode } from '../types/time-tracker';
import { 
    startOfDay, endOfDay, 
    startOfWeek, endOfWeek, 
    startOfMonth, endOfMonth, 
    startOfYear, endOfYear,
    subDays, subWeeks, subMonths, subYears,
    parseISO, format
} from 'date-fns';
import UserFilter from './UserFilter.vue';

const props = withDefaults(defineProps<{
    showGrouping?: boolean
}>(), {
    showGrouping: true
});

const store = useTimeEntriesStore();

// Computed for date inputs
const startDateStr = computed({
    get: () => store.dateRange.start ? format(store.dateRange.start, 'yyyy-MM-dd') : '',
    set: (val: string) => {
        if (!val) {
            store.dateRange = { ...store.dateRange, start: null };
            return;
        }
        store.dateRange = { ...store.dateRange, start: startOfDay(parseISO(val)) };
    }
});

const endDateStr = computed({
    get: () => store.dateRange.end ? format(store.dateRange.end, 'yyyy-MM-dd') : '',
    set: (val: string) => {
        if (!val) {
            store.dateRange = { ...store.dateRange, end: null };
            return;
        }
        store.dateRange = { ...store.dateRange, end: endOfDay(parseISO(val)) };
    }
});

// Options
const groupingOptions: { label: string; value: GroupingMode }[] = [
    { label: 'Day', value: 'day' },
    { label: 'Week', value: 'week' },
    { label: 'Month', value: 'month' }
];

const datePresets = [
    { label: 'Today', action: () => setDateRange('today') },
    { label: 'This Week', action: () => setDateRange('week', 0) },
    { label: 'Last Week', action: () => setDateRange('week', -1) },
    { label: 'This Month', action: () => setDateRange('month', 0) },
    { label: 'Last Month', action: () => setDateRange('month', -1) },
    { label: 'This Year', action: () => setDateRange('year', 0) },
    { label: 'Last Year', action: () => setDateRange('year', -1) },
    { label: 'Last 365 Days', action: () => setDateRange('last365') }
];

// Helper to set date range
function setDateRange(type: 'today' | 'week' | 'month' | 'year' | 'last365', offset: number = 0) {
    const now = new Date();
    let start: Date, end: Date;
    
    switch (type) {
        case 'today':
            start = startOfDay(now);
            end = endOfDay(now);
            break;
        case 'week': {
            const base = offset === 0 ? now : subWeeks(now, Math.abs(offset));
            start = startOfWeek(base, { weekStartsOn: 1 });
            end = endOfWeek(base, { weekStartsOn: 1 });
            break;
        }
        case 'month': {
            const base = offset === 0 ? now : subMonths(now, Math.abs(offset));
            start = startOfMonth(base);
            end = endOfMonth(base);
            break;
        }
        case 'year': {
            const base = offset === 0 ? now : subYears(now, Math.abs(offset));
            start = startOfYear(base);
            end = endOfYear(base);
            break;
        }
        case 'last365':
            start = startOfDay(subDays(now, 365));
            end = endOfDay(now);
            break;
        default:
            return;
    }
    
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
            
            <UserFilter />

            <!-- Grouping Toggle -->
            <div v-if="props.showGrouping !== false" class="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
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
        <div class="flex flex-wrap gap-6 items-end pt-2 border-t border-gray-100 dark:border-gray-700">
            <!-- Custom Date Range -->
            <div class="flex items-center gap-3">
                <span class="text-sm font-medium text-gray-500 dark:text-gray-400">Range:</span>
                <div class="flex items-center gap-2">
                    <input 
                        type="date" 
                        v-model="startDateStr"
                        class="px-2 py-1 text-xs border rounded-md dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span class="text-gray-400">-</span>
                    <input 
                        type="date" 
                        v-model="endDateStr"
                        class="px-2 py-1 text-xs border rounded-md dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            <!-- Date Presets -->
            <div class="flex flex-col gap-1">
                <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Presets</span>
                <div class="flex flex-wrap gap-1.5">
                    <button 
                        v-for="preset in datePresets" 
                        :key="preset.label"
                        @click="preset.action"
                        class="px-2.5 py-1 text-[11px] font-medium rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 transition-colors"
                    >
                        {{ preset.label }}
                    </button>
                    <button 
                        @click="store.dateRange = { start: null, end: null }"
                        v-if="store.dateRange.start || store.dateRange.end"
                        class="px-2.5 py-1 text-[11px] font-medium rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                    >
                        Reset
                    </button>
                </div>
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
