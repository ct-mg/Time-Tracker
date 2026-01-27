<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useTimeEntriesStore } from '../stores/time-entries.store';
import { useSettingsStore } from '../stores/settings.store';
import type { WorkCategory } from '../types/time-tracker';
import { useToastStore } from '../stores/toast.store';

const store = useTimeEntriesStore();
const settingsStore = useSettingsStore();
const toastStore = useToastStore();
const { t } = useI18n();

const categories = computed(() => store.workCategories);

const isEditing = ref(false);
const editingCategory = ref<Partial<WorkCategory>>({});

function openAdd() {
    editingCategory.value = {
        name: '',
        color: '#3b82f6' // Default blue
    };
    isEditing.value = true;
}

function openEdit(cat: WorkCategory) {
    editingCategory.value = { ...cat };
    isEditing.value = true;
}

async function handleDelete(cat: WorkCategory) {
    if (confirm(t('ct.extension.timetracker.admin.deleteCategoryConfirm', { name: cat.name }))) {
        if (!settingsStore.moduleId) return;
        try {
            await store.deleteWorkCategory(settingsStore.moduleId, cat.id);
            toastStore.success(t('ct.extension.timetracker.admin.categoryDeleted'));
        } catch (e) {
            toastStore.error(t('ct.extension.timetracker.admin.deleteCategoryFailed'));
        }
    }
}

async function save() {
    if (!editingCategory.value.name || !settingsStore.moduleId) return;

    try {
        await store.saveWorkCategory(settingsStore.moduleId, editingCategory.value);
        isEditing.value = false;
        editingCategory.value = {};
        toastStore.success(t('ct.extension.timetracker.admin.categorySaved'));
    } catch (e) {
        toastStore.error(t('ct.extension.timetracker.admin.saveCategoryFailed'));
    }
}
</script>

<template>
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-bold text-gray-900 dark:text-white">{{ t('ct.extension.timetracker.admin.workCategories') }}</h2>
            <button @click="openAdd" class="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700">
                + {{ t('ct.extension.timetracker.admin.addCategory') }}
            </button>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
                <thead>
                    <tr class="bg-gray-50 dark:bg-gray-900 text-gray-500 border-b dark:border-gray-700">
                        <th class="p-3">{{ t('ct.extension.timetracker.admin.color') }}</th>
                        <th class="p-3">{{ t('ct.extension.timetracker.admin.name') }}</th>
                        <th class="p-3 w-32 text-right">{{ t('ct.extension.timetracker.admin.actions') }}</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                    <tr v-for="cat in categories" :key="cat.id">
                        <td class="p-3">
                            <div class="w-6 h-6 rounded border border-gray-200 dark:border-gray-600" :style="{ backgroundColor: cat.color }"></div>
                        </td>
                        <td class="p-3 text-gray-900 dark:text-white font-medium">
                            {{ cat.name }}
                        </td>
                        <td class="p-3 text-right">
                            <button @click="openEdit(cat)" class="text-blue-600 hover:text-blue-800 mr-3">{{ t('ct.extension.timetracker.common.edit') }}</button>
                            <button @click="handleDelete(cat)" class="text-red-600 hover:text-red-800">{{ t('ct.extension.timetracker.common.delete') }}</button>
                        </td>
                    </tr>
                    <tr v-if="categories.length === 0">
                        <td colspan="3" class="p-4 text-center text-gray-500">{{ t('ct.extension.timetracker.admin.noCategories') }}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Add/Edit Modal -->
        <div v-if="isEditing" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div class="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-sm shadow-xl">
                <h3 class="text-lg font-bold mb-4 dark:text-white">{{ editingCategory.id ? t('ct.extension.timetracker.admin.editCategory') : t('ct.extension.timetracker.admin.newCategory') }}</h3>
                
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium dark:text-gray-300">{{ t('ct.extension.timetracker.admin.name') }}</label>
                        <input v-model="editingCategory.name" type="text" class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600" placeholder="e.g. Office" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium dark:text-gray-300">{{ t('ct.extension.timetracker.admin.color') }}</label>
                        <div class="flex gap-2">
                             <input v-model="editingCategory.color" type="color" class="h-10 w-20 p-1 border rounded dark:bg-gray-700 dark:border-gray-600" />
                             <input v-model="editingCategory.color" type="text" class="flex-grow p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600" />
                        </div>
                    </div>
                </div>

                <div class="flex justify-end gap-3 mt-6">
                    <button @click="isEditing = false" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded dark:text-gray-300 dark:hover:bg-gray-700">{{ t('ct.extension.timetracker.common.cancel') }}</button>
                    <button @click="save" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" :disabled="!editingCategory.name">{{ t('ct.extension.timetracker.common.save') }}</button>
                </div>
            </div>
        </div>
    </div>
</template>
