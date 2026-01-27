import { setActivePinia, createPinia } from 'pinia';
import { vi, beforeEach } from 'vitest';
import { mockChurchtoolsClient } from './helpers/mocks';

/**
 * Global test setup for Vitest
 * This file is automatically loaded before each test file
 */

// Create a fresh Pinia instance before each test
beforeEach(() => {
    setActivePinia(createPinia());
});

// Mock i18n globally
vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
        locale: { value: 'en' },
    }),
    createI18n: vi.fn(() => ({
        global: {
            t: (key: string) => key,
            locale: 'en',
        },
    })),
}));

// Mock ChurchTools extension context
vi.mock('../src/lib/main', () => ({
    getContext: vi.fn(() => ({
        moduleId: 14,
        name: 'timetracker',
    })),
}));

// Mock ChurchTools Client
vi.mock('@churchtools/churchtools-client', () => ({
    churchtoolsClient: mockChurchtoolsClient,
}));
