import { computed } from 'vue';
import { useTimeEntriesStore } from '../stores/time-entries.store';
import { useSettingsStore } from '../stores/settings.store';
import { useAuthStore } from '../stores/auth.store';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export function useStatistics() {
    const timeEntriesStore = useTimeEntriesStore();
    const settingsStore = useSettingsStore();
    const authStore = useAuthStore();

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
        const entries = timeEntriesStore.entries.filter(entry => {
            if (!entry.endTime) return false; // Skip active entries
            if (entry.isBreak) return false; // Skip breaks

            const entryStart = new Date(entry.startTime);
            return entryStart >= start && entryStart <= end;
        });

        const totalMs = entries.reduce((sum, entry) => {
            if (!entry.endTime) return sum;
            const duration = new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime();
            return sum + duration;
        }, 0);

        return totalMs / (1000 * 60 * 60); // Convert to hours
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
            isOnTrack: actual >= target,
            workDays
        };
    });

    return {
        todayStats,
        thisWeekStats,
        thisMonthStats,
        lastMonthStats
    };
}
