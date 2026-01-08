/**
 * Date Utilities derived from legacy code
 */

// Format duration from MS to HH:MM:SS
export function formatDuration(ms: number): string {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Format decimal hours to hours and minutes (e.g. 5.5 -> "5h 30m")
export function formatDecimalHours(decimalHours: number): string {
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);

    if (minutes === 0) {
        return `${hours}h`;
    }
    return `${hours}h ${minutes}m`;
}

// Format hours from milliseconds (e.g., 8.5h -> "8h 30m")
export function formatHours(ms: number): string {
    const hours = ms / (1000 * 60 * 60);
    return formatDecimalHours(hours);
}

// Get ISO week number (KW)
export function getISOWeek(date: Date): number {
    const target = new Date(date.valueOf());
    const dayNr = (date.getDay() + 6) % 7; // Monday = 0, Sunday = 6
    target.setDate(target.getDate() - dayNr + 3); // Nearest Thursday
    const firstThursday = target.valueOf();
    target.setMonth(0, 1); // January 1st
    if (target.getDay() !== 4) {
        target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
    }
    return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000); // 604800000 = 7 * 24 * 3600 * 1000
}

// Get ISO week year
export function getISOWeekYear(date: Date): number {
    const target = new Date(date.valueOf());
    target.setDate(target.getDate() + 3 - ((target.getDay() + 6) % 7));
    return target.getFullYear();
}
// Check if two dates are the same day
export function isSameDay(d1: Date, d2: Date): boolean {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}

// Check if date is within interval
export function isWithinInterval(date: Date, interval: { start: Date; end: Date }): boolean {
    return date.getTime() >= interval.start.getTime() &&
        date.getTime() <= interval.end.getTime();
}
