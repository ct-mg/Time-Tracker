import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Settings } from '../types/time-tracker';
import { getCustomDataCategory, getCustomDataValues, createCustomDataValue, updateCustomDataValue, getModule } from '../services/kv-store';

export const useSettingsStore = defineStore('settings', () => {
    const settings = ref<Settings>({
        defaultHoursPerDay: 8,
        defaultHoursPerWeek: 40,
        excelImportEnabled: false,
        workWeekDays: [1, 2, 3, 4, 5],
    });
    const isLoading = ref(false);
    const error = ref<string | null>(null);
    const moduleId = ref<number | null>(null);

    // Theme Management
    const theme = ref<'light' | 'dark' | 'system'>('system');

    function applyTheme() {
        const isDark = theme.value === 'dark' || (theme.value === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }

    function setTheme(newTheme: 'light' | 'dark' | 'system') {
        theme.value = newTheme;
        localStorage.setItem('churchtools-tracker-theme', newTheme);
        applyTheme();
    }

    function initTheme() {
        const stored = localStorage.getItem('churchtools-tracker-theme') as any;
        if (stored && ['light', 'dark', 'system'].includes(stored)) {
            theme.value = stored;
        } else {
            theme.value = 'system';
        }
        applyTheme();

        // Listen for system changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (theme.value === 'system') {
                applyTheme();
            }
        });
    }

    // Initial load
    async function init(key: string) {
        initTheme();
        isLoading.value = true;
        try {
            const module = await getModule(key);
            moduleId.value = module.id;
            await loadSettings(module.id);
        } catch (e) {
            console.error('Failed to init settings', e);
            error.value = 'Failed to init settings';
        } finally {
            isLoading.value = false;
        }
    }

    async function loadSettings(module_id: number) {
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

    return {
        settings,
        isLoading,
        error,
        moduleId,
        // Theme exports
        theme,
        setTheme,
        // Core Actions
        loadSettings,
        saveSettings,
        init,
        initTheme,
    };
});
