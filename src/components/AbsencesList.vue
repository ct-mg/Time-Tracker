<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useAbsencesStore } from '../stores/absences.store';
import BaseCard from './base/BaseCard.vue';
import BaseButton from './base/BaseButton.vue';
import BaseBadge from './base/BaseBadge.vue';
import UserFilter from './UserFilter.vue';
import { format, parseISO, subDays, addDays, startOfYear, endOfYear, addYears, subYears } from 'date-fns';

const absencesStore = useAbsencesStore();

defineEmits(['add', 'edit', 'delete']);

onMounted(async () => {
    if (absencesStore.categories.length === 0) {
        await absencesStore.loadAbsenceCategories();
    }
    await absencesStore.loadAbsences();
});

// Watch for filter changes to reload data
watch(() => absencesStore.filters, () => {
    absencesStore.loadAbsences();
}, { deep: true });

const setPreset = (type: string) => {
    const now = new Date();
    if (type === 'default') {
        absencesStore.filters.from = format(subDays(now, 31), 'yyyy-MM-dd');
        absencesStore.filters.to = format(addDays(now, 365), 'yyyy-MM-dd');
    } else if (type === 'last-year') {
        const lastYear = subYears(now, 1);
        absencesStore.filters.from = format(startOfYear(lastYear), 'yyyy-MM-dd');
        absencesStore.filters.to = format(endOfYear(lastYear), 'yyyy-MM-dd');
    } else if (type === 'this-year') {
        absencesStore.filters.from = format(startOfYear(now), 'yyyy-MM-dd');
        absencesStore.filters.to = format(endOfYear(now), 'yyyy-MM-dd');
    } else if (type === 'next-year') {
        const nextYear = addYears(now, 1);
        absencesStore.filters.from = format(startOfYear(nextYear), 'yyyy-MM-dd');
        absencesStore.filters.to = format(endOfYear(nextYear), 'yyyy-MM-dd');
    }
};

const getCategoryName = (id: number) => {
    const cat = absencesStore.categories.find(c => c.id === id);
    return cat ? cat.name : 'Unknown';
};

const getCategoryColor = (id: number) => {
    const cat = absencesStore.categories.find(c => c.id === id);
    return cat ? cat.color : '#cccccc';
};

const formatDateRange = (absence: any) => {
    const start = parseISO(absence.startDate);
    const end = parseISO(absence.endDate);
    
    if (absence.startDate === absence.endDate) {
        let timeStr = format(start, 'dd.MM.yyyy');
        if (!absence.isFullDay && absence.startTime && absence.endTime) {
            timeStr += ` (${absence.startTime} - ${absence.endTime})`;
        }
        return timeStr;
    }
    
    return `${format(start, 'dd.MM.yyyy')} - ${format(end, 'dd.MM.yyyy')}`;
};
</script>

<template>
    <div class="space-y-4">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Absences</h2>
            <BaseButton variant="primary" size="sm" @click="$emit('add')" class="flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
                Add Absence
                Add Absence
            </BaseButton>
        </div>

        <!-- Filter Bar -->
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6 space-y-4">
            <!-- Top Controls -->
            <div class="flex justify-between items-center gap-4">
                <!-- Search -->
                <div class="relative flex-grow max-w-md">
                    <input 
                        v-model="absencesStore.filters.searchTerm"
                        type="text" 
                        placeholder="Search absences..." 
                        class="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:text-white dark:border-gray-600 pl-10 focus:ring-2 focus:ring-blue-500"
                    />
                    <svg class="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                </div>
                
                <UserFilter />
            </div>

            <div class="flex flex-wrap gap-4 items-end border-t border-gray-100 dark:border-gray-700 pt-4">
                <div>
                    <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">From</label>
                    <input 
                        type="date" 
                        v-model="absencesStore.filters.from"
                        class="px-3 py-1.5 text-sm border rounded-md dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">To</label>
                    <input 
                        type="date" 
                        v-model="absencesStore.filters.to"
                        class="px-3 py-1.5 text-sm border rounded-md dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div class="flex gap-2 pb-0.5">
                    <button 
                        @click="setPreset('default')"
                        class="px-3 py-1.5 text-xs font-medium rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                        Default
                    </button>
                    <button 
                        @click="setPreset('last-year')"
                        class="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                    >
                        Last Year
                    </button>
                    <button 
                        @click="setPreset('this-year')"
                        class="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                    >
                        This Year
                    </button>
                    <button 
                        @click="setPreset('next-year')"
                        class="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:hover:bg-blue-900/50 transition-colors"
                    >
                        Next Year
                    </button>
                </div>
            </div>
        </div>

        <div v-if="absencesStore.isLoading" class="flex justify-center py-12">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>

        <div v-else-if="absencesStore.filteredAbsences.length === 0" class="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
            <svg class="w-12 h-12 mx-auto mb-4 text-gray-400 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            <p class="text-gray-500 dark:text-gray-400">No absences found for this period.</p>
        </div>

        <div v-else class="grid gap-4">
            <BaseCard v-for="absence in absencesStore.filteredAbsences" :key="absence.id" padding="md">
                <div class="flex justify-between items-start">
                    <div class="flex items-start gap-4">
                        <div 
                            class="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                            :style="{ backgroundColor: getCategoryColor(absence.absenceReasonId) }"
                        >
                            {{ absencesStore.categories.find(c => (c as any).id === absence.absenceReasonId)?.shortName || '?' }}
                        </div>
                        <div>
                            <div class="flex items-center gap-2 mb-1">
                                <h3 class="font-medium text-gray-900 dark:text-white">
                                    {{ getCategoryName(absence.absenceReasonId) }}
                                </h3>
                                <BaseBadge v-if="absence.isFullDay" variant="neutral" size="sm">Full Day</BaseBadge>
                            </div>
                            <p class="text-sm text-gray-500 dark:text-gray-400">
                                {{ formatDateRange(absence) }}
                            </p>
                            <p v-if="absence.comment" class="text-sm text-gray-600 dark:text-gray-300 mt-2 italic">
                                "{{ absence.comment }}"
                            </p>
                        </div>
                    </div>
                    
                    <div class="flex gap-2">
                        <BaseButton variant="secondary" size="sm" @click="$emit('edit', absence)">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                            </svg>
                        </BaseButton>
                        <BaseButton variant="danger" size="sm" @click="$emit('delete', absence)">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </BaseButton>
                    </div>
                </div>
            </BaseCard>
        </div>
    </div>
</template>
