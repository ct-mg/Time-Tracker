<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useTimeEntriesStore } from '../stores/time-entries.store';
import BaseCard from './base/BaseCard.vue';
import TimeTrackerFilters from './TimeTrackerFilters.vue';
import UserFilter from './UserFilter.vue';

const store = useTimeEntriesStore();
const { t } = useI18n();

const stats = computed(() => store.categoryStats);
const totalHours = computed(() => {
    return stats.value.reduce((acc: number, curr: any) => acc + curr.totalHours, 0);
});

const maxHours = computed(() => {
    return Math.max(...stats.value.map((s: any) => s.totalHours), 1);
});


const handleExport = () => {
    store.exportToCSV();
};
</script>

<template>
    <div class="space-y-6">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">{{ t('ct.extension.timetracker.reports.titleFull') }}</h2>
            <button 
                @click="handleExport"
                class="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors text-sm font-medium flex items-center gap-2 shadow-sm"
                :disabled="store.filteredEntries.length === 0"
            >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                </svg>
                {{ t('ct.extension.timetracker.reports.exportCSV') }}
            </button>
        </div>
        
        <div class="flex justify-end mb-4">
            <UserFilter />
        </div>
        
        <TimeTrackerFilters :showGrouping="false" />

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                <div class="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">{{ t('ct.extension.timetracker.reports.totalHours') }}</div>
                <div class="text-3xl font-bold text-blue-900 dark:text-blue-100">{{ totalHours.toFixed(1) }}h</div>
            </div>
            <div class="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800">
                <div class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">{{ t('ct.extension.timetracker.reports.categories') }}</div>
                <div class="text-3xl font-bold text-emerald-900 dark:text-emerald-100">{{ stats.length }}</div>
            </div>
            <div class="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800">
                <div class="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">{{ t('ct.extension.timetracker.reports.entries') }}</div>
                <div class="text-3xl font-bold text-amber-900 dark:text-amber-100">{{ store.filteredEntries.length }}</div>
            </div>
            <div class="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-100 dark:border-purple-800">
                <div class="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-1">{{ t('ct.extension.timetracker.reports.avgPerEntry') }}</div>
                <div class="text-3xl font-bold text-purple-900 dark:text-purple-100">
                    {{ store.filteredEntries.length ? (totalHours / store.filteredEntries.length).toFixed(1) : 0 }}h
                </div>
            </div>
        </div>

        <BaseCard :title="t('ct.extension.timetracker.reports.distributionByCategory')">
            <div class="space-y-6">
                <div v-for="cat in stats" :key="cat.id" class="space-y-2">
                    <div class="flex justify-between items-end">
                        <div class="flex items-center gap-2">
                            <span class="w-3 h-3 rounded-full" :style="{ backgroundColor: cat.color }"></span>
                            <span class="font-medium text-gray-900 dark:text-white">{{ cat.name }}</span>
                        </div>
                        <div class="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {{ cat.totalHours.toFixed(1) }}h ({{ ((cat.totalHours / totalHours) * 100).toFixed(0) }}%)
                        </div>
                    </div>
                    <div class="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                            class="h-full rounded-full transition-all duration-500 ease-out"
                            :style="{ 
                                width: (cat.totalHours / maxHours * 100) + '%',
                                backgroundColor: cat.color
                            }"
                        ></div>
                    </div>
                </div>

                <div v-if="stats.length === 0" class="py-12 text-center text-gray-500 dark:text-gray-400">
                    {{ t('ct.extension.timetracker.reports.noData') }}
                </div>
            </div>
        </BaseCard>
    </div>
</template>
