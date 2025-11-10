/**
 * ChurchTools Extension Boilerplate
 *
 * Main exports for the extension library
 */

// Core functionality
export { renderExtension, KEY } from './main';

// Types
export type { ExtensionContext, EntryPoint } from './types/extension';

// Example entry points
export {
    welcomeEntryPoint,
    userInfoEntryPoint,
    dataViewerEntryPoint,
} from './entry-points';
