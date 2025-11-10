import type { Person } from '../utils/ct-types';
import type { churchtoolsClient } from '@churchtools/churchtools-client';

/**
 * Context provided to entry points when rendering an extension
 */
export interface ExtensionContext {
    /** The ChurchTools API client instance */
    churchtoolsClient: typeof churchtoolsClient;
    /** The currently logged-in user */
    user: Person;
    /** The DOM element where the extension should render */
    element: HTMLElement;
    /** The extension key (optional) */
    KEY?: string;
}

/**
 * Entry point function type
 * This function receives the extension context and can render content
 * or perform any initialization needed for the extension
 */
export type EntryPoint = (context: ExtensionContext) => Promise<void> | void;
