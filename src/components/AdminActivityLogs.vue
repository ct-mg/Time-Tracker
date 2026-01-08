<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useTimeEntriesStore } from '../stores/time-entries.store';
import { useSettingsStore } from '../stores/settings.store';

const store = useTimeEntriesStore();
const settingsStore = useSettingsStore();

const logs = computed(() => store.activityLogs);
const isLoading = ref(false);

onMounted(async () => {
    if (settingsStore.moduleId) {
        isLoading.value = true;
        await store.loadActivityLogs(settingsStore.moduleId);
        isLoading.value = false;
    }
});

function formatTime(ts: number) {
    return new Date(ts).toLocaleString();
}

function getActionColor(action: string) {
    switch(action) {
        case 'CREATE': return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400';
        case 'UPDATE': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400';
        case 'DELETE': return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
        default: return 'text-gray-600 bg-gray-50';
    }
}
</script>

<template>
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-bold text-gray-900 dark:text-white">Activity Logs</h2>
            <button 
                @click="store.loadActivityLogs(settingsStore.moduleId!)"
                class="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
                Refresh
            </button>
        </div>

        <div v-if="isLoading" class="text-center py-8 text-gray-500">
            Loading logs...
        </div>

        <div v-else class="overflow-x-auto">
            <table class="w-full text-left text-sm">
                <thead>
                    <tr class="bg-gray-50 dark:bg-gray-900 text-gray-500 border-b dark:border-gray-700">
                        <th class="p-3">Time</th>
                        <th class="p-3">User</th>
                        <th class="p-3">Action</th>
                        <th class="p-3">Details</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                    <tr v-for="log in logs" :key="log.timestamp + log.entityId">
                        <td class="p-3 whitespace-nowrap text-gray-600 dark:text-gray-400">
                            {{ formatTime(log.timestamp) }}
                        </td>
                        <td class="p-3 font-medium text-gray-900 dark:text-white">
                            {{ log.userName }}
                        </td>
                        <td class="p-3">
                            <span :class="['px-2 py-1 rounded text-xs font-bold', getActionColor(log.action)]">
                                {{ log.action }}
                            </span>
                        </td>
                         <td class="p-3 text-gray-600 dark:text-gray-300">
                            <div v-if="log.entityType === 'TIME_ENTRY'">
                                <span v-if="log.details.categoryName" class="font-medium">{{ log.details.categoryName }}</span>
                                <span v-if="log.details.description" class="mx-1 text-gray-400">-</span>
                                <span>{{ log.details.description }}</span>
                                <div v-if="log.details.oldValue" class="text-xs text-gray-400 mt-1">
                                    Modified: {{ log.details.oldValue.description || 'Entry' }}
                                </div>
                            </div>
                            <div v-else>
                                ID: {{ log.entityId }}
                            </div>
                        </td>
                    </tr>
                    <tr v-if="logs.length === 0">
                        <td colspan="4" class="p-8 text-center text-gray-500">No activity recorded yet.</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>
