/**
 * Internationalization (i18n) Utility
 * 
 * Provides translation functionality for the Time Tracker extension.
 * Designed to be easily adaptable for ChurchTools native i18n when available.
 */

export type Language = 'de' | 'en';

export interface Translations {
    common: Record<string, string>;
    dashboard: Record<string, string>;
    timeEntries: Record<string, string>;
    absences: Record<string, string>;
    reports: Record<string, string>;
    admin: Record<string, string>;
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
 * @param key - Translation key in format "namespace.key" (e.g., "common.save")
 * @returns Translated string or key if translation not found
 */
export function t(key: string): string {
    if (!translations) {
        console.warn('[i18n] Translations not loaded, returning key:', key);
        return key;
    }
    
    const [namespace, ...keyParts] = key.split('.');
    const actualKey = keyParts.join('.');
    
    const namespaceTranslations = translations[namespace as keyof Translations];
    
    if (!namespaceTranslations) {
        console.warn('[i18n] Namespace not found:', namespace);
        return key;
    }
    
    const translation = namespaceTranslations[actualKey];
    
    if (!translation) {
        console.warn('[i18n] Translation not found:', key);
        return key;
    }
    
    return translation;
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
