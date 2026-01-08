import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import type { Absence, AbsenceCategory } from '../types/time-tracker';
import { useAuthStore } from './auth.store';
import { format, subDays, addDays } from 'date-fns';

export const useAbsencesStore = defineStore('absences', () => {
    const absences = ref<Absence[]>([]);
    const categories = ref<AbsenceCategory[]>([]);
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    const now = new Date();
    const filters = ref({
        from: format(subDays(now, 31), 'yyyy-MM-dd'),
        to: format(addDays(now, 365), 'yyyy-MM-dd'),
        searchTerm: '',
        userId: undefined as number | undefined
    });

    const authStore = useAuthStore();

    // Getters
    const filteredAbsences = computed(() => {
        let results = [...absences.value];

        if (filters.value.searchTerm.trim()) {
            const term = filters.value.searchTerm.toLowerCase();
            results = results.filter(abs => {
                const category = categories.value.find(c => c.id === abs.absenceReasonId);
                const categoryName = category ? category.name.toLowerCase() : '';
                const comment = abs.comment ? abs.comment.toLowerCase() : '';
                return categoryName.includes(term) || comment.includes(term);
            });
        }

        return results.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    });

    // Actions
    async function loadAbsenceCategories() {
        try {
            const response = await churchtoolsClient.get('/event/masterdata') as any;

            // Be flexible: try common response paths
            const reasons = response?.absenceReasons || response?.data?.absenceReasons || [];

            categories.value = Array.isArray(reasons) ? reasons.map((cat: any) => ({
                id: Number(cat.id),
                name: cat.nameTranslated || cat.name,
                color: cat.color || '#cccccc',
                shortName: cat.shortName || (cat.nameTranslated || cat.name).substring(0, 2).toUpperCase()
            })) : [];

            if (categories.value.length === 0) {
                console.warn('[Absences] No categories extracted from response', response);
            }
        } catch (e) {
            console.error('[Absences] Failed to load absence categories', e);
            error.value = 'Failed to load absence categories';
        }
    }

    async function loadAbsences() {
        const user = authStore.user;
        if (!user) return;

        isLoading.value = true;
        try {
            // Fetch absences for the target user (Manager override or current user)
            const targetUserId = filters.value.userId || user.id;

            const response = await churchtoolsClient.get(`/persons/${targetUserId}/absences`, {
                from: filters.value.from,
                to: filters.value.to
            }) as any[];

            absences.value = response.map((abs: any) => ({
                id: abs.id,
                userId: user.id,
                absenceReasonId: abs.absenceReason.id,
                startDate: abs.startDate,
                endDate: abs.endDate,
                comment: abs.comment,
                isFullDay: abs.startTime === null,
                startTime: abs.startTime,
                endTime: abs.endTime
            }));
        } catch (e) {
            console.error('Failed to load absences', e);
            error.value = 'Failed to load absences';
        } finally {
            isLoading.value = false;
        }
    }

    async function saveAbsence(absenceData: Partial<Absence>) {
        const user = authStore.user;
        if (!user) return;

        try {
            const payload = {
                absenceReasonId: absenceData.absenceReasonId,
                startDate: absenceData.startDate,
                endDate: absenceData.endDate,
                comment: absenceData.comment,
                startTime: absenceData.isFullDay ? null : absenceData.startTime,
                endTime: absenceData.isFullDay ? null : absenceData.endTime
            };

            if (absenceData.id) {
                // Update
                await churchtoolsClient.patch(`/persons/${user.id}/absences/${absenceData.id}`, payload);
            } else {
                // Create
                await churchtoolsClient.post(`/persons/${user.id}/absences`, payload);
            }

            await loadAbsences();
        } catch (e) {
            console.error('Failed to save absence', e);
            throw e;
        }
    }

    async function deleteAbsence(absenceId: number) {
        const user = authStore.user;
        if (!user) return;

        try {
            await churchtoolsClient.deleteApi(`/persons/${user.id}/absences/${absenceId}`);
            absences.value = absences.value.filter(a => a.id !== absenceId);
        } catch (e) {
            console.error('Failed to delete absence', e);
            throw e;
        }
    }

    function setUserIdFilter(userId: number) {
        filters.value.userId = userId;
        loadAbsences();
    }

    return {
        absences,
        categories,
        isLoading,
        error,
        filters,
        filteredAbsences,
        loadAbsenceCategories,
        loadAbsences,
        saveAbsence,
        deleteAbsence,
        setUserIdFilter
    };
});
