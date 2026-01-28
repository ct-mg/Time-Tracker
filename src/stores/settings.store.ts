import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Settings, SettingsBackup } from '../types/time-tracker';
import { getCustomDataCategory, getCustomDataValues, createCustomDataValue, updateCustomDataValue, getModule, deleteCustomDataValue, createCustomDataCategory, setModuleId } from '../services/kv-store';

interface UserSettings extends Settings {
    theme: 'light' | 'dark' | 'system';
    language: 'de' | 'en' | 'auto';
}

const STORAGE_KEY = 'ct-extension-timetracker-settings-v2';
const UI_STORAGE_KEY = 'ct-extension-timetracker-ui-state';

export const useSettingsStore = defineStore('settings', () => {
    const settings = ref<UserSettings>({
        defaultHoursPerDay: 8,
        defaultHoursPerWeek: 40,
        excelImportEnabled: false,
        workWeekDays: [1, 2, 3, 4, 5],
        theme: 'system',
        language: 'auto',
    });
    const isLoading = ref(true);
    const error = ref<string | null>(null);
    const moduleId = ref<number | null>(null);
    const isInitialized = ref(false);
    const backups = ref<SettingsBackup[]>([]);
    const MAX_BACKUPS = 5;

    // UI state that should be persisted locally
    const currentView = ref<'tracker' | 'admin'>('tracker');
    const activeTab = ref<'dashboard' | 'entries' | 'absences' | 'reports'>('dashboard');

    function applyTheme(currentTheme: 'light' | 'dark' | 'system') {
        const isDark = currentTheme === 'dark' || (currentTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }

    function initLocalSettings() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Merge saved settings with defaults to ensure new fields (like language) are present
                settings.value = { ...settings.value, ...parsed };
            } catch (e) {
                console.error('Failed to parse settings', e);
            }
        }

        const savedUI = localStorage.getItem(UI_STORAGE_KEY);
        if (savedUI) {
            try {
                const parsed = JSON.parse(savedUI);
                if (parsed.currentView) currentView.value = parsed.currentView;
                if (parsed.activeTab) activeTab.value = parsed.activeTab;
            } catch (e) {
                console.error('Failed to parse UI state', e);
            }
        }

        applyTheme(settings.value.theme);
        // Language is applied in App.vue via watcher or initial load

        // Listen for system changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (settings.value.theme === 'system') {
                applyTheme(settings.value.theme);
            }
        });
    }

    function saveUIState() {
        localStorage.setItem(UI_STORAGE_KEY, JSON.stringify({
            currentView: currentView.value,
            activeTab: activeTab.value
        }));
    }

    // Initial load
    async function init(key: string) {
        if (isInitialized.value) return;

        initLocalSettings(); // Load local settings first

        isLoading.value = true;
        try {
            const module = await getModule(key);
            moduleId.value = module.id;
            setModuleId(module.id);
            await loadRemoteSettings();
            isInitialized.value = true;
        } catch (e) {
            console.error('Failed to init settings', e);
            error.value = 'Failed to init settings';
        } finally {
            isLoading.value = false;
        }
    }

    async function loadRemoteSettings() {
        isLoading.value = true;
        const module_id = moduleId.value;
        if (!module_id) return;

        try {
            const category = await getCustomDataCategory<object>('settings', module_id);
            if (category) {
                const values = await getCustomDataValues<Settings>(category.id, module_id);
                if (values.length > 0) {
                    // Update generic settings, merging with default to ensure new fields are present
                    settings.value = { ...settings.value, ...values[0] };
                    // Clean up legacy darkMode if present in local state overlap
                    if ((settings.value as any).darkMode !== undefined) {
                        delete (settings.value as any).darkMode;
                    }
                }
            }
        } catch (e) {
            console.error('Failed to load settings', e);
            error.value = 'Failed to load settings';
        } finally {
            isLoading.value = false;
        }
    }

    async function loadBackups() {
        if (!moduleId.value) return;
        try {
            const category = await getCustomDataCategory<object>('settings_backups', moduleId.value);
            if (category) {
                const values = await getCustomDataValues<SettingsBackup>(category.id, moduleId.value);
                backups.value = values.sort((a, b) => b.timestamp - a.timestamp);
            }
        } catch (e) {
            console.error('Failed to load backups', e);
        }
    }

    async function createBackup(summary: string) {
        if (!moduleId.value) return;
        try {
            let category = await getCustomDataCategory<object>('settings_backups', moduleId.value);
            if (!category) {
                category = await createCustomDataCategory({
                    customModuleId: moduleId.value,
                    name: 'Settings Backups',
                    shorty: 'settings_backups',
                    description: 'Automatic backups of extension settings'
                }, moduleId.value);
            }

            if (category) {
                const newBackup: SettingsBackup = {
                    timestamp: Date.now(),
                    settings: JSON.parse(JSON.stringify(settings.value)),
                    summary
                };

                await createCustomDataValue({
                    dataCategoryId: category.id,
                    value: JSON.stringify(newBackup)
                }, moduleId.value);

                // Load existing and prune
                const existing = await getCustomDataValues<SettingsBackup>(category.id, moduleId.value);
                const sorted = existing.sort((a, b) => b.timestamp - a.timestamp);

                if (sorted.length > MAX_BACKUPS) {
                    const toDelete = sorted.slice(MAX_BACKUPS);
                    for (const b of toDelete) {
                        if ((b as any).id) {
                            await deleteCustomDataValue(category.id, (b as any).id, moduleId.value);
                        }
                    }
                }

                // Refresh local list
                await loadBackups();
            }
        } catch (e) {
            console.error('Backup creation failed', e);
        }
    }

    async function saveSettings(summary: string = 'Settings updated') {
        if (!moduleId.value) return;

        // Save to localStorage first
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value));
        applyTheme(settings.value.theme); // Re-apply theme in case it changed

        try {
            // Create backup first (safety)
            await createBackup(summary);

            const category = await getCustomDataCategory<object>('settings', moduleId.value);
            if (category) {
                const values = await getCustomDataValues<Settings>(category.id, moduleId.value);
                if (values.length > 0) {
                    const existingId = (values[0] as any).id;
                    await updateCustomDataValue(
                        category.id,
                        existingId,
                        { value: JSON.stringify(settings.value) },
                        moduleId.value
                    );
                } else {
                    await createCustomDataValue({
                        dataCategoryId: category.id,
                        value: JSON.stringify(settings.value)
                    }, moduleId.value);
                }
            }
        } catch (e) {
            console.error('Failed to save settings', e);
            error.value = 'Failed to save settings';
        }
    }

    async function restoreBackup(backup: SettingsBackup) {
        if (!moduleId.value) return;
        try {
            // Confirmation should be handled in UI
            settings.value = { ...settings.value, ...backup.settings };
            await saveSettings(`Restored from backup: ${new Date(backup.timestamp).toLocaleString()}`);
        } catch (e) {
            console.error('Restore failed', e);
            throw e;
        }
    }

    function setTheme(newTheme: 'light' | 'dark' | 'system') {
        settings.value.theme = newTheme;
        saveSettings();
    }

    function setLanguage(lang: 'de' | 'en' | 'auto') {
        settings.value.language = lang;
        saveSettings();
        // The actual i18n update will happen via watcher in App.vue or explicit call
    }

    const initTheme = initLocalSettings;

    return {
        settings,
        isLoading,
        error,
        moduleId,
        isInitialized,
        backups,
        currentView,
        activeTab,
        // Actions
        init,
        initTheme,
        saveSettings,
        saveUIState,
        setTheme,
        setLanguage,
        loadBackups,
        restoreBackup
    };
});
