/**
 * Internationalization (i18n) Utility
 * 
 * Provides translation functionality for the Time Tracker extension.
 * Designed to be easily adaptable for ChurchTools native i18n when available.
 */

export type Language = 'de' | 'en';

export interface Translations {
    common: Record<string, any>;
    dashboard: Record<string, any>;
    timeEntries: Record<string, any>;
    absences: Record<string, any>;
    reports: Record<string, any>;
    admin: Record<string, any>;
}

let currentLanguage: Language = 'en';
let translations: Translations | null = null;

/**
 * Initialize i18n with a specific language
 * @param language - Language code ('de' or 'en')
 */
export async function initI18n(language: Language): Promise<void> {
    currentLanguage = language;

    // Load translations dynamically
    // Future: This can be replaced with ChurchTools API call
    try {
        if (language === 'de') {
            translations = (await import('../locales/de.json')).default as Translations;
        } else {
            translations = (await import('../locales/en.json')).default as Translations;
        }
    } catch (error) {
        console.error('[i18n] Failed to load translations:', error);
        // Fallback to English
        translations = (await import('../locales/en.json')).default as Translations;
    }
}

/**
 * Detect browser language and return supported language code
 * @returns Language code based on browser language or fallback
 */
export function detectBrowserLanguage(): Language {
    const browserLang = navigator.language.toLowerCase();

    // Check if German
    if (browserLang.startsWith('de')) {
        return 'de';
    }

    // Default to English
    return 'en';
}

/**
 * Translate a key to the current language
 * @param key - Translation key in format "namespace.key" or "namespace.nested.key"
 * @returns Translated string or key if translation not found
 */
export function t(key: string): string {
    if (!translations) {
        console.warn('[i18n] Translations not loaded, returning key:', key);
        return key;
    }

    const parts = key.split('.');
    const namespace = parts[0];

    if (!namespace || !translations[namespace as keyof Translations]) {
        console.warn('[i18n] Namespace not found:', namespace);
        return key;
    }

    let current: any = translations[namespace as keyof Translations];

    // Traverse the object path
    for (let i = 1; i < parts.length; i++) {
        if (current[parts[i]] === undefined) {
            console.warn('[i18n] Translation key not found:', key);
            return key;
        }
        current = current[parts[i]];
    }

    if (typeof current !== 'string') {
        console.warn('[i18n] Key does not resolve to a string:', key);
        return key;
    }

    return current;
}

/**
 * Get current language
 * @returns Current language code
 */
export function getCurrentLanguage(): Language {
    return currentLanguage;
}

/**
 * Change language and reload translations
 * @param language - New language code
 */
export async function changeLanguage(language: Language): Promise<void> {
    await initI18n(language);
}
