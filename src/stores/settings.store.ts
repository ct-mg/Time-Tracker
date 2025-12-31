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

    // Initial load
    async function init(key: string) {
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

                    // Handle special cases handled in legacy code (like report period)
                    // The view will read from this store directly.
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
        loadSettings,
        saveSettings,
        init,
        moduleId
    };
});
