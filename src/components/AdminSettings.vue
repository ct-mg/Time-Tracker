<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSettingsStore } from '../stores/settings.store';
import { useAuthStore } from '../stores/auth.store';
import type { UserHoursConfig } from '../types/time-tracker';
import { useToastStore } from '../stores/toast.store';
import AdminCategoryManager from './AdminCategoryManager.vue';
import AdminActivityLogs from './AdminActivityLogs.vue';

const settingsStore = useSettingsStore();
const authStore = useAuthStore();
const toastStore = useToastStore();
const { t } = useI18n();

const activeTab = ref<'general' | 'categories' | 'logs'>('general');

// Local state for editing
const settings = ref({ ...settingsStore.settings });
const userConfigs = ref<UserHoursConfig[]>(settingsStore.settings.userHoursConfig || []);

// Sync from store on mount/change
settings.value = JSON.parse(JSON.stringify(settingsStore.settings)); // Deep copy to avoid direct mutation
if (!settings.value.userHoursConfig) {
    settings.value.userHoursConfig = [];
}
userConfigs.value = settings.value.userHoursConfig || [];

const availableUsers = computed(() => authStore.userList);

// Form helpers
const weekDays = computed(() => [
    t('ct.extension.timetracker.common.weekdays.0'),
    t('ct.extension.timetracker.common.weekdays.1'),
    t('ct.extension.timetracker.common.weekdays.2'),
    t('ct.extension.timetracker.common.weekdays.3'),
    t('ct.extension.timetracker.common.weekdays.4'),
    t('ct.extension.timetracker.common.weekdays.5'),
    t('ct.extension.timetracker.common.weekdays.6')
]);
const selectedWorkDays = computed({
    get: () => settings.value.workWeekDays || [],
    set: (val) => { settings.value.workWeekDays = val; }
});

function toggleDay(dayIndex: number) {
    const current = new Set(selectedWorkDays.value);
    if (current.has(dayIndex)) {
        current.delete(dayIndex);
    } else {
        current.add(dayIndex);
    }
    selectedWorkDays.value = Array.from(current).sort();
}

// User Config Management
const editingConfig = ref<Partial<UserHoursConfig> | null>(null);
const isEditingConfig = ref(false);

function openAddUserConfig() {
    editingConfig.value = {
        hoursPerDay: settings.value.defaultHoursPerDay,
        hoursPerWeek: settings.value.defaultHoursPerWeek,
        workWeekDays: [...(settings.value.workWeekDays || [])]
    };
    isEditingConfig.value = true;
}

function editConfig(config: UserHoursConfig) {
    editingConfig.value = JSON.parse(JSON.stringify(config));
    isEditingConfig.value = true;
}

function deleteConfig(userId: number) {
    if (confirm(t('ct.extension.timetracker.admin.confirmRemoveUserConfig'))) {
        userConfigs.value = userConfigs.value.filter(c => c.userId !== userId);
        settings.value.userHoursConfig = userConfigs.value;
        toastStore.info(t('ct.extension.timetracker.admin.userConfigRemoved'));
    }
}

function saveConfig() {
    if (!editingConfig.value || !editingConfig.value.userId) return;
    
    // Find name
    const user = availableUsers.value.find(u => u.id === editingConfig.value?.userId);
    const configToSave: UserHoursConfig = {
        userId: editingConfig.value.userId,
        userName: user?.name || 'Unknown',
        hoursPerDay: Number(editingConfig.value.hoursPerDay),
        hoursPerWeek: Number(editingConfig.value.hoursPerWeek),
        workWeekDays: editingConfig.value.workWeekDays || []
    };

    const idx = userConfigs.value.findIndex(c => c.userId === configToSave.userId);
    if (idx >= 0) {
        userConfigs.value[idx] = configToSave;
    } else {
        userConfigs.value.push(configToSave);
    }
    
    settings.value.userHoursConfig = userConfigs.value;
    isEditingConfig.value = false;
    editingConfig.value = null;
}

async function saveAllSettings() {
    try {
        // Update store state
        settingsStore.settings = settings.value;
        await settingsStore.saveSettings();
        toastStore.success(t('ct.extension.timetracker.admin.settingsSaved'));
    } catch (e) {
        toastStore.error(t('ct.extension.timetracker.admin.saveFailed'));
    }
}
</script>

<template>
    <div>
        <!-- Admin Tabs -->
        <div class="flex border-b border-gray-200 dark:border-gray-700 mb-6">
            <button 
                @click="activeTab = 'general'"
                :class="['px-6 py-3 font-medium text-sm border-b-2 transition-colors', 
                         activeTab === 'general' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400']"
            >
                {{ t('ct.extension.timetracker.admin.generalSettings') }}
            </button>
            <button 
                @click="activeTab = 'categories'"
                :class="['px-6 py-3 font-medium text-sm border-b-2 transition-colors', 
                         activeTab === 'categories' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400']"
            >
                {{ t('ct.extension.timetracker.admin.workCategories') }}
            </button>
            <button 
                @click="activeTab = 'logs'"
                :class="['px-6 py-3 font-medium text-sm border-b-2 transition-colors', 
                         activeTab === 'logs' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400']"
            >
                {{ t('ct.extension.timetracker.admin.activityLogs') }}
            </button>
        </div>

        <div v-show="activeTab === 'general'" class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 class="text-xl font-bold mb-6 text-gray-900 dark:text-white">{{ t('ct.extension.timetracker.admin.generalSettings') }}</h2>
        
        <!-- Global Defaults -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('ct.extension.timetracker.admin.defaultHoursPerDay') }}</label>
                <input v-model.number="settings.defaultHoursPerDay" type="number" step="0.5" class="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('ct.extension.timetracker.admin.defaultHoursPerWeek') }}</label>
                <input v-model.number="settings.defaultHoursPerWeek" type="number" step="0.5" class="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
        </div>

        <div class="mb-8">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ t('ct.extension.timetracker.admin.standardWorkWeekDays') }}</label>
            <div class="flex flex-wrap gap-2">
                <button 
                    v-for="(day, index) in weekDays" 
                    :key="index"
                    @click="toggleDay(index)"
                    :class="[
                        'px-3 py-1 rounded text-sm font-medium transition-colors',
                        selectedWorkDays.includes(index) 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    ]"
                >
                    {{ day }}
                </button>
            </div>
        </div>

        <hr class="my-8 border-gray-200 dark:border-gray-700" />

        <!-- User Specifics -->
        <div class="mb-6 flex justify-between items-center">
            <h2 class="text-xl font-bold text-gray-900 dark:text-white">{{ t('ct.extension.timetracker.admin.userSpecificSettings') }}</h2>
            <button @click="openAddUserConfig" class="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700">
                + {{ t('ct.extension.timetracker.admin.addUserConfig') }}
            </button>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
                <thead>
                    <tr class="bg-gray-50 dark:bg-gray-900 text-gray-500 border-b dark:border-gray-700">
                        <th class="p-3">{{ t('ct.extension.timetracker.admin.user') }}</th>
                        <th class="p-3">{{ t('ct.extension.timetracker.admin.hoursPerDay') }}</th>
                        <th class="p-3">{{ t('ct.extension.timetracker.admin.hoursPerWeek') }}</th>
                        <th class="p-3">{{ t('ct.extension.timetracker.admin.actions') }}</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                    <tr v-for="config in userConfigs" :key="config.userId">
                        <td class="p-3 text-gray-900 dark:text-white font-medium">{{ config.userName }}</td>
                        <td class="p-3 dark:text-gray-300">{{ config.hoursPerDay }}h</td>
                        <td class="p-3 dark:text-gray-300">{{ config.hoursPerWeek }}h</td>
                        <td class="p-3">
                            <button @click="editConfig(config)" class="text-blue-600 hover:text-blue-800 mr-3">{{ t('ct.extension.timetracker.common.edit') }}</button>
                            <button @click="deleteConfig(config.userId)" class="text-red-600 hover:text-red-800">{{ t('ct.extension.timetracker.common.delete') }}</button>
                        </td>
                    </tr>
                    <tr v-if="userConfigs.length === 0">
                        <td colspan="4" class="p-4 text-center text-gray-500">{{ t('ct.extension.timetracker.admin.noUserConfigs') }}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="mt-8 flex justify-end">
            <button 
                @click="saveAllSettings" 
                class="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 shadow-md"
            >
                {{ t('ct.extension.timetracker.admin.saveAllSettings') }}
            </button>
        </div>

        <!-- Add/Edit Modal (Simple Inline Overlay) -->
        <div v-if="isEditingConfig" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div class="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md shadow-xl">
                <h3 class="text-lg font-bold mb-4 dark:text-white">{{ t('ct.extension.timetracker.admin.configureUser') }}</h3>
                
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium dark:text-gray-300">{{ t('ct.extension.timetracker.admin.user') }}</label>
                        <select v-model="editingConfig!.userId" class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" :disabled="!!userConfigs.find(c => c.userId === editingConfig!.userId && c !== editingConfig)">
                           <option v-for="u in availableUsers" :key="u.id" :value="u.id">{{ u.name }}</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium dark:text-gray-300">{{ t('ct.extension.timetracker.admin.hoursPerDay') }}</label>
                        <input v-model="editingConfig!.hoursPerDay" type="number" step="0.5" class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium dark:text-gray-300">{{ t('ct.extension.timetracker.admin.hoursPerWeek') }}</label>
                        <input v-model="editingConfig!.hoursPerWeek" type="number" step="0.5" class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" />
                    </div>
                </div>

                <div class="flex justify-end gap-3 mt-6">
                    <button @click="isEditingConfig = false" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">{{ t('ct.extension.timetracker.common.cancel') }}</button>
                    <button @click="saveConfig" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">{{ t('ct.extension.timetracker.common.confirm') }}</button>
                </div>
            </div>
        </div>
        </div>
        
        <!-- Category Manager Tab -->
        <AdminCategoryManager v-if="activeTab === 'categories'" />
        
        <!-- Activity Logs Tab -->
        <AdminActivityLogs v-if="activeTab === 'logs'" />
    </div>
</template>
