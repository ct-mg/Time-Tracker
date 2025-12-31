import { computed, ref } from 'vue';
import { useTimeEntriesStore } from '../stores/time-entries.store';
import { useSettingsStore } from '../stores/settings.store';
import { useAuthStore } from '../stores/auth.store';
import { getISOWeek, getISOWeekYear, formatHours } from '../utils/date';
import type { TimeEntry } from '../types/time-tracker';

export function useTimeEntries() {
    const timeEntriesStore = useTimeEntriesStore();
    const settingsStore = useSettingsStore();
    const authStore = useAuthStore();

    // Helper: Checks if a date is a work day
    function isWorkDay(date: Date, userId?: number): boolean {
        const dayOfWeek = date.getDay(); // 0 = Sunday
        const settings = settingsStore.settings;

        // Priority 1: User-specific work week
        if (userId !== undefined && settings.userHoursConfig) {
            const userConfig = settings.userHoursConfig.find((u) => u.userId === userId);
            if (userConfig?.workWeekDays) {
                return userConfig.workWeekDays.includes(dayOfWeek);
            }
        }

        // Priority 2: Global work week setting
        const workWeekDays = settings.workWeekDays || [1, 2, 3, 4, 5];
        return workWeekDays.includes(dayOfWeek);
    }

    // Helper: Get User Hours (Target)
    function getUserHours(userId?: number): { hoursPerDay: number; hoursPerWeek: number } {
        const settings = settingsStore.settings;
        if (!userId) {
            return {
                hoursPerDay: settings.defaultHoursPerDay,
                hoursPerWeek: settings.defaultHoursPerWeek
            };
        }

        const userConfig = settings.userHoursConfig?.find(c => c.userId === userId);
        if (userConfig) {
            return {
                hoursPerDay: userConfig.hoursPerDay,
                hoursPerWeek: userConfig.hoursPerWeek
            };
        }

        return {
            hoursPerDay: settings.defaultHoursPerDay,
            hoursPerWeek: settings.defaultHoursPerWeek
        };
    }

    const searchTerm = ref('');

    // Filtered entries based on search
    const filteredEntries = computed(() => {
        let entries = timeEntriesStore.entries;

        if (searchTerm.value.trim()) {
            const lowerTerm = searchTerm.value.toLowerCase();
            entries = entries.filter(e =>
                (e.description && e.description.toLowerCase().includes(lowerTerm)) ||
                (e.categoryName && e.categoryName.toLowerCase().includes(lowerTerm))
            );
        }

        return entries;
    });

    const groupedEntries = computed(() => {
        const entries = filteredEntries.value; // Use filtered entries
        const groups = new Map<string, {
            weekNumber: number;
            year: number;
            weekKey: string;
            days: Map<string, {
                date: string; // YYYY-MM-DD
                entries: TimeEntry[];
                dayTotalMs: number;
                dayTargetMs: number;
                dayTargetDisplay: string;
                dayTotalDisplay: string;
                isWorkDay: boolean;
            }>;
            weekTotalMs: number;
            weekTargetMs: number;
            weekTotalDisplay: string;
            weekTargetDisplay: string;
        }>();

        const currentUserId = authStore.user?.id;
        const userHours = getUserHours(currentUserId);
        // Note: Logic implies we are calculating targets for the CURRENT user. 
        // If manager views others, target calculation might need to be dynamic per entry/row, 
        // but typically dashboard shows context of the viewer or selected user.

        entries.forEach(entry => {
            const date = new Date(entry.startTime);
            const weekNum = getISOWeek(date);
            const yearNum = getISOWeekYear(date);
            const weekKey = `${yearNum}-${String(weekNum).padStart(2, '0')}`;
            const dayKey = date.toISOString().split('T')[0];

            if (!groups.has(weekKey)) {
                groups.set(weekKey, {
                    weekNumber: weekNum,
                    year: yearNum,
                    weekKey: weekKey,
                    days: new Map(),
                    weekTotalMs: 0,
                    weekTargetMs: userHours.hoursPerWeek * 3600000,
                    weekTotalDisplay: '0h',
                    weekTargetDisplay: formatHours(userHours.hoursPerWeek * 3600000)
                });
            }

            const week = groups.get(weekKey)!;

            if (!week.days.has(dayKey)) {
                const isWork = isWorkDay(date, currentUserId);
                const dayTargetMs = isWork ? userHours.hoursPerDay * 3600000 : 0;
                week.days.set(dayKey, {
                    date: dayKey,
                    entries: [],
                    dayTotalMs: 0,
                    dayTargetMs,
                    dayTargetDisplay: formatHours(dayTargetMs),
                    dayTotalDisplay: '0h',
                    isWorkDay: isWork
                });
            }

            const day = week.days.get(dayKey)!;
            day.entries.push(entry);

            // Calculate duration if finished
            if (!entry.isBreak && entry.endTime) {
                const duration = new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime();
                day.dayTotalMs += duration;
                week.weekTotalMs += duration;
            }
        });

        // Format totals and sort
        const sortedWeeks = Array.from(groups.values()).sort((a, b) => b.weekKey.localeCompare(a.weekKey));

        return sortedWeeks.map(week => {
            week.weekTotalDisplay = formatHours(week.weekTotalMs);

            const sortedDays = Array.from(week.days.values()).sort((a, b) => b.date.localeCompare(a.date));
            sortedDays.forEach(day => {
                day.dayTotalDisplay = formatHours(day.dayTotalMs);
                // Sort entries by time desc within day
                day.entries.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
            });

            return {
                ...week,
                sortedDays
            };
        });
    });

    return {
        groupedEntries,
        searchTerm
    };
}
