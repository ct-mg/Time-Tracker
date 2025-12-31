<script setup lang="ts">
import { ref, computed } from 'vue';
import { useTimeEntriesStore } from '../stores/time-entries.store';
import { useSettingsStore } from '../stores/settings.store';
import TimerDisplay from './TimerDisplay.vue';

const timeEntriesStore = useTimeEntriesStore();
const settingsStore = useSettingsStore();

const description = ref('');
const selectedCategoryId = ref('');
const isBreak = ref(false);

const isTracking = computed(() => !!timeEntriesStore.activeEntry);
const categories = computed(() => timeEntriesStore.workCategories);

// Select default category if available and none selected
if (!selectedCategoryId.value && categories.value.length > 0) {
    selectedCategoryId.value = categories.value[0].id;
}

async function handleClockIn() {
    if (!selectedCategoryId.value) return;
    try {
        // TODO: Get Module ID from settings store or elsewhere - currently hardcoded/needs fix
        // We need a reliable way to get the module ID. SettingsStore has it.
        const moduleId = settingsStore.moduleId; 
        if (moduleId) {
            await timeEntriesStore.clockIn(moduleId, selectedCategoryId.value, description.value, isBreak.value);
            description.value = ''; // Reset description
        } else {
            console.error("Module ID not found");
        }
    } catch (e) {
        console.error("Clock in error", e);
    }
}

async function handleClockOut() {
    try {
        const moduleId = settingsStore.moduleId;
        if (moduleId) {
            await timeEntriesStore.clockOut(moduleId);
        }
    } catch (e) {
        console.error("Clock out error", e);
    }
}
</script>

<template>
    <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6 border border-gray-200 dark:border-gray-700">
        <div class="flex flex-col md:flex-row items-center justify-between gap-4">
            <!-- Timer Display -->
            <div class="flex-shrink-0">
                <TimerDisplay />
            </div>

            <!-- Controls -->
            <div class="flex-grow flex flex-col md:flex-row gap-3 w-full md:w-auto" v-if="!isTracking">
                <!-- Description Input -->
                <input 
                    v-model="description" 
                    type="text" 
                    placeholder="Task description..."
                    class="form-input flex-grow px-4 py-2 border rounded-md dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />

                <!-- Category Select -->
                <select 
                    v-model="selectedCategoryId"
                    class="form-select px-4 py-2 border rounded-md dark:bg-gray-700 dark:text-white dark:border-gray-600"
                >
                    <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                        {{ cat.name }}
                    </option>
                </select>
                
                <!-- Break Toggle (Simplified for now) -->
                <label class="flex items-center space-x-2 cursor-pointer select-none">
                    <input type="checkbox" v-model="isBreak" class="form-checkbox h-5 w-5 text-blue-600 rounded" />
                    <span class="text-sm text-gray-600 dark:text-gray-300">Break</span>
                </label>

                <!-- Start Button -->
                <button 
                    @click="handleClockIn"
                    :disabled="!selectedCategoryId"
                    class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    <span>Start</span>
                </button>
            </div>

            <!-- Stop Button (Visible when tracking) -->
            <div v-else class="flex items-center gap-4 w-full md:w-auto justify-end">
                <div class="text-left mr-4">
                   <div class="text-sm text-gray-500">Current Task:</div>
                   <div class="font-medium dark:text-white">{{ timeEntriesStore.activeEntry?.categoryName }} - {{ timeEntriesStore.activeEntry?.description || 'No description' }}</div>
                </div>
                <button 
                    @click="handleClockOut"
                    class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-md transition-colors shadow-sm"
                >
                    Stop
                </button>
            </div>
        </div>
    </div>
</template>
