import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from '../App.vue';
import '../style.css';
import { useSettingsStore } from '../stores/settings.store';
import { useAuthStore } from '../stores/auth.store';
import i18n from '../utils/i18n';
import type { EntryPoint } from '../lib/main';
import type { MainModuleData } from '@churchtools/extension-points/main';

/**
 * Main Entry Point for the Time Tracker Extension (Vue 3)
 */
const mainEntryPoint: EntryPoint<MainModuleData> = async ({ element, churchtoolsClient: _ctClient, user, KEY }) => {
    // Ensure the container has the expected ID for scoping
    element.id = 'time-tracker-root';

    // Create Vue App
    const app = createApp(App);
    const pinia = createPinia();

    app.use(pinia);
    app.use(i18n);

    // Initialize Stores
    const settingsStore = useSettingsStore();
    const authStore = useAuthStore();

    // Initialize settings (fetches module ID)
    settingsStore.init(KEY);

    // Set initial data
    if (user) {
        authStore.setUser(user);
    }

    // Trigger permission checks
    authStore.checkPermissions();

    // Mount
    app.mount(element);

    console.log('[Time Tracker] Vue App Mounted');

    // Return cleanup function
    return () => {
        app.unmount();
        console.log('[Time Tracker] Vue App Unmounted');
    };
};

export default mainEntryPoint;
