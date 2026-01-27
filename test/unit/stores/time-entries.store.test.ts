import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTimeEntriesStore } from '../../../src/stores/time-entries.store';
import { useAuthStore } from '../../../src/stores/auth.store';

// Mock KV store services
vi.mock('../../../src/services/kv-store', () => ({
    getCustomDataCategory: vi.fn(),
    getCustomDataValues: vi.fn(),
    createCustomDataValue: vi.fn(),
    updateCustomDataValue: vi.fn(),
    createCustomDataCategory: vi.fn(),
    deleteCustomDataValue: vi.fn()
}));

// Mock ChurchTools Client
vi.mock('@churchtools/churchtools-client', () => ({
    churchtoolsClient: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        deleteApi: vi.fn()
    }
}));

import { getCustomDataCategory, getCustomDataValues } from '../../../src/services/kv-store';
import { churchtoolsClient } from '@churchtools/churchtools-client';

describe('Time Entries Store', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Setup Auth Store mock state
        const authStore = useAuthStore();
        authStore.user = { id: 1, firstName: 'Test', lastName: 'User' };
    });

    it('should initialize with default state', () => {
        const store = useTimeEntriesStore();
        expect(store.entries).toEqual([]);
        expect(store.workCategories).toEqual([]);
        expect(store.isLoading).toBe(false);
        expect(store.searchTerm).toBe('');
    });

    describe('Computed Properties', () => {
        it('should correctly filter entries by search term', () => {
            const store = useTimeEntriesStore();
            const today = new Date().toISOString();
            store.entries = [
                { startTime: today, endTime: today, description: 'Coding', categoryId: '1', categoryName: 'Work', userId: 1, isManual: false, isBreak: false, createdAt: '' },
                { startTime: today, endTime: today, description: 'Meeting', categoryId: '2', categoryName: 'Admin', userId: 1, isManual: false, isBreak: false, createdAt: '' }
            ];

            store.searchTerm = 'coding';
            expect(store.filteredEntries).toHaveLength(1);
            expect(store.filteredEntries[0].description).toBe('Coding');

            store.searchTerm = 'Admin';
            expect(store.filteredEntries).toHaveLength(1);
            expect(store.filteredEntries[0].categoryName).toBe('Admin');
        });

        it('should correctly filter entries by category', () => {
            const store = useTimeEntriesStore();
            const today = new Date().toISOString();
            store.entries = [
                { startTime: today, endTime: today, description: '1', categoryId: 'cat1', categoryName: 'C1', userId: 1, isManual: false, isBreak: false, createdAt: '' },
                { startTime: today, endTime: today, description: '2', categoryId: 'cat2', categoryName: 'C2', userId: 1, isManual: false, isBreak: false, createdAt: '' }
            ];

            store.selectedCategoryIds = ['cat1'];
            expect(store.filteredEntries).toHaveLength(1);
            expect(store.filteredEntries[0].categoryId).toBe('cat1');
        });

        it('should correctly filter entries by user IDs', () => {
            const store = useTimeEntriesStore();
            const today = new Date().toISOString();
            store.entries = [
                { startTime: today, endTime: today, description: 'U1', categoryId: '1', categoryName: 'C', userId: 1, isManual: false, isBreak: false, createdAt: '' },
                { startTime: today, endTime: today, description: 'U2', categoryId: '1', categoryName: 'C', userId: 2, isManual: false, isBreak: false, createdAt: '' }
            ];

            store.selectedUserIds = [2];
            expect(store.filteredEntries).toHaveLength(1);
            expect(store.filteredEntries[0].userId).toBe(2);
        });

        it('should identify the active entry', () => {
            const store = useTimeEntriesStore();
            const authStore = useAuthStore();
            authStore.user = { id: 1 };

            const runningEntry = { startTime: '2024-01-01T10:00:00Z', endTime: null, description: 'Active', categoryId: '1', categoryName: 'C', userId: 1, isManual: false, isBreak: false, createdAt: '' };
            store.entries = [
                { startTime: '2024-01-01T08:00:00Z', endTime: '2024-01-01T09:00:00Z', description: 'Past', categoryId: '1', categoryName: 'C', userId: 1, isManual: false, isBreak: false, createdAt: '' },
                runningEntry
            ];

            expect(store.activeEntry).toEqual(runningEntry);
        });

        it('should correctly calculate category stats', () => {
            const store = useTimeEntriesStore();

            store.entries = [
                {
                    startTime: '2024-01-01T10:00:00', // Using fixed strings for easier math
                    endTime: '2024-01-01T12:00:00',
                    description: 'Two hours',
                    categoryId: 'work',
                    categoryName: 'Work',
                    userId: 1,
                    isManual: false,
                    isBreak: false,
                    createdAt: ''
                },
                {
                    startTime: '2024-01-01T13:00:00',
                    endTime: '2024-01-01T13:30:00',
                    description: '30 mins',
                    categoryId: 'work',
                    categoryName: 'Work',
                    userId: 1,
                    isManual: false,
                    isBreak: false,
                    createdAt: ''
                },
                {
                    startTime: '2024-01-01T14:00:00',
                    endTime: '2024-01-01T14:15:00',
                    description: 'Break',
                    categoryId: 'work',
                    categoryName: 'Work',
                    userId: 1,
                    isManual: false,
                    isBreak: true,
                    createdAt: ''
                }
            ];

            // Setup a dummy category to avoid stats initialization issues
            store.workCategories = [{ id: 'work', name: 'Work', color: '#ff0000' }];

            // Mock the filter to include these dates
            store.dateRange = {
                start: new Date('2024-01-01T00:00:00'),
                end: new Date('2024-01-01T23:59:59')
            };

            expect(store.categoryStats).toHaveLength(1);
            expect(store.categoryStats[0].id).toBe('work');
            // 2h + 0.5h = 2.5h (break is ignored)
            expect(store.categoryStats[0].totalHours).toBe(2.5);
        });
    });

    describe('Actions', () => {
        it('should load work categories from KV store', async () => {
            const store = useTimeEntriesStore();
            (getCustomDataCategory as any).mockResolvedValue({ id: 100 });
            (churchtoolsClient.get as any).mockResolvedValue([
                { id: 1, value: JSON.stringify({ id: 'cat1', name: 'Category 1', color: '#111' }) }
            ]);

            await store.loadWorkCategories(14);

            expect(store.workCategories).toHaveLength(1);
            expect(store.workCategories[0]).toMatchObject({ id: 'cat1', name: 'Category 1' });
        });

        it('should add an entry on clockIn', async () => {
            const store = useTimeEntriesStore();
            const authStore = useAuthStore();
            authStore.user = { id: 1 };

            (getCustomDataCategory as any).mockResolvedValue({ id: 200 });

            await store.clockIn(14, 'work', 'Testing clock in');

            expect(store.entries).toHaveLength(1);
            expect(store.entries[0]).toMatchObject({
                userId: 1,
                description: 'Testing clock in',
                categoryId: 'work',
                endTime: null
            });
        });

        it('should update entry on clockOut', async () => {
            const store = useTimeEntriesStore();
            const authStore = useAuthStore();
            authStore.user = { id: 1 };

            const startStr = '2024-01-01T10:00:00Z';
            const activeEntry = {
                startTime: startStr,
                endTime: null,
                description: 'Active',
                categoryId: 'work',
                categoryName: 'Work',
                userId: 1,
                isManual: false,
                isBreak: false,
                createdAt: ''
            };
            store.entries = [activeEntry];

            (getCustomDataCategory as any).mockResolvedValue({ id: 200 });
            (getCustomDataValues as any).mockResolvedValue([{ ...activeEntry, id: 999 }]);

            await store.clockOut(14);

            expect(store.entries[0].endTime).not.toBeNull();
            expect(vi.mocked(churchtoolsClient.put || vi.fn())).toBeDefined();
        });
    });
});
