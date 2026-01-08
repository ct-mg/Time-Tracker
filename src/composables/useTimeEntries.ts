import { computed } from 'vue';
import { useTimeEntriesStore } from '../stores/time-entries.store';
import { useSettingsStore } from '../stores/settings.store';
import { useAuthStore } from '../stores/auth.store';
import { getISOWeek, getISOWeekYear, formatHours, isWithinInterval } from '../utils/date';
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

    // Filtered entries based on search, date range, category, and user
    // Now accessing state directly from store
    const filteredEntries = computed(() => {
        let entries = timeEntriesStore.entries;

        // 1. Search Term
        if (timeEntriesStore.searchTerm.trim()) {
            const lowerTerm = timeEntriesStore.searchTerm.toLowerCase();
            entries = entries.filter(e =>
                (e.description && e.description.toLowerCase().includes(lowerTerm)) ||
                (e.categoryName && e.categoryName.toLowerCase().includes(lowerTerm))
            );
        }

        // 2. Date Range
        if (timeEntriesStore.dateRange.start && timeEntriesStore.dateRange.end) {
            // Set end of day for the end date to include the full day
            const endOfDay = new Date(timeEntriesStore.dateRange.end);
            endOfDay.setHours(23, 59, 59, 999);

            const interval = { start: timeEntriesStore.dateRange.start, end: endOfDay };
            entries = entries.filter(e => isWithinInterval(new Date(e.startTime), interval));
        }

        // 3. Category Filter
        if (timeEntriesStore.selectedCategoryIds.length > 0) {
            entries = entries.filter(e => timeEntriesStore.selectedCategoryIds.includes(e.categoryId));
        }

        // 4. User Filter (if user property exists on entry - typically for managers)
        if (timeEntriesStore.selectedUserIds.length > 0) {
            entries = entries.filter(e => timeEntriesStore.selectedUserIds.includes(e.userId));
        }

        return entries;
    });

    const groupedEntries = computed(() => {
        const entries = filteredEntries.value;
        const mode = timeEntriesStore.groupingMode;

        const groups = new Map<string, {
            key: string; // The sorting key
            title: string;
            subTitle?: string;
            days: Map<string, {
                date: string;
                entries: TimeEntry[];
                dayTotalMs: number;
                dayTargetMs: number;
                dayTargetDisplay: string;
                dayTotalDisplay: string;
                isWorkDay: boolean;
            }>;
            totalMs: number;
            targetMs: number;
            totalDisplay: string;
            targetDisplay: string;
        }>();

        const currentUserId = authStore.user?.id;
        const userHours = getUserHours(currentUserId);

        entries.forEach(entry => {
            const date = new Date(entry.startTime);
            const dayKey = date.toISOString().split('T')[0];

            let groupKey = '';
            let groupTitle = '';
            let groupSubTitle = '';

            if (mode === 'week') {
                const weekNum = getISOWeek(date);
                const yearNum = getISOWeekYear(date);
                groupKey = `${yearNum}-W${String(weekNum).padStart(2, '0')}`;
                groupTitle = `Week ${weekNum}`;
                groupSubTitle = `(${yearNum})`;
            } else if (mode === 'month') {
                const month = date.getMonth();
                const year = date.getFullYear();
                groupKey = `${year}-${String(month + 1).padStart(2, '0')}`;
                groupTitle = date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
            } else {
                // Day mode: group by Month for cleanliness, but expand all days
                const month = date.getMonth();
                const year = date.getFullYear();
                groupKey = `${year}-${String(month + 1).padStart(2, '0')}`;
                groupTitle = date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
            }

            if (!groups.has(groupKey)) {
                groups.set(groupKey, {
                    key: groupKey,
                    title: groupTitle,
                    subTitle: groupSubTitle,
                    days: new Map(),
                    totalMs: 0,
                    targetMs: 0, // Will sum up dynamically
                    totalDisplay: '0h',
                    targetDisplay: '0h'
                });
            }

            const group = groups.get(groupKey)!;

            if (!group.days.has(dayKey)) {
                const isWork = isWorkDay(date, currentUserId);
                const dayTargetMs = isWork ? userHours.hoursPerDay * 3600000 : 0;
                group.days.set(dayKey, {
                    date: dayKey,
                    entries: [],
                    dayTotalMs: 0,
                    dayTargetMs,
                    dayTargetDisplay: formatHours(dayTargetMs),
                    dayTotalDisplay: '0h',
                    isWorkDay: isWork
                });

                // Add day target to group target
                group.targetMs += dayTargetMs;
            }

            const day = group.days.get(dayKey)!;
            day.entries.push(entry);

            // Calculate duration if finished
            if (!entry.isBreak && entry.endTime) {
                const duration = new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime();
                day.dayTotalMs += duration;
                group.totalMs += duration;
            }
        });

        // Format totals and sort
        const sortedGroups = Array.from(groups.values()).sort((a, b) => b.key.localeCompare(a.key));

        return sortedGroups.map(group => {
            group.totalDisplay = formatHours(group.totalMs);
            group.targetDisplay = formatHours(group.targetMs);

            const sortedDays = Array.from(group.days.values()).sort((a, b) => b.date.localeCompare(a.date));
            sortedDays.forEach(day => {
                day.dayTotalDisplay = formatHours(day.dayTotalMs);
                // Sort entries by time desc within day
                day.entries.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
            });

            return {
                ...group,
                sortedDays
            };
        });
    });

    return {
        groupedEntries,
        // Expose store state refs for convenience if needed, or consumers can use store directly
        searchTerm: computed({
            get: () => timeEntriesStore.searchTerm,
            set: (v) => timeEntriesStore.searchTerm = v
        }),
        groupingMode: computed({
            get: () => timeEntriesStore.groupingMode,
            set: (v) => timeEntriesStore.groupingMode = v
        }),
    };
}
