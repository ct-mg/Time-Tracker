<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useTimeEntriesStore } from '../stores/time-entries.store';
import { formatDuration } from '../utils/date';
import { format } from 'date-fns';
import BaseCard from './base/BaseCard.vue';
import BaseBadge from './base/BaseBadge.vue';

const store = useTimeEntriesStore();
const { t } = useI18n();

// Get latest 5 completed entries
const recentEntries = computed(() => {
    return store.entries
        .filter(e => e.endTime) // Only completed entries
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
        .slice(0, 5);
});

// Group by date
const groupedEntries = computed(() => {
    const groups = new Map<string, typeof recentEntries.value>();
    
    recentEntries.value.forEach(entry => {
        const date = format(new Date(entry.startTime), 'yyyy-MM-dd');
        if (!groups.has(date)) {
            groups.set(date, []);
        }
        groups.get(date)!.push(entry);
    });

    return Array.from(groups.entries()).map(([date, entries]) => ({
        date,
        dateFormatted: format(new Date(date), 'EEEE, d. MMMM yyyy'),
        entries
    }));
});

function formatTime(isoString: string): string {
    return format(new Date(isoString), 'HH:mm');
}

function getDuration(entry: typeof recentEntries.value[0]): string {
    if (!entry.endTime) return '-';
    const ms = new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime();
    return formatDuration(ms);
}

function getCategoryColor(entry: typeof recentEntries.value[0]): string {
    const category = store.workCategories.find(c => c.id === entry.categoryId);
    return category?.color || '#cccccc';
}
</script>

<template>
    <BaseCard padding="md">
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-bold text-gray-900 dark:text-white">{{ t('ct.extension.timetracker.dashboard.recentEntries') }}</h2>
            <a 
                href="#" 
                @click.prevent="$emit('viewAll')"
                class="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
            >
                {{ t('ct.extension.timetracker.dashboard.viewAllEntries') }} →
            </a>
        </div>

        <div v-if="recentEntries.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
            <svg class="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <p>{{ t('ct.extension.timetracker.dashboard.noRecentEntries') }}</p>
        </div>

        <div v-else class="space-y-4">
            <div v-for="group in groupedEntries" :key="group.date">
                <!-- Date Header -->
                <div class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    {{ group.dateFormatted }}
                </div>

                <!-- Entries for this date -->
                <div class="space-y-2">
                    <div 
                        v-for="entry in group.entries" 
                        :key="entry.startTime"
                        class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <div class="flex items-center gap-3 flex-1 min-w-0">
                            <!-- Category Color Indicator -->
                            <div 
                                class="w-1 h-10 rounded-full flex-shrink-0"
                                :style="{ backgroundColor: getCategoryColor(entry) }"
                            ></div>

                            <!-- Entry Info -->
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2 mb-1">
                                    <span class="font-medium text-gray-900 dark:text-white truncate">
                                        {{ entry.categoryName }}
                                    </span>
                                    <BaseBadge v-if="entry.isBreak" variant="warning" size="sm">
                                        {{ t('ct.extension.timetracker.timeEntries.break') }}
                                    </BaseBadge>
                                </div>
                                <p v-if="entry.description" class="text-sm text-gray-600 dark:text-gray-400 truncate">
                                    {{ entry.description }}
                                </p>
                            </div>
                        </div>

                        <!-- Time & Duration -->
                        <div class="text-right flex-shrink-0 ml-4">
                            <div class="text-sm font-medium text-gray-900 dark:text-white">
                                {{ formatTime(entry.startTime) }} - {{ formatTime(entry.endTime!) }}
                            </div>
                            <div class="text-xs text-gray-500 dark:text-gray-400">
                                {{ getDuration(entry) }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </BaseCard>
</template>
