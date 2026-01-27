<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { TimeEntry, WorkCategory } from '../types/time-tracker';
import { formatDuration } from '../utils/date';
import { useTimeEntriesStore } from '../stores/time-entries.store';
// import { useAuthStore } from '../stores/auth.store';

const props = defineProps<{
    entry: TimeEntry;
    workCategories: WorkCategory[];
}>();

const emit = defineEmits<{
    (e: 'edit', entry: TimeEntry): void;
    (e: 'delete', entry: TimeEntry): void;
}>();

const { t } = useI18n();
const store = useTimeEntriesStore();

const isSelected = computed(() => store.selectedEntryIds.includes(props.entry.startTime));

function toggleSelection() {
    store.selectEntry(props.entry.startTime);
}

// const authStore = useAuthStore();

const duration = computed(() => {
    if (!props.entry.endTime) return t('ct.extension.timetracker.common.active');
    const start = new Date(props.entry.startTime).getTime();
    const end = new Date(props.entry.endTime).getTime();
    return formatDuration(end - start);
});

const categoryColor = computed(() => {
    const cat = props.workCategories.find(c => c.id === props.entry.categoryId);
    return cat?.color || '#6c757d';
});

const startTime = computed(() => new Date(props.entry.startTime).toLocaleTimeString());
const endTime = computed(() => props.entry.endTime ? new Date(props.entry.endTime).toLocaleTimeString() : '-');

const isActive = computed(() => !props.entry.endTime);
</script>

<template>
    <tr :class="['border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors', isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : '']">
        <!-- Selection Checkbox -->
        <td class="p-3 w-12">
            <input 
                type="checkbox" 
                :checked="isSelected"
                @change="toggleSelection"
                class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 cursor-pointer"
            />
        </td>
        <td class="p-3 text-sm text-gray-700 dark:text-gray-300">
            {{ startTime }}
        </td>
        <td class="p-3 text-sm">
            <span v-if="isActive" class="text-green-600 font-semibold dark:text-green-400">{{ t('ct.extension.timetracker.common.active') }}</span>
            <span v-else class="text-gray-700 dark:text-gray-300">{{ endTime }}</span>
        </td>
        <td class="p-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
            {{ duration }}
        </td>
        <td class="p-3 text-sm">
            <span 
                class="px-2 py-1 rounded text-xs text-white"
                :style="{ backgroundColor: categoryColor }"
            >
                {{ entry.categoryName }}
            </span>
        </td>
        <td class="p-3 text-sm text-gray-600 dark:text-gray-400">
            {{ entry.description || '-' }}
        </td>
        <td class="p-3 text-sm">
             <div class="flex flex-col gap-1 items-start">
                 <span v-if="entry.isManual" class="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                     {{ t('ct.extension.timetracker.timeEntries.manual') }}
                 </span>
                 <span v-if="entry.isBreak" class="text-xs text-blue-500 flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                     {{ t('ct.extension.timetracker.timeEntries.break') }}
                 </span>
             </div>
        </td>
        <td class="p-3 text-center">
             <div v-if="entry.endTime" class="flex justify-center gap-2">
                 <button 
                    @click="$emit('edit', entry)"
                    class="p-1 bg-yellow-400 text-gray-800 rounded hover:bg-yellow-500 transition-colors"
                    :title="t('ct.extension.timetracker.common.edit')"
                 >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                 </button>
                 <button 
                    @click="$emit('delete', entry)"
                    class="p-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    :title="t('ct.extension.timetracker.common.delete')"
                 >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                 </button>
             </div>
             <span v-else class="text-gray-400 text-xs">-</span>
        </td>
    </tr>
</template>
