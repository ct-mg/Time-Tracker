import { createI18n } from 'vue-i18n';
import de from '../locales/de.json';
import en from '../locales/en.json';

export type MessageSchema = typeof en;
export type Language = 'de' | 'en';

/**
 * Detect browser language and return supported language code
 */
function detectBrowserLanguage(): Language {
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('de')) {
        return 'de';
    }
    return 'en';
}

const i18n = createI18n<[MessageSchema], Language>({
    legacy: false, // Use Composition API
    locale: detectBrowserLanguage(), // Set initial locale
    fallbackLocale: 'en', // Set fallback
    messages: {
        de,
        en,
    },
});

export default i18n;

export function setLanguage(lang: Language | 'auto') {
    const targetLang = lang === 'auto' ? detectBrowserLanguage() : lang;

    // Type assertion needed because i18n.global.locale is a Ref in legacy: false mode
    // but TypeScript might not infer it correctly depending on strict settings
    // @ts-ignore
    i18n.global.locale.value = targetLang;

    document.querySelector('html')?.setAttribute('lang', targetLang);
}
