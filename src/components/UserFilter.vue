<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/auth.store';
import { useTimeEntriesStore } from '../stores/time-entries.store';
import { useAbsencesStore } from '../stores/absences.store';

const authStore = useAuthStore();
const timeEntriesStore = useTimeEntriesStore();
const absencesStore = useAbsencesStore();
const { t } = useI18n();

// Only show for admins or managers
const canViewOthers = computed(() => authStore.isAdmin || authStore.isManager);

const selectedUserId = computed({
    get: () => timeEntriesStore.userId || authStore.user?.id || 0,
    set: (newId: number) => {
        // Update both stores to keep them in sync
        timeEntriesStore.setUserIdFilter(newId);
        absencesStore.setUserIdFilter(newId);
    }
});

const users = computed(() => authStore.userList);

</script>

<template>
    <div v-if="canViewOthers" class="flex items-center gap-2">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('ct.extension.timetracker.entries.filterUser') }}:</label>
        <div class="relative">
            <select 
                v-model="selectedUserId"
                class="appearance-none bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white py-1.5 pl-3 pr-8 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
                <option :value="authStore.user?.id">{{ t('ct.extension.timetracker.common.me', { name: authStore.user?.firstName }) }}</option>
                <option v-for="user in users" :key="user.id" :value="user.id">
                    {{ user.name }}
                </option>
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
            </div>
        </div>
    </div>
</template>
