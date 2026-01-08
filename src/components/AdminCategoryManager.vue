<script setup lang="ts">
import { ref, computed } from 'vue';
import { useTimeEntriesStore } from '../stores/time-entries.store';
import { useSettingsStore } from '../stores/settings.store';
import type { WorkCategory } from '../types/time-tracker';

const store = useTimeEntriesStore();
const settingsStore = useSettingsStore();

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
    if (confirm(`Delete category "${cat.name}"? Existing time entries might lose their category association.`)) {
        if (!settingsStore.moduleId) return;
        try {
            await store.deleteWorkCategory(settingsStore.moduleId, cat.id);
        } catch (e) {
            alert('Failed to delete category');
        }
    }
}

async function save() {
    if (!editingCategory.value.name || !settingsStore.moduleId) return;

    try {
        await store.saveWorkCategory(settingsStore.moduleId, editingCategory.value);
        isEditing.value = false;
        editingCategory.value = {};
    } catch (e) {
        alert('Failed to save category');
    }
}
</script>

<template>
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-bold text-gray-900 dark:text-white">Work Categories</h2>
            <button @click="openAdd" class="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700">
                + Add Category
            </button>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
                <thead>
                    <tr class="bg-gray-50 dark:bg-gray-900 text-gray-500 border-b dark:border-gray-700">
                        <th class="p-3">Color</th>
                        <th class="p-3">Name</th>
                        <th class="p-3 w-32 text-right">Actions</th>
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
                            <button @click="openEdit(cat)" class="text-blue-600 hover:text-blue-800 mr-3">Edit</button>
                            <button @click="handleDelete(cat)" class="text-red-600 hover:text-red-800">Delete</button>
                        </td>
                    </tr>
                    <tr v-if="categories.length === 0">
                        <td colspan="3" class="p-4 text-center text-gray-500">No categories found.</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Add/Edit Modal -->
        <div v-if="isEditing" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div class="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-sm shadow-xl">
                <h3 class="text-lg font-bold mb-4 dark:text-white">{{ editingCategory.id ? 'Edit Category' : 'New Category' }}</h3>
                
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium dark:text-gray-300">Name</label>
                        <input v-model="editingCategory.name" type="text" class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600" placeholder="e.g. Office" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium dark:text-gray-300">Color</label>
                        <div class="flex gap-2">
                             <input v-model="editingCategory.color" type="color" class="h-10 w-20 p-1 border rounded dark:bg-gray-700 dark:border-gray-600" />
                             <input v-model="editingCategory.color" type="text" class="flex-grow p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600" />
                        </div>
                    </div>
                </div>

                <div class="flex justify-end gap-3 mt-6">
                    <button @click="isEditing = false" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded dark:text-gray-300 dark:hover:bg-gray-700">Cancel</button>
                    <button @click="save" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" :disabled="!editingCategory.name">Save</button>
                </div>
            </div>
        </div>
    </div>
</template>
