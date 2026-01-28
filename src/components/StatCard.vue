<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import BaseCard from './base/BaseCard.vue';

defineProps<{
    title: string;
    actual: number;
    target: number;
    progress: number;
    isLoading?: boolean;
}>();

const { t } = useI18n();

function formatHours(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
}

function getProgressColor(progress: number): string {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 80) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-blue-400';
}
</script>

<template>
    <BaseCard padding="md" hoverable>
        <div class="space-y-3">
            <div class="flex justify-between items-start">
                <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ title }}</h3>
                <div class="text-right">
                    <div class="text-2xl font-bold text-gray-900 dark:text-white">
                        {{ formatHours(actual) }}
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {{ t('ct.extension.timetracker.dashboard.stats.actual') }} / {{ t('ct.extension.timetracker.dashboard.stats.target') }} ({{ formatHours(target) }})
                    </p>
                </div>
            </div>

            <!-- Progress Bar -->
            <div class="space-y-1">
                <div class="flex justify-between text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                    <span>{{ t('ct.extension.timetracker.dashboard.stats.progress') }}</span>
                    <span>{{ Math.round(progress) }}%</span>
                </div>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div 
                        :class="['h-full transition-all duration-300', getProgressColor(progress)]"
                        :style="{ width: `${Math.min(100, progress)}%` }"
                    ></div>
                </div>
            </div>

            <div class="text-xs">
                <span v-if="progress < 100" class="text-gray-500">
                    {{ t('ct.extension.timetracker.dashboard.stats.status.hoursLeft', { hours: formatHours(Math.max(0, target - actual)) }) }}
                </span>
                <span v-else class="text-green-600 dark:text-green-400 font-medium">
                    {{ t('ct.extension.timetracker.dashboard.stats.status.onTrack') }}
                </span>
            </div>
        </div>
    </BaseCard>
</template>
