import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initI18n, t, detectBrowserLanguage } from '../../src/utils/i18n';

describe('i18n', () => {
    beforeEach(() => {
        // Reset module state between tests
        vi.resetModules();
    });

    describe('detectBrowserLanguage', () => {
        it('should return de for German browser language', () => {
            Object.defineProperty(window.navigator, 'language', {
                writable: true,
                configurable: true,
                value: 'de-DE',
            });
            expect(detectBrowserLanguage()).toBe('de');
        });

        it('should return en for English browser language', () => {
            Object.defineProperty(window.navigator, 'language', {
                writable: true,
                configurable: true,
                value: 'en-US',
            });
            expect(detectBrowserLanguage()).toBe('en');
        });

        it('should return en for unsupported language', () => {
            Object.defineProperty(window.navigator, 'language', {
                writable: true,
                configurable: true,
                value: 'fr-FR',
            });
            expect(detectBrowserLanguage()).toBe('en');
        });
    });

    describe('t', () => {
        it('should return translation key when not initialized', () => {
            const key = 'test.key';
            // Before initialization, should return the key itself
            const result = t(key);
            expect(result).toContain(key);
        });

        it('should warn when translations not loaded', () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
            t('test.key');
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('initI18n', () => {
        it('should initialize without errors', async () => {
            await expect(initI18n()).resolves.not.toThrow();
        });

        it('should load translations after initialization', async () => {
            await initI18n();
            // After init, t() should return actual translations
            const result = t('ct.extension.timetracker.common.save');
            expect(result).toBeTruthy();
            expect(result).not.toContain('Translations not loaded');
        });
    });
});
