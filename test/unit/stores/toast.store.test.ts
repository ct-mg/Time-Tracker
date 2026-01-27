import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useToastStore } from '../../../src/stores/toast.store';

describe('Toast Store', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    it('should initialize with an empty array of toasts', () => {
        const store = useToastStore();
        expect(store.toasts).toEqual([]);
    });

    it('should add a toast with success type by default', () => {
        const store = useToastStore();
        store.success('Success message');

        expect(store.toasts).toHaveLength(1);
        expect(store.toasts[0]).toMatchObject({
            message: 'Success message',
            type: 'success',
            duration: 4000
        });
        expect(store.toasts[0].id).toBeDefined();
    });

    it('should add an error toast', () => {
        const store = useToastStore();
        store.error('Error message');

        expect(store.toasts).toHaveLength(1);
        expect(store.toasts[0]).toMatchObject({
            message: 'Error message',
            type: 'error'
        });
    });

    it('should add an info toast', () => {
        const store = useToastStore();
        store.info('Info message');

        expect(store.toasts).toHaveLength(1);
        expect(store.toasts[0]).toMatchObject({
            message: 'Info message',
            type: 'info'
        });
    });

    it('should add a warning toast', () => {
        const store = useToastStore();
        store.warning('Warning message');

        expect(store.toasts).toHaveLength(1);
        expect(store.toasts[0]).toMatchObject({
            message: 'Warning message',
            type: 'warning'
        });
    });

    it('should remove a toast manually', () => {
        const store = useToastStore();
        const id = store.success('Test toast');
        expect(store.toasts).toHaveLength(1);

        store.removeToast(id);
        expect(store.toasts).toHaveLength(0);
    });

    it('should automatically remove a toast after the specified duration', () => {
        const store = useToastStore();
        store.success('Timed toast', 2000);

        expect(store.toasts).toHaveLength(1);

        // Fast-forward time
        vi.advanceTimersByTime(2000);

        expect(store.toasts).toHaveLength(0);
    });

    it('should not automatically remove a toast if duration is 0', () => {
        const store = useToastStore();
        store.addToast('Persistent toast', 'info', 0);

        expect(store.toasts).toHaveLength(1);

        vi.advanceTimersByTime(10000);

        expect(store.toasts).toHaveLength(1);
    });

    it('should generate incrementing IDs', () => {
        const store = useToastStore();
        const id1 = store.success('First');
        const id2 = store.success('Second');

        expect(id2).toBeGreaterThan(id1);
    });

    it('should manage multiple toasts independently', () => {
        const store = useToastStore();
        store.success('Toast 1', 1000);
        store.success('Toast 2', 3000);

        expect(store.toasts).toHaveLength(2);

        vi.advanceTimersByTime(1000);
        expect(store.toasts).toHaveLength(1);
        expect(store.toasts[0].message).toBe('Toast 2');

        vi.advanceTimersByTime(2000);
        expect(store.toasts).toHaveLength(0);
    });
});
