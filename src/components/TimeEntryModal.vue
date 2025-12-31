<script setup lang="ts">
import { ref, watch } from 'vue';
import type { TimeEntry, WorkCategory } from '../types/time-tracker';

const props = defineProps<{
    modelValue: boolean; // Is open
    entry?: TimeEntry | null; // Editing entry, or null for new
    workCategories: WorkCategory[];
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void;
    (e: 'save', entry: Partial<TimeEntry>): void;
}>();

// Form State
const startTime = ref('');
const endTime = ref('');
const categoryId = ref('');
const description = ref('');
const isBreak = ref(false);

// Helper to format Date for datetime-local input
function formatDateForInput(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    // Adjust to local time string format YYYY-MM-DDTHH:MM
    const tzOffset = date.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
    return localISOTime;
}

// Watch for entry changes to populate form
watch(() => props.entry, (newEntry) => {
    if (newEntry) {
        startTime.value = formatDateForInput(newEntry.startTime);
        endTime.value = newEntry.endTime ? formatDateForInput(newEntry.endTime) : '';
        categoryId.value = newEntry.categoryId;
        description.value = newEntry.description || '';
        isBreak.value = newEntry.isBreak || false;
    } else {
        // Reset for new entry (default to now)
        const now = new Date();
        startTime.value = formatDateForInput(now.toISOString());
        endTime.value = '';
        categoryId.value = props.workCategories[0]?.id || '';
        description.value = '';
        isBreak.value = false;
    }
}, { immediate: true });

function closeModal() {
    emit('update:modelValue', false);
}

function save() {
    if (!startTime.value || !categoryId.value) return;

    if (endTime.value && new Date(startTime.value) > new Date(endTime.value)) {
        alert('End time cannot be before start time.');
        return;
    }

    const payload: Partial<TimeEntry> = {
        startTime: new Date(startTime.value).toISOString(),
        endTime: endTime.value ? new Date(endTime.value).toISOString() : undefined,
        categoryId: categoryId.value,
        categoryName: props.workCategories.find(c => c.id === categoryId.value)?.name || '', // Helper
        description: description.value,
        isBreak: isBreak.value,
        isManual: true
    };
    
    // If editing, preserve ID/User
    if (props.entry) {
        payload.userId = props.entry.userId;
    }

    emit('save', payload);
    closeModal();
}
</script>

<template>
    <div v-if="modelValue" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="closeModal"></div>

        <div class="flex items-center justify-center min-h-screen p-4 text-center sm:p-0">
            <div class="relative bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-lg w-full">
                <div class="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white" id="modal-title">
                        {{ entry ? 'Edit Time Entry' : 'Add Manual Entry' }}
                    </h3>
                    <div class="mt-4 space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Time</label>
                                <input v-model="startTime" type="datetime-local" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm" />
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">End Time</label>
                                <input v-model="endTime" type="datetime-local" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm" />
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div class="col-span-1">
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                                <select v-model="categoryId" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                    <option v-for="cat in workCategories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                                </select>
                            </div>
                         </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                            <textarea v-model="description" rows="2" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"></textarea>
                        </div>

                        <div class="flex items-center">
                            <input v-model="isBreak" id="is-break" type="checkbox" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                            <label for="is-break" class="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                                This is a break
                            </label>
                        </div>
                    </div>
                </div>
                <div class="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button @click="save" type="button" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm">
                        Save
                    </button>
                    <button @click="closeModal" type="button" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
