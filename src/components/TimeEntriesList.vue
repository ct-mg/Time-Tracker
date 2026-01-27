<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useTimeEntries } from '../composables/useTimeEntries';
import { useTimeEntriesStore } from '../stores/time-entries.store';
import { useSettingsStore } from '../stores/settings.store';
import TimeEntryItem from './TimeEntryItem.vue';
import BulkActionsToolbar from './BulkActionsToolbar.vue';
import { useToastStore } from '../stores/toast.store';
import { listTransition } from '../utils/animations';

import TimeEntriesListSkeleton from './skeletons/TimeEntriesListSkeleton.vue';

const { groupedEntries } = useTimeEntries();
const store = useTimeEntriesStore();
const settingsStore = useSettingsStore();
const toastStore = useToastStore();
const { t } = useI18n();

import ConfirmationModal from './base/ConfirmationModal.vue';
import { ref, watch, onMounted } from 'vue';

const itemsPerPage = 10;
const visibleGroupsCount = ref(itemsPerPage);
const showDeleteConfirm = ref(false);
const entryToDelete = ref<any | null>(null);
const isDeleting = ref(false);

const limitedGroups = computed(() => {
    return groupedEntries.value.slice(0, visibleGroupsCount.value);
});

const loadMoreTrigger = ref<HTMLElement | null>(null);

function loadMore() {
    if (visibleGroupsCount.value < groupedEntries.value.length) {
        visibleGroupsCount.value += itemsPerPage;
    }
}

// Reset visible count when grouping or filters change
watch(() => [store.groupingMode, store.searchTerm, store.selectedCategoryIds, store.selectedUserIds, store.dateRange], () => {
    visibleGroupsCount.value = itemsPerPage;
}, { deep: true });

onMounted(() => {
    if (loadMoreTrigger.value) {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                loadMore();
            }
        }, { threshold: 1.0 });
        
        observer.observe(loadMoreTrigger.value);
    }
});

const workCategories = computed(() => store.workCategories);

const emit = defineEmits<{
    (e: 'edit', entry: any): void;
}>();

function handleEdit(entry: any) {
    emit('edit', entry);
}

// Select All functionality
const allVisibleEntryIds = computed(() => {
    const ids: string[] = [];
    groupedEntries.value.forEach(group => {
        group.sortedDays.forEach(day => {
            day.entries.forEach(entry => {
                if (entry.endTime) { // Only selectable if not active
                    ids.push(entry.startTime);
                }
            });
        });
    });
    return ids;
});

const allSelected = computed(() => {
    if (allVisibleEntryIds.value.length === 0) return false;
    return allVisibleEntryIds.value.every(id => store.selectedEntryIds.includes(id));
});

const someSelected = computed(() => {
    return store.selectedEntryIds.length > 0 && !allSelected.value;
});

function toggleSelectAll() {
    if (allSelected.value) {
        store.clearSelection();
    } else {
        store.selectAll(allVisibleEntryIds.value);
    }
}

function handleDelete(entry: any) {
    entryToDelete.value = entry;
    showDeleteConfirm.value = true;
}

async function confirmDelete() {
    if (!entryToDelete.value) return;
    
    isDeleting.value = true;
    try {
        const moduleId = settingsStore.moduleId;
        if (moduleId) {
            await store.deleteTimeEntry(moduleId, entryToDelete.value);
            toastStore.success(t('ct.extension.timetracker.notifications.entryDeleted'));
        }
    } catch (e: any) {
        toastStore.error(t('ct.extension.timetracker.notifications.deleteEntryFailed'));
    } finally {
        isDeleting.value = false;
        showDeleteConfirm.value = false;
        entryToDelete.value = null;
    }
}
</script>

<template>
    <div class="space-y-6">
        <template v-if="store.isLoading && groupedEntries.length === 0">
            <TimeEntriesListSkeleton />
        </template>
        <template v-else>
            <div v-if="groupedEntries.length === 0" class="text-center p-8 text-gray-500 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                {{ t('ct.extension.timetracker.timeEntries.noEntries') }}
            </div>

            <TransitionGroup 
                name="list"
                tag="div"
                class="space-y-6"
                v-bind="listTransition"
            >
            <div 
                v-for="group in limitedGroups" 
                :key="group.key" 
                class="bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 transition-all duration-200 hover:shadow-md"
            >
            <!-- Group Header (Week/Month/Day) -->
            <div v-if="store.groupingMode !== 'day'" class="flex justify-between items-center mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                <h3 class="text-lg font-bold text-gray-800 dark:text-white">
                    {{ group.title }} <span v-if="group.subTitle" class="text-gray-500 font-normal">{{ group.subTitle }}</span>
                </h3>
                <div class="flex gap-4 text-sm">
                    <span class="text-gray-600 dark:text-gray-300">
                        {{ t('ct.extension.timetracker.dashboard.stats.actual') }}: 
                        <span :class="group.totalMs >= group.targetMs ? 'text-green-600 dark:text-green-400 font-bold' : 'text-red-600 dark:text-red-400'">
                            {{ group.totalDisplay }}
                        </span>
                    </span>
                    <span class="text-gray-500">
                        {{ t('ct.extension.timetracker.dashboard.stats.target') }}: <span class="font-medium">{{ group.targetDisplay }}</span>
                    </span>
                </div>
            </div>

            <!-- Days -->
            <div class="space-y-4">
                <div v-for="day in group.sortedDays" :key="day.date" class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                    <!-- Day Header -->
                    <div class="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <h4 class="font-semibold text-gray-700 dark:text-gray-200">
                            {{ new Date(day.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}
                        </h4>
                        <div class="flex gap-4 text-xs">
                             <span class="text-gray-600 dark:text-gray-400">
                                 {{ t('ct.extension.timetracker.dashboard.stats.actual') }}: 
                                <span :class="{
                                    'text-green-600 dark:text-green-400 font-bold': day.dayTotalMs >= day.dayTargetMs,
                                    'text-red-600 dark:text-red-400': day.dayTotalMs < day.dayTargetMs && day.isWorkDay,
                                    'text-gray-500': !day.isWorkDay
                                }">
                                    {{ day.dayTotalDisplay }}
                                </span>
                            </span>
                             <span class="text-gray-500">{{ t('ct.extension.timetracker.dashboard.stats.target') }}: {{ day.dayTargetDisplay }}</span>
                        </div>
                    </div>

                    <!-- Entries Table -->
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700 text-xs text-gray-500 uppercase tracking-wider">
                                    <th class="p-3 w-12">
                                        <input 
                                            type="checkbox" 
                                            :checked="allSelected"
                                            :indeterminate.prop="someSelected"
                                            @change="toggleSelectAll"
                                            class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 cursor-pointer"
                                            :title="t('ct.extension.timetracker.bulkEdit.selectAll')"
                                        />
                                    </th>
                                    <th class="px-3 py-2">{{ t('ct.extension.timetracker.timeEntries.startTime') }}</th>
                                    <th class="px-3 py-2">{{ t('ct.extension.timetracker.timeEntries.endTime') }}</th>
                                    <th class="px-3 py-2">{{ t('ct.extension.timetracker.timeEntries.duration') }}</th>
                                    <th class="px-3 py-2">{{ t('ct.extension.timetracker.timeEntries.filterCategory') }}</th>
                                    <th class="px-3 py-2">{{ t('ct.extension.timetracker.dashboard.description') }}</th>
                                    <th class="px-3 py-2">{{ t('ct.extension.timetracker.timeEntries.type') }}</th>
                                    <th class="px-3 py-2 text-center">{{ t('ct.extension.timetracker.timeEntries.actions') }}</th>
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
            </TransitionGroup>

            <!-- Load More Trigger -->
            <div 
                v-if="visibleGroupsCount < groupedEntries.length" 
                ref="loadMoreTrigger" 
                class="h-10 flex items-center justify-center"
            >
                <div class="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>

            <!-- Bulk Actions Toolbar -->
            <BulkActionsToolbar />

            <ConfirmationModal
                v-model="showDeleteConfirm"
                :title="t('ct.extension.timetracker.modal.deleteEntry.title')"
                :message="t('ct.extension.timetracker.modal.deleteEntry.message')"
                :is-loading="isDeleting"
                @confirm="confirmDelete"
            />
        </template>
    </div>
</template>
