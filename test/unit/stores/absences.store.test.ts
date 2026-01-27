import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAbsencesStore } from '../../../src/stores/absences.store';
import { useAuthStore } from '../../../src/stores/auth.store';
import { mockChurchtoolsClient } from '../../helpers/mocks';

describe('Absences Store', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    it('should load absence categories correctly', async () => {
        const store = useAbsencesStore();
        const mockMasterData = {
            absenceReasons: [
                { id: 1, name: 'Urlaub', nameTranslated: 'Urlaub', color: '#ff0000', shortName: 'U' },
                { id: 2, name: 'Krank', nameTranslated: 'Krank', color: '#00ff00', shortName: 'K' }
            ]
        };
        mockChurchtoolsClient.get.mockResolvedValue(mockMasterData);

        await store.loadAbsenceCategories();

        expect(store.categories).toHaveLength(2);
        expect(store.categories[0].name).toBe('Urlaub');
        expect(store.categories[1].shortName).toBe('K');
    });

    it('should load absences for current user', async () => {
        const authStore = useAuthStore();
        authStore.user = { id: 123, firstName: 'Test', lastName: 'User' };

        const store = useAbsencesStore();
        const mockAbsences = [
            {
                id: 1,
                absenceReason: { id: 1 },
                startDate: '2024-01-01',
                endDate: '2024-01-02',
                comment: 'Test',
                startTime: null,
                endTime: null
            }
        ];
        mockChurchtoolsClient.get.mockResolvedValue(mockAbsences);

        await store.loadAbsences();

        expect(store.absences).toHaveLength(1);
        expect(store.absences[0].id).toBe(1);
        expect(store.absences[0].isFullDay).toBe(true);
        expect(mockChurchtoolsClient.get).toHaveBeenCalledWith('/persons/123/absences', expect.any(Object));
    });

    it('should save a new absence', async () => {
        const authStore = useAuthStore();
        authStore.user = { id: 123 };

        const store = useAbsencesStore();
        const absenceData = {
            absenceReasonId: 1,
            startDate: '2024-01-01',
            endDate: '2024-01-01',
            isFullDay: true
        };

        mockChurchtoolsClient.post.mockResolvedValue({ id: 99 });
        mockChurchtoolsClient.get.mockResolvedValue([]); // for the reload

        await store.saveAbsence(absenceData);

        expect(mockChurchtoolsClient.post).toHaveBeenCalledWith('/persons/123/absences', expect.objectContaining({
            absenceReasonId: 1,
            startDate: '2024-01-01'
        }));
    });
});
