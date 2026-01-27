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

const managerSearchText = ref('');
const employeeSearchText = ref('');
const showOnlyAssigned = ref(false);

const filteredManagers = computed(() => {
    if (!managerSearchText.value) return managers.value;
    const query = managerSearchText.value.toLowerCase();
    return managers.value.filter(m => m.name.toLowerCase().includes(query));
});

const availableEmployees = computed(() => authStore.userList);

const getFilteredEmployees = (managerId: number) => {
    let list = availableEmployees.value;
    
    // Global employee search
    if (employeeSearchText.value) {
        const query = employeeSearchText.value.toLowerCase();
        list = list.filter(u => u.name.toLowerCase().includes(query));
    }
    
    // Show only assigned toggle
    if (showOnlyAssigned.value) {
        const assignedIds = assignments.value.find(a => a.managerId === managerId)?.employeeIds || [];
        list = list.filter(u => assignedIds.includes(u.id));
    }
    
    return list;
};

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

function selectAllForManager(managerId: number) {
    const assignment = assignments.value.find(a => a.managerId === managerId);
    if (!assignment) return;
    
    // We only select what is currently visible in the filtered list to avoid unexpected behavior
    const filtered = getFilteredEmployees(managerId);
    filtered.forEach(u => {
        if (!assignment.employeeIds.includes(u.id)) {
            assignment.employeeIds.push(u.id);
        }
    });
}

function clearAllForManager(managerId: number) {
    const assignment = assignments.value.find(a => a.managerId === managerId);
    if (!assignment) return;
    
    // We only clear what is currently visible in the filtered list
    const filtered = getFilteredEmployees(managerId);
    const filteredIds = filtered.map(u => u.id);
    assignment.employeeIds = assignment.employeeIds.filter(id => !filteredIds.includes(id));
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
            
            <div class="flex flex-col lg:flex-row gap-6 items-start lg:items-end mb-8 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div class="w-full lg:w-48">
                    <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        {{ t('ct.extension.timetracker.admin.managerAssignment.groupId') }}
                    </label>
                    <div class="flex gap-2">
                        <input 
                            v-model.number="managerGroupId" 
                            type="number" 
                            :placeholder="t('ct.extension.timetracker.admin.managerAssignment.placeholder')"
                            class="flex-grow px-3 py-2 border rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                        <BaseButton @click="loadManagers" :disabled="isLoadingManagers || !managerGroupId" size="sm">
                            <span v-if="!isLoadingManagers">{{ t('ct.extension.timetracker.admin.managerAssignment.loadButton') }}</span>
                            <div v-else class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        </BaseButton>
                    </div>
                </div>

                <!-- Vertical Divider -->
                <div class="hidden lg:block w-px h-12 bg-gray-200 dark:bg-gray-700 mx-2"></div>

                <!-- Global Filters -->
                <div class="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                    <div>
                        <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            {{ t('ct.extension.timetracker.admin.managerAssignment.searchManagers') }}
                        </label>
                        <input 
                            v-model="managerSearchText"
                            type="text"
                            :placeholder="t('ct.extension.timetracker.admin.managerAssignment.searchManagers')"
                            class="w-full px-3 py-2 border rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            {{ t('ct.extension.timetracker.admin.managerAssignment.searchEmployees') }}
                        </label>
                        <input 
                            v-model="employeeSearchText"
                            type="text"
                            :placeholder="t('ct.extension.timetracker.admin.managerAssignment.searchEmployees')"
                            class="w-full px-3 py-2 border rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div class="flex items-center">
                        <label class="flex items-center gap-2 cursor-pointer mt-6">
                            <input 
                                v-model="showOnlyAssigned"
                                type="checkbox"
                                class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                            />
                            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {{ t('ct.extension.timetracker.admin.managerAssignment.showOnlyAssigned') }}
                            </span>
                        </label>
                    </div>
                </div>
            </div>

            <div v-if="filteredManagers.length > 0" class="space-y-8">
                <div v-for="manager in filteredManagers" :key="manager.id" class="border-t dark:border-gray-700 pt-6">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold">
                                {{ manager.name.charAt(0) }}
                            </div>
                            <div>
                                <h3 class="font-bold text-gray-900 dark:text-white">{{ manager.name }}</h3>
                                <p class="text-xs text-gray-500">ID: {{ manager.id }}</p>
                            </div>
                        </div>
                        
                        <div class="flex gap-2">
                            <BaseButton variant="secondary" size="sm" @click="selectAllForManager(manager.id)">
                                {{ t('ct.extension.timetracker.admin.managerAssignment.selectAll') }}
                            </BaseButton>
                            <BaseButton variant="secondary" size="sm" @click="clearAllForManager(manager.id)">
                                {{ t('ct.extension.timetracker.admin.managerAssignment.clearAll') }}
                            </BaseButton>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        <label 
                            v-for="user in getFilteredEmployees(manager.id)" 
                            :key="user.id"
                            class="flex items-center gap-2 p-2 rounded cursor-pointer transition-all border group"
                            :class="isAssigned(manager.id, user.id) 
                                ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800' 
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-100 dark:border-gray-700'"
                        >
                            <input 
                                type="checkbox" 
                                :checked="isAssigned(manager.id, user.id)"
                                @change="toggleEmployee(manager.id, user.id)"
                                class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                            />
                            <span class="text-sm truncate" :class="isAssigned(manager.id, user.id) ? 'text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200'">
                                {{ user.name }}
                            </span>
                        </label>
                    </div>

                    <div v-if="getFilteredEmployees(manager.id).length === 0" class="py-4 text-center text-sm text-gray-400 italic">
                        {{ t('ct.extension.timetracker.timeEntries.noEntries') }}
                    </div>
                </div>

                <div class="flex justify-end pt-6 border-t dark:border-gray-700">
                    <BaseButton variant="primary" size="lg" @click="saveAssignments">
                        {{ t('ct.extension.timetracker.admin.managerAssignment.saveButton') }}
                    </BaseButton>
                </div>
            </div>

            <div v-else-if="!isLoadingManagers && managers.length > 0" class="py-12 text-center text-gray-500">
                {{ t('ct.extension.timetracker.timeEntries.noEntries') }}
            </div>

            <div v-else-if="!isLoadingManagers" class="py-12 text-center text-gray-500">
                {{ t('ct.extension.timetracker.admin.clickLoadEmployees') }}
            </div>
            
            <div v-else class="py-12 text-center text-gray-500">
                <div class="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                {{ t('ct.extension.timetracker.common.loading') }}
            </div>
        </BaseCard>
    </div>
</template>
