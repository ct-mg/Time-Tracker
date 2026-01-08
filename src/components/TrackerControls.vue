<script setup lang="ts">
import { ref, computed } from 'vue';
import { useTimeEntriesStore } from '../stores/time-entries.store';
import { useSettingsStore } from '../stores/settings.store';
import TimerDisplay from './TimerDisplay.vue';
import BaseButton from './base/BaseButton.vue';
import BaseCard from './base/BaseCard.vue';

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
    <BaseCard padding="md" class="mb-6">
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
                <BaseButton 
                    @click="handleClockIn"
                    :disabled="!selectedCategoryId"
                    variant="success"
                    size="md"
                >
                    Start
                </BaseButton>
            </div>

            <!-- Stop Button (Visible when tracking) -->
            <!-- Active State (Visible when tracking) -->
            <div v-else class="flex-grow flex items-center justify-between gap-4 w-full md:w-auto bg-gradient-to-r from-blue-50 to-blue-50/0 dark:from-blue-900/20 -my-4 py-4 pl-4 rounded-l-lg border-l-4 border-blue-500 transition-all duration-300">
                <div class="flex items-center gap-3 overflow-hidden">
                    <div class="relative flex h-3 w-3">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                    </div>
                    
                    <div class="text-left min-w-0">
                        <div class="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Current Task</div>
                        <div class="font-medium text-gray-900 dark:text-white truncate" :title="timeEntriesStore.activeEntry?.description">
                            <span class="font-bold">{{ timeEntriesStore.activeEntry?.categoryName }}</span>
                            <span v-if="timeEntriesStore.activeEntry?.description" class="mx-2 text-gray-400">|</span>
                            <span>{{ timeEntriesStore.activeEntry?.description }}</span>
                        </div>
                    </div>
                </div>

                <BaseButton 
                    @click="handleClockOut"
                    variant="danger"
                    size="md"
                    class="mr-4 shadow-sm"
                >
                    Stop
                </BaseButton>
            </div>
        </div>
    </BaseCard>
</template>
