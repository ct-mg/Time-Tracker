<script setup lang="ts">
import { useStatistics } from '../composables/useStatistics';
import { useI18n } from 'vue-i18n';
import BaseCard from './base/BaseCard.vue';

const { todayStats, thisWeekStats, thisMonthStats, lastMonthStats } = useStatistics();
const { t } = useI18n();

function formatHours(hours: number): string {
    return `${hours.toFixed(1)}h`;
}

function getProgressColor(progress: number): string {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-yellow-500';
    return 'bg-red-500';
}
</script>

<template>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <!-- Today -->
        <BaseCard padding="md" hoverable>
            <div class="space-y-3">
                <div class="flex justify-between items-start">
                    <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ t('ct.extension.timetracker.dashboard.stats.today') }}</h3>
                    <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                </div>
                
                <div>
                    <div class="flex items-baseline gap-2">
                        <span class="text-2xl font-bold text-gray-900 dark:text-white">
                            {{ formatHours(todayStats.actual) }}
                        </span>
                        <span class="text-sm text-gray-500 dark:text-gray-400">
                            / {{ formatHours(todayStats.target) }}
                        </span>
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ t('ct.extension.timetracker.dashboard.stats.actual') }} / {{ t('ct.extension.timetracker.dashboard.stats.target') }}</p>
                </div>

                <!-- Progress Bar -->
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div 
                        :class="['h-full transition-all duration-300', getProgressColor(todayStats.progress)]"
                        :style="{ width: `${Math.min(todayStats.progress, 100)}%` }"
                    ></div>
                </div>

                <div class="flex justify-between text-xs">
                    <span :class="todayStats.isOnTrack ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                        {{ todayStats.progress.toFixed(0) }}%
                    </span>
                    <span v-if="!todayStats.isOnTrack" class="text-gray-500 dark:text-gray-400">
                        {{ formatHours(todayStats.remaining) }} {{ t('ct.extension.timetracker.dashboard.stats.remaining') }}
                    </span>
                    <span v-else class="text-green-600 dark:text-green-400 font-medium">
                        {{ t('ct.extension.timetracker.dashboard.stats.status.onTrack') }}
                    </span>
                </div>
            </div>
        </BaseCard>

        <!-- This Week -->
        <BaseCard padding="md" hoverable>
            <div class="space-y-3">
                <div class="flex justify-between items-start">
                    <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ t('ct.extension.timetracker.dashboard.stats.thisWeek') }}</h3>
                    <svg class="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                    </svg>
                </div>
                
                <div>
                    <div class="flex items-baseline gap-2">
                        <span class="text-2xl font-bold text-gray-900 dark:text-white">
                            {{ formatHours(thisWeekStats.actual) }}
                        </span>
                        <span class="text-sm text-gray-500 dark:text-gray-400">
                            / {{ formatHours(thisWeekStats.target) }}
                        </span>
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ t('ct.extension.timetracker.dashboard.stats.actual') }} / {{ t('ct.extension.timetracker.dashboard.stats.target') }}</p>
                </div>

                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div 
                        :class="['h-full transition-all duration-300', getProgressColor(thisWeekStats.progress)]"
                        :style="{ width: `${Math.min(thisWeekStats.progress, 100)}%` }"
                    ></div>
                </div>

                <div class="flex justify-between text-xs">
                    <span :class="thisWeekStats.isOnTrack ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                        {{ thisWeekStats.progress.toFixed(0) }}%
                    </span>
                    <span v-if="!thisWeekStats.isOnTrack" class="text-gray-500 dark:text-gray-400">
                        {{ formatHours(thisWeekStats.remaining) }} {{ t('ct.extension.timetracker.dashboard.stats.remaining') }}
                    </span>
                    <span v-else class="text-green-600 dark:text-green-400 font-medium">
                        {{ t('ct.extension.timetracker.dashboard.stats.status.onTrack') }}
                    </span>
                </div>
            </div>
        </BaseCard>

        <!-- This Month -->
        <BaseCard padding="md" hoverable>
            <div class="space-y-3">
                <div class="flex justify-between items-start">
                    <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ t('ct.extension.timetracker.dashboard.stats.thisMonth') }}</h3>
                    <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                </div>
                
                <div>
                    <div class="flex items-baseline gap-2">
                        <span class="text-2xl font-bold text-gray-900 dark:text-white">
                            {{ formatHours(thisMonthStats.actual) }}
                        </span>
                        <span class="text-sm text-gray-500 dark:text-gray-400">
                            / {{ formatHours(thisMonthStats.target) }}
                        </span>
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ t('ct.extension.timetracker.dashboard.stats.actual') }} / {{ t('ct.extension.timetracker.dashboard.stats.target') }}</p>
                </div>

                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div 
                        :class="['h-full transition-all duration-300', getProgressColor(thisMonthStats.progress)]"
                        :style="{ width: `${Math.min(thisMonthStats.progress, 100)}%` }"
                    ></div>
                </div>

                <div class="flex justify-between text-xs">
                    <span :class="thisMonthStats.isOnTrack ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                        {{ thisMonthStats.progress.toFixed(0) }}%
                    </span>
                    <span v-if="!thisMonthStats.isOnTrack" class="text-gray-500 dark:text-gray-400">
                        {{ formatHours(thisMonthStats.remaining) }} {{ t('ct.extension.timetracker.dashboard.stats.remaining') }}
                    </span>
                    <span v-else class="text-green-600 dark:text-green-400 font-medium">
                        {{ t('ct.extension.timetracker.dashboard.stats.status.onTrack') }}
                    </span>
                </div>
            </div>
        </BaseCard>

        <!-- Last Month -->
        <BaseCard padding="md" hoverable>
            <div class="space-y-3">
                <div class="flex justify-between items-start">
                    <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ t('ct.extension.timetracker.dashboard.stats.lastMonth') }}</h3>
                    <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                    </svg>
                </div>
                
                <div>
                    <div class="flex items-baseline gap-2">
                        <span class="text-2xl font-bold text-gray-900 dark:text-white">
                            {{ formatHours(lastMonthStats.actual) }}
                        </span>
                        <span class="text-sm text-gray-500 dark:text-gray-400">
                            / {{ formatHours(lastMonthStats.target) }}
                        </span>
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ t('ct.extension.timetracker.dashboard.stats.actual') }} / {{ t('ct.extension.timetracker.dashboard.stats.target') }}</p>
                </div>

                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div 
                        :class="['h-full transition-all duration-300', getProgressColor(lastMonthStats.progress)]"
                        :style="{ width: `${Math.min(lastMonthStats.progress, 100)}%` }"
                    ></div>
                </div>

                <div class="flex justify-between text-xs">
                    <span :class="lastMonthStats.isOnTrack ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                        {{ lastMonthStats.progress.toFixed(0) }}%
                    </span>
                    <span v-if="!lastMonthStats.isOnTrack" class="text-gray-500 dark:text-gray-400">
                        {{ formatHours(lastMonthStats.remaining) }} {{ t('ct.extension.timetracker.dashboard.stats.remaining') }}
                    </span>
                    <span v-else class="text-green-600 dark:text-green-400 font-medium">
                        {{ t('ct.extension.timetracker.dashboard.stats.status.complete') }}
                    </span>
                </div>
            </div>
        </BaseCard>
    </div>
</template>
