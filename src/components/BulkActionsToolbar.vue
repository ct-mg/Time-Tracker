<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useTimeEntriesStore } from '../stores/time-entries.store';
import { useSettingsStore } from '../stores/settings.store';
import BaseButton from './base/BaseButton.vue';
import BaseModal from './base/BaseModal.vue';
import { useToastStore } from '../stores/toast.store';
import { slideUpTransition } from '../utils/animations';

const store = useTimeEntriesStore();
const settingsStore = useSettingsStore();
const toastStore = useToastStore();
const { t } = useI18n();

const selectedCount = computed(() => store.selectedEntryIds.length);
const isVisible = computed(() => selectedCount.value > 0);

// Category edit state
const showCategoryModal = ref(false);
const selectedCategoryId = ref('');

// Delete confirmation
const showDeleteModal = ref(false);

const categories = computed(() => store.workCategories);

function handleClearSelection() {
    store.clearSelection();
}

function openCategoryEdit() {
    selectedCategoryId.value = categories.value[0]?.id || '';
    showCategoryModal.value = true;
}

async function handleBulkCategoryUpdate() {
    if (!selectedCategoryId.value || !settingsStore.moduleId) return;
    
    const category = categories.value.find(c => c.id === selectedCategoryId.value);
    if (!category) return;

    try {
        await store.bulkUpdateEntries(settingsStore.moduleId, store.selectedEntryIds, {
            categoryId: selectedCategoryId.value,
            categoryName: category.name
        });
        showCategoryModal.value = false;
        toastStore.success(t('ct.extension.timetracker.notifications.entryUpdated'));
    } catch (e) {
        toastStore.error(t('ct.extension.timetracker.notifications.bulkUpdateFailed'));
    }
}

function openDeleteConfirmation() {
    showDeleteModal.value = true;
}

async function handleBulkDelete() {
    if (!settingsStore.moduleId) return;

    try {
        await store.bulkDeleteEntries(settingsStore.moduleId, store.selectedEntryIds);
        showDeleteModal.value = false;
        toastStore.success(t('ct.extension.timetracker.notifications.entryDeleted'));
    } catch (e) {
        toastStore.error(t('ct.extension.timetracker.notifications.bulkDeleteFailed'));
    }
}
</script>

<template>
    <Transition v-bind="slideUpTransition">
        <div 
            v-if="isVisible"
            class="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t-2 border-blue-500 shadow-2xl z-40 transform transition-all duration-200"
        >
            <div class="max-w-7xl mx-auto px-4 py-4">
                <div class="flex items-center justify-between gap-4">
                    <!-- Selection Info -->
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                            <svg class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                            </svg>
                        </div>
                        <div>
                            <div class="font-bold text-gray-900 dark:text-white">
                                {{ t('ct.extension.timetracker.bulkEdit.selected', { count: selectedCount }, selectedCount) }}
                            </div>
                            <div class="text-sm text-gray-500 dark:text-gray-400">
                                {{ t('ct.extension.timetracker.bulkEdit.chooseAction') }}
                            </div>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="flex items-center gap-3">
                        <BaseButton 
                            variant="secondary" 
                            size="md"
                            @click="openCategoryEdit"
                        >
                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                            </svg>
                            {{ t('ct.extension.timetracker.bulkEdit.changeCategory') }}
                        </BaseButton>

                        <BaseButton 
                            variant="danger" 
                            size="md"
                            @click="openDeleteConfirmation"
                        >
                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                            {{ t('ct.extension.timetracker.bulkEdit.deleteSelected') }}
                        </BaseButton>

                        <button 
                            @click="handleClearSelection"
                            class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                            :title="t('ct.extension.timetracker.bulkEdit.clearSelection')"
                        >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </Transition>

    <!-- Category Edit Modal -->
    <BaseModal v-model="showCategoryModal" :title="t('ct.extension.timetracker.bulkEdit.changeCategory')" size="sm">
        <div class="space-y-4">
            <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ t('ct.extension.timetracker.bulkEdit.changeCategoryDescription', { count: selectedCount }, selectedCount) }}
            </p>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {{ t('ct.extension.timetracker.bulkEdit.newCategory') }}
                </label>
                <select 
                    v-model="selectedCategoryId"
                    class="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:text-white dark:border-gray-600"
                >
                    <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                        {{ cat.name }}
                    </option>
                </select>
            </div>
        </div>
        <template #footer>
            <div class="flex justify-end gap-3">
                <BaseButton variant="secondary" @click="showCategoryModal = false">
                    {{ t('ct.extension.timetracker.common.cancel') }}
                </BaseButton>
                <BaseButton variant="primary" @click="handleBulkCategoryUpdate">
                    {{ t('ct.extension.timetracker.bulkEdit.updateEntries', { count: selectedCount }, selectedCount) }}
                </BaseButton>
            </div>
        </template>
    </BaseModal>

    <!-- Delete Confirmation Modal -->
    <BaseModal v-model="showDeleteModal" :title="t('ct.extension.timetracker.bulkEdit.confirmBulkDeleteTitle')" size="sm">
        <div class="space-y-4">
            <div class="flex items-start gap-3">
                <div class="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg class="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                </div>
                <div>
                    <h4 class="font-bold text-gray-900 dark:text-white mb-2">
                        {{ t('ct.extension.timetracker.bulkEdit.deleteEntriesQuestion', { count: selectedCount }, selectedCount) }}
                    </h4>
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                        {{ t('ct.extension.timetracker.bulkEdit.deleteEntriesWarning') }}
                    </p>
                </div>
            </div>
        </div>
        <template #footer>
            <div class="flex justify-end gap-3">
                <BaseButton variant="secondary" @click="showDeleteModal = false">
                    {{ t('ct.extension.timetracker.common.cancel') }}
                </BaseButton>
                <BaseButton variant="danger" @click="handleBulkDelete">
                     {{ t('ct.extension.timetracker.bulkEdit.deleteEntriesButton', { count: selectedCount }, selectedCount) }}
                </BaseButton>
            </div>
        </template>
    </BaseModal>
</template>
