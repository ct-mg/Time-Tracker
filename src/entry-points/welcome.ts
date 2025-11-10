import type { EntryPoint } from '../main';

/**
 * Simple welcome message entry point
 * Displays a welcome message with the user's name
 */
export const welcomeEntryPoint: EntryPoint = ({ user, element }) => {
    element.innerHTML = `
        <div style="display: flex; place-content: center; place-items: center; height: 100vh;">
            <h1>Welcome ${[user.firstName, user.lastName].join(' ')}</h1>
        </div>
    `;
};
