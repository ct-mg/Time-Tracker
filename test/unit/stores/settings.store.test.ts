import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useSettingsStore } from '../../../src/stores/settings.store';

// Mock KV store services
vi.mock('../../../src/services/kv-store', () => ({
    getCustomDataCategory: vi.fn(),
    getCustomDataValues: vi.fn(),
    createCustomDataValue: vi.fn(),
    updateCustomDataValue: vi.fn(),
    getModule: vi.fn()
}));

import { getCustomDataCategory, getCustomDataValues, getModule } from '../../../src/services/kv-store';

describe('Settings Store', () => {
    const STORAGE_KEY = 'ct-extension-timetracker-settings-v2';

    beforeEach(() => {
        // Mock localStorage
        const localStorageMock = (() => {
            let store: Record<string, string> = {};
            return {
                getItem: vi.fn((key: string) => store[key] || null),
                setItem: vi.fn((key: string, value: string) => { store[key] = value }),
                clear: vi.fn(() => { store = {} })
            };
        })();
        Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

        // Mock matchMedia
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: vi.fn().mockImplementation(query => ({
                matches: false,
                media: query,
                onchange: null,
                addListener: vi.fn(), // Deprecated
                removeListener: vi.fn(), // Deprecated
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        });

        // Mock documentElement
        Object.defineProperty(document, 'documentElement', {
            value: {
                classList: {
                    add: vi.fn(),
                    remove: vi.fn()
                }
            },
            writable: true
        });

        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should initialize with default settings', () => {
        const store = useSettingsStore();
        expect(store.settings).toMatchObject({
            defaultHoursPerDay: 8,
            defaultHoursPerWeek: 40,
            theme: 'system',
            language: 'auto'
        });
    });

    it('should load settings from localStorage on initLocalSettings', () => {
        const savedSettings = {
            defaultHoursPerDay: 7,
            theme: 'dark'
        };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedSettings));

        const store = useSettingsStore();
        // Since initLocalSettings is called inside useSettingsStore or explicitly, 
        // in our implementation it's often called manually or via init.
        // Let's test the behavior of the internal logic.

        // We can't easily wait for internal init in a Pinia setup without a wrapper, 
        // but we can call initTheme (which is exposed as initLocalSettings)
        store.initTheme();

        expect(store.settings.defaultHoursPerDay).toBe(7);
        expect(store.settings.theme).toBe('dark');
        expect(document.documentElement.classList.add).toHaveBeenCalledWith('dark');
    });

    it('should set theme and save', async () => {
        const store = useSettingsStore();
        store.moduleId = 14;

        (getCustomDataCategory as any).mockResolvedValue({ id: 10 });
        (getCustomDataValues as any).mockResolvedValue([]);

        store.setTheme('light');

        expect(store.settings.theme).toBe('light');
        expect(window.localStorage.setItem).toHaveBeenCalled();
        expect(document.documentElement.classList.remove).toHaveBeenCalledWith('dark');
    });

    it('should set language and save', async () => {
        const store = useSettingsStore();
        store.moduleId = 14;

        (getCustomDataCategory as any).mockResolvedValue({ id: 10 });
        (getCustomDataValues as any).mockResolvedValue([]);

        store.setLanguage('de');

        expect(store.settings.language).toBe('de');
        expect(window.localStorage.setItem).toHaveBeenCalled();
    });

    it('should load remote settings', async () => {
        const remoteSettings = {
            defaultHoursPerDay: 6,
            workWeekDays: [1, 2, 3]
        };

        (getCustomDataCategory as any).mockResolvedValue({ id: 10 });
        (getCustomDataValues as any).mockResolvedValue([remoteSettings]);
        (getModule as any).mockResolvedValue({ id: 14 });

        const store = useSettingsStore();
        await store.init('test-key');

        expect(store.settings.defaultHoursPerDay).toBe(6);
        expect(store.settings.workWeekDays).toEqual([1, 2, 3]);
        expect(store.isInitialized).toBe(true);
    });

    it('should handle missing remote settings by keeping defaults/local', async () => {
        (getCustomDataCategory as any).mockResolvedValue({ id: 10 });
        (getCustomDataValues as any).mockResolvedValue([]);
        (getModule as any).mockResolvedValue({ id: 14 });

        const store = useSettingsStore();
        await store.init('test-key');

        expect(store.settings.defaultHoursPerDay).toBe(8); // Default
        expect(store.isInitialized).toBe(true);
    });

    it('should handle API errors during init', async () => {
        (getModule as any).mockRejectedValue(new Error('API Error'));

        const store = useSettingsStore();
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        await store.init('test-key');

        expect(store.error).toBe('Failed to init settings');
        expect(store.isInitialized).toBe(false);

        consoleSpy.mockRestore();
    });
});
