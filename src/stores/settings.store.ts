import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Settings } from '../types/time-tracker';
import { getCustomDataCategory, getCustomDataValues, createCustomDataValue, updateCustomDataValue, getModule } from '../services/kv-store';

interface UserSettings extends Settings {
    theme: 'light' | 'dark' | 'system';
    language: 'de' | 'en' | 'auto';
}

const STORAGE_KEY = 'ct-extension-timetracker-settings-v2';

export const useSettingsStore = defineStore('settings', () => {
    const settings = ref<UserSettings>({
        defaultHoursPerDay: 8,
        defaultHoursPerWeek: 40,
        excelImportEnabled: false,
        workWeekDays: [1, 2, 3, 4, 5],
        theme: 'system',
        language: 'auto',
    });
    const isLoading = ref(false);
    const error = ref<string | null>(null);
    const moduleId = ref<number | null>(null);
    const isInitialized = ref(false);

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
        applyTheme(settings.value.theme);
        // Language is applied in App.vue via watcher or initial load

        // Listen for system changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (settings.value.theme === 'system') {
                applyTheme(settings.value.theme);
            }
        });
    }

    // Initial load
    async function init(key: string) {
        if (isInitialized.value) return;

        initLocalSettings(); // Load local settings first

        isLoading.value = true;
        try {
            const module = await getModule(key);
            moduleId.value = module.id;
            await loadRemoteSettings(module.id);
            isInitialized.value = true;
        } catch (e) {
            console.error('Failed to init settings', e);
            error.value = 'Failed to init settings';
        } finally {
            isLoading.value = false;
        }
    }

    async function loadRemoteSettings(module_id: number) {
        isLoading.value = true;
        moduleId.value = module_id;
        try {
            const category = await getCustomDataCategory<object>('settings');
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

    async function saveSettings() {
        if (!moduleId.value) return;

        // Save to localStorage first
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value));
        applyTheme(settings.value.theme); // Re-apply theme in case it changed

        try {
            const category = await getCustomDataCategory<object>('settings');
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
        // Actions
        init,
        initTheme,
        saveSettings,
        setTheme,
        setLanguage
    };
});
