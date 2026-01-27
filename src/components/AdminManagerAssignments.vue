<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSettingsStore } from '../stores/settings.store';
import { useAuthStore } from '../stores/auth.store';
import { useToastStore } from '../stores/toast.store';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import BaseCard from './base/BaseCard.vue';
import BaseButton from './base/BaseButton.vue';
import type { ManagerAssignment } from '../types/time-tracker';

const settingsStore = useSettingsStore();
const authStore = useAuthStore();
const toastStore = useToastStore();
const { t } = useI18n();

const managerGroupId = ref(settingsStore.settings.managerGroupId);
const isLoadingManagers = ref(false);
const managers = ref<Array<{ id: number; name: string }>>([]);
const assignments = ref<ManagerAssignment[]>(JSON.parse(JSON.stringify(settingsStore.settings.managerAssignments || [])));

const availableEmployees = computed(() => authStore.userList);

async function loadManagers() {
    if (!managerGroupId.value) return;
    
    isLoadingManagers.value = true;
    try {
        const groupMembers = (await churchtoolsClient.get(`/groups/${managerGroupId.value}/members`)) as any[];
        managers.value = groupMembers.map(m => ({
            id: m.personId || m.id,
            name: m.personName || `${m.firstName || ''} ${m.lastName || ''}`.trim() || `User ${m.personId || m.id}`
        }));
        
        // Initialize assignments for new managers
        managers.value.forEach(m => {
            if (!assignments.value.find(a => a.managerId === m.id)) {
                assignments.value.push({ managerId: m.id, managerName: m.name, employeeIds: [] });
            }
        });
        
        toastStore.success(t('ct.extension.timetracker.admin.foundEmployees', { count: managers.value.length }));
    } catch (error) {
        console.error('Failed to load managers', error);
        toastStore.error(t('ct.extension.timetracker.admin.managerLoadFailed'));
    } finally {
        isLoadingManagers.value = false;
    }
}

function toggleEmployee(managerId: number, employeeId: number) {
    const assignment = assignments.value.find(a => a.managerId === managerId);
    if (!assignment) return;
    
    const idx = assignment.employeeIds.indexOf(employeeId);
    if (idx > -1) {
        assignment.employeeIds.splice(idx, 1);
    } else {
        assignment.employeeIds.push(employeeId);
    }
}

function isAssigned(managerId: number, employeeId: number) {
    return assignments.value.find(a => a.managerId === managerId)?.employeeIds.includes(employeeId) || false;
}

async function saveAssignments() {
    try {
        const settings = { ...settingsStore.settings };
        settings.managerGroupId = managerGroupId.value;
        // Clean assignments (remove those without managers in current list?) 
        // Better keep them but filter for the ones we actually care about or just save all
        settings.managerAssignments = assignments.value;
        
        settingsStore.settings = settings;
        await settingsStore.saveSettings();
        toastStore.success(t('ct.extension.timetracker.admin.settingsSavedSuccess'));
    } catch (err) {
        toastStore.error(t('ct.extension.timetracker.admin.settingsSaveFailed'));
    }
}

// Auto-load on mount if group ID exists
onMounted(() => {
    if (managerGroupId.value) {
        loadManagers();
    }
});
</script>

<template>
    <div class="space-y-6">
        <BaseCard :title="t('ct.extension.timetracker.admin.managerAssignment.title')">
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {{ t('ct.extension.timetracker.admin.managerAssignment.description') }}
            </p>
            
            <div class="flex flex-col md:flex-row gap-4 items-end mb-8">
                <div class="flex-grow max-w-xs">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {{ t('ct.extension.timetracker.admin.managerAssignment.groupId') }}
                    </label>
                    <input 
                        v-model.number="managerGroupId" 
                        type="number" 
                        :placeholder="t('ct.extension.timetracker.admin.managerAssignment.placeholder')"
                        class="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                </div>
                <BaseButton @click="loadManagers" :disabled="isLoadingManagers || !managerGroupId">
                    {{ t('ct.extension.timetracker.admin.managerAssignment.loadButton') }}
                </BaseButton>
            </div>

            <div v-if="managers.length > 0" class="space-y-8">
                <div v-for="manager in managers" :key="manager.id" class="border-t dark:border-gray-700 pt-6">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold">
                            {{ manager.name.charAt(0) }}
                        </div>
                        <div>
                            <h3 class="font-bold text-gray-900 dark:text-white">{{ manager.name }}</h3>
                            <p class="text-xs text-gray-500">ID: {{ manager.id }}</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        <label 
                            v-for="user in availableEmployees" 
                            :key="user.id"
                            class="flex items-center gap-2 p-2 rounded cursor-pointer transition-colors"
                            :class="isAssigned(manager.id, user.id) ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-transparent'"
                        >
                            <input 
                                type="checkbox" 
                                :checked="isAssigned(manager.id, user.id)"
                                @change="toggleEmployee(manager.id, user.id)"
                                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span class="text-sm" :class="isAssigned(manager.id, user.id) ? 'text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-600 dark:text-gray-400'">
                                {{ user.name }}
                            </span>
                        </label>
                    </div>
                </div>

                <div class="flex justify-end pt-6 border-t dark:border-gray-700">
                    <BaseButton variant="primary" size="lg" @click="saveAssignments">
                        {{ t('ct.extension.timetracker.admin.managerAssignment.saveButton') }}
                    </BaseButton>
                </div>
            </div>

            <div v-else-if="!isLoadingManagers" class="py-12 text-center text-gray-500">
                {{ t('ct.extension.timetracker.admin.clickLoadEmployees') }}
            </div>
            
            <div v-else class="py-12 text-center text-gray-500">
                {{ t('ct.extension.timetracker.common.loading') }}
            </div>
        </BaseCard>
    </div>
</template>
