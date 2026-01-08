import { defineStore } from 'pinia';
import { ref } from 'vue';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
    id: number;
    message: string;
    type: ToastType;
    duration?: number;
}

export const useToastStore = defineStore('toast', () => {
    const toasts = ref<Toast[]>([]);
    let nextId = 1;

    function addToast(message: string, type: ToastType = 'success', duration: number = 4000) {
        const id = nextId++;
        toasts.value.push({ id, message, type, duration });

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }

        return id;
    }

    function removeToast(id: number) {
        const index = toasts.value.findIndex(t => t.id === id);
        if (index !== -1) {
            toasts.value.splice(index, 1);
        }
    }

    function success(message: string, duration?: number) {
        return addToast(message, 'success', duration);
    }

    function error(message: string, duration?: number) {
        return addToast(message, 'error', duration);
    }

    function info(message: string, duration?: number) {
        return addToast(message, 'info', duration);
    }

    function warning(message: string, duration?: number) {
        return addToast(message, 'warning', duration);
    }

    return {
        toasts,
        addToast,
        removeToast,
        success,
        error,
        info,
        warning
    };
});
