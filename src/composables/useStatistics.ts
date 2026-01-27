import { computed } from 'vue';
import { useTimeEntriesStore } from '../stores/time-entries.store';
import { useSettingsStore } from '../stores/settings.store';
import { useAuthStore } from '../stores/auth.store';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import { useAbsencesStore } from '../stores/absences.store';

export function useStatistics() {
    const timeEntriesStore = useTimeEntriesStore();
    const settingsStore = useSettingsStore();
    const authStore = useAuthStore();
    const absencesStore = useAbsencesStore();

    const currentUserId = computed(() => authStore.user?.id);

    // Helper: Get user's target hours per day
    function getTargetHoursPerDay(_date: Date): number {
        if (!currentUserId.value) return settingsStore.settings.defaultHoursPerDay;

        const userConfig = settingsStore.settings.userHoursConfig?.find(
            c => c.userId === currentUserId.value
        );

        return userConfig?.hoursPerDay || settingsStore.settings.defaultHoursPerDay;
    }

    // Helper: Get user's work week days
    function getWorkWeekDays(): number[] {
        if (!currentUserId.value) return settingsStore.settings.workWeekDays || [1, 2, 3, 4, 5];

        const userConfig = settingsStore.settings.userHoursConfig?.find(
            c => c.userId === currentUserId.value
        );

        return userConfig?.workWeekDays || settingsStore.settings.workWeekDays || [1, 2, 3, 4, 5];
    }

    // Helper: Count work days in range
    function countWorkDays(start: Date, end: Date): number {
        const workDays = getWorkWeekDays();
        let count = 0;
        const current = new Date(start);

        while (current <= end) {
            if (workDays.includes(current.getDay())) {
                count++;
            }
            current.setDate(current.getDate() + 1);
        }

        return count;
    }

    // Helper: Calculate actual hours in range
    function calculateActualHours(start: Date, end: Date): number {
        const userId = currentUserId.value;
        if (!userId) return 0;

        // 1. Regular Time Entries (including active one)
        const entries = timeEntriesStore.entries.filter(entry => {
            if (entry.userId !== userId) return false;
            if (entry.isBreak) return false;

            const entryStart = new Date(entry.startTime);
            return entryStart >= start && entryStart <= end;
        });

        const entryMs = entries.reduce((sum, entry) => {
            const entryStart = new Date(entry.startTime);
            const entryEnd = entry.endTime ? new Date(entry.endTime) : new Date();
            const duration = entryEnd.getTime() - entryStart.getTime();
            return sum + (duration > 0 ? duration : 0);
        }, 0);

        // 2. Absences (that count as worked time)
        const absences = absencesStore.absences.filter(abs => {
            if (abs.userId !== userId) return false;
            const absStart = startOfDay(parseISO(abs.startDate));
            const absEnd = endOfDay(parseISO(abs.endDate));

            // Check for overlap between [absStart, absEnd] and [start, end]
            return absStart <= end && absEnd >= start;
        });

        const absenceMs = absences.reduce((sum, abs) => {
            // For simplicity, we only count the part of the absence that is within the requested range
            // But usually stats are per day/week/month so we can just sum them up if they overlap
            if (abs.isFullDay) {
                // Count work days within the intersection
                const intersectStart = new Date(Math.max(start.getTime(), parseISO(abs.startDate).getTime()));
                const intersectEnd = new Date(Math.min(end.getTime(), parseISO(abs.endDate).getTime()));
                const workDays = countWorkDays(intersectStart, intersectEnd);
                return sum + (workDays * getTargetHoursPerDay(intersectStart) * 3600000);
            } else if (abs.startTime && abs.endTime) {
                const [sh, sm] = abs.startTime.split(':').map(Number);
                const [eh, em] = abs.endTime.split(':').map(Number);
                const durationMs = ((eh * 60 + em) - (sh * 60 + sm)) * 60000;
                return sum + (durationMs > 0 ? durationMs : 0);
            }
            return sum;
        }, 0);

        return (entryMs + absenceMs) / 3600000;
    }

    // Today Statistics
    const todayStats = computed(() => {
        const today = new Date();
        const start = startOfDay(today);
        const end = endOfDay(today);

        const actual = calculateActualHours(start, end);
        const target = getTargetHoursPerDay(today);
        const progress = target > 0 ? (actual / target) * 100 : 0;

        return {
            actual,
            target,
            progress,
            remaining: Math.max(0, target - actual),
            isOnTrack: actual >= target
        };
    });

    // This Week Statistics
    const thisWeekStats = computed(() => {
        const today = new Date();
        const start = startOfWeek(today, { weekStartsOn: 1 }); // Monday
        const end = endOfWeek(today, { weekStartsOn: 1 }); // Sunday

        const actual = calculateActualHours(start, end);
        const workDays = countWorkDays(start, end);
        const target = workDays * getTargetHoursPerDay(today);
        const progress = target > 0 ? (actual / target) * 100 : 0;

        return {
            actual,
            target,
            progress,
            remaining: Math.max(0, target - actual),
            isOnTrack: actual >= target,
            workDays
        };
    });

    // This Month Statistics
    const thisMonthStats = computed(() => {
        const today = new Date();
        const start = startOfMonth(today);
        const end = endOfMonth(today);

        const actual = calculateActualHours(start, end);
        const workDays = countWorkDays(start, end);
        const target = workDays * getTargetHoursPerDay(today);
        const progress = target > 0 ? (actual / target) * 100 : 0;

        return {
            actual,
            target,
            progress,
            remaining: Math.max(0, target - actual),
            isOnTrack: actual >= target,
            workDays
        };
    });

    // Last Month Statistics
    const lastMonthStats = computed(() => {
        const today = new Date();
        const lastMonth = subMonths(today, 1);
        const start = startOfMonth(lastMonth);
        const end = endOfMonth(lastMonth);

        const actual = calculateActualHours(start, end);
        const workDays = countWorkDays(start, end);
        const target = workDays * getTargetHoursPerDay(lastMonth);
        const progress = target > 0 ? (actual / target) * 100 : 0;

        return {
            actual,
            target,
            progress,
            remaining: Math.max(0, target - actual),
            isOnTrack: actual >= target,
            workDays
        };
    });

    const isLoading = computed(() => timeEntriesStore.isLoading || absencesStore.isLoading);

    return {
        isLoading,
        todayStats,
        thisWeekStats,
        thisMonthStats,
        lastMonthStats
    };
}
