<script setup lang="ts">
import { useTimeEntriesStore } from '../stores/time-entries.store';
import { useI18n } from 'vue-i18n';
import StatCard from './StatCard.vue';
import StatisticsCardsSkeleton from './skeletons/StatisticsCardsSkeleton.vue';

const store = useTimeEntriesStore();
const { t } = useI18n();
</script>

<template>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <template v-if="store.isLoading">
            <StatisticsCardsSkeleton />
        </template>
        <template v-else>
            <StatCard 
                :title="t('ct.extension.timetracker.dashboard.stats.today')"
                :actual="store.todayStats.actual"
                :target="store.todayStats.target"
                :progress="store.todayStats.progress"
                :is-on-track="store.todayStats.isOnTrack"
                :remaining="store.todayStats.remaining"
            />
            <StatCard 
                :title="t('ct.extension.timetracker.dashboard.stats.thisWeek')"
                :actual="store.thisWeekStats.actual"
                :target="store.thisWeekStats.target"
                :progress="store.thisWeekStats.progress"
                :is-on-track="store.thisWeekStats.isOnTrack"
                :remaining="store.thisWeekStats.remaining"
            />
            <StatCard 
                :title="t('ct.extension.timetracker.dashboard.stats.thisMonth')"
                :actual="store.thisMonthStats.actual"
                :target="store.thisMonthStats.target"
                :progress="store.thisMonthStats.progress"
                :is-on-track="store.thisMonthStats.isOnTrack"
                :remaining="store.thisMonthStats.remaining"
            />
            <StatCard 
                :title="t('ct.extension.timetracker.dashboard.stats.lastMonth')"
                :actual="store.lastMonthStats.actual"
                :target="store.lastMonthStats.target"
                :progress="store.lastMonthStats.progress"
                :is-on-track="store.lastMonthStats.isOnTrack"
                :remaining="store.lastMonthStats.remaining"
            />
        </template>
    </div>
</template>
