/**
 * Notification Service
 * 
 * Standardized utility for showing notifications across the extension.
 * Wraps the native ChurchTools extension event emission.
 */
export class NotificationService {
    private emit: (event: string, ...args: any[]) => void;

    constructor(emit: (event: string, ...args: any[]) => void) {
        this.emit = emit;
    }

    /**
     * Show a standardized notification
     * @param message The message to display
     * @param type 'success' | 'error' | 'warning'
     * @param duration Duration in ms (default 3000)
     */
    private show(message: string, type: 'success' | 'error' | 'warning', duration: number = 3000) {
        this.emit('notification:show', {
            message,
            type,
            duration,
        });
    }

    /**
     * Show a success notification (green)
     */
    showSuccess(message: string, duration?: number) {
        this.show(message, 'success', duration);
    }

    /**
     * Show an error notification (red)
     */
    showError(message: string, duration?: number) {
        this.show(message, 'error', duration);
    }

    /**
     * Show a warning notification (yellow/orange)
     */
    showWarning(message: string, duration?: number) {
        this.show(message, 'warning', duration);
    }

    /**
     * Show a notification with specified type (backward compatible API)
     * @param message The message to display
     * @param type 'success' | 'error' | 'warning'
     * @param duration Duration in ms (optional)
     */
    showNotification(message: string, type: 'success' | 'error' | 'warning' = 'success', duration?: number) {
        this.show(message, type, duration);
    }
}
