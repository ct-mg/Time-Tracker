import type { Person } from './utils/ct-types';
import type { ExtensionContext, EntryPoint } from './types/extension';
import { churchtoolsClient } from '@churchtools/churchtools-client';

// Re-export types for convenience
export type { ExtensionContext, EntryPoint };

// only import reset.css in development mode to keep the production bundle small and to simulate CT environment
if (import.meta.env.MODE === 'development') {
    import('./utils/reset.css');
}

declare const window: Window &
    typeof globalThis & {
        settings: {
            base_url?: string;
        };
    };

const KEY = import.meta.env.VITE_KEY;
export { KEY };

// Track initialization state
let isInitialized = false;

/**
 * Initialize the ChurchTools client
 */
async function initializeChurchToolsClient(): Promise<void> {
    if (isInitialized) {
        return;
    }

    const baseUrl = window.settings?.base_url ?? import.meta.env.VITE_BASE_URL;
    churchtoolsClient.setBaseUrl(baseUrl);

    // Auto-login in development mode
    const username = import.meta.env.VITE_USERNAME;
    const password = import.meta.env.VITE_PASSWORD;
    if (import.meta.env.MODE === 'development' && username && password) {
        await churchtoolsClient.post('/login', { username, password });
    }

    isInitialized = true;
}

/**
 * Render an extension to a specific div using a custom entry point
 * @param divId - The ID of the div element to render into
 * @param entryPoint - The entry point function to execute
 */
export async function renderExtension(divId: string, entryPoint: EntryPoint): Promise<void> {
    // Initialize ChurchTools client if not already initialized
    await initializeChurchToolsClient();

    // Get the target element
    const element = document.querySelector<HTMLElement>(`#${divId}`);
    if (!element) {
        throw new Error(`Element with id "${divId}" not found`);
    }

    // Fetch current user
    const user = await churchtoolsClient.get<Person>('/whoami');

    // Create context
    const context: ExtensionContext = {
        churchtoolsClient,
        user,
        element,
        KEY,
    };

    // Execute entry point
    await entryPoint(context);
}

// Default behavior for development mode
if (import.meta.env.MODE === 'development') {
    // Default entry point for development
    const defaultEntryPoint: EntryPoint = ({ user, element }) => {
        element.innerHTML = `
            <div style="display: flex; place-content: center; place-items: center; height: 100vh;">
                <h1>Welcome ${[user.firstName, user.lastName].join(' ')}</h1>
            </div>
        `;
    };

    // Auto-render in development mode
    renderExtension('app', defaultEntryPoint).catch(console.error);
}
