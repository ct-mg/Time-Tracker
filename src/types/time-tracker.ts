/**
 * Core Types for Time Tracker
 * Extracted from legacy main.ts
 */

export interface TimeEntry {
    userId: number;
    startTime: string; // ISO datetime - also serves as unique identifier
    endTime: string | null; // ISO datetime or null if currently running
    categoryId: string;
    categoryName: string;
    description: string;
    isManual: boolean;
    isBreak: boolean; // If true, does not count towards work hours
    createdAt: string;
    settingsSnapshot?: {
        // Settings at time of entry creation (for accurate historical SOLL calculations)
        hoursPerDay: number;
        hoursPerWeek: number;
        workWeekDays: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday
    };
}

export interface WorkCategory {
    id: string;
    name: string;
    color: string;
    kvStoreId?: number; // Optional: KV-Store ID (used in admin)
}

export interface UserHoursConfig {
    userId: number;
    userName: string;
    hoursPerDay: number;
    hoursPerWeek: number;
    isActive?: boolean; // False if user was removed from employee group (soft delete)
    workWeekDays?: number[]; // Individual work week (0=Sun, 1=Mon, ..., 6=Sat). Falls back to global setting if undefined.
}

export interface ManagerAssignment {
    managerId: number;
    managerName: string;
    employeeIds: number[];
}

export interface Settings {
    defaultHoursPerDay: number;
    defaultHoursPerWeek: number;
    theme?: 'light' | 'dark' | 'system'; // Replaces simple boolean
    excelImportEnabled: boolean; // Alpha feature toggle
    reportPeriod?: 'week' | 'month' | 'year' | 'custom'; // User's preferred report period
    employeeGroupId?: number; // ChurchTools group ID for employees (with individual SOLL)
    volunteerGroupId?: number; // ChurchTools group ID for volunteers (no SOLL requirements)
    hrGroupId?: number; // ChurchTools group ID for HR (can see all time entries)
    managerGroupId?: number; // ChurchTools group ID for managers (can see assigned employees)
    userHoursConfig?: UserHoursConfig[]; // Individual SOLL hours for employees
    managerAssignments?: ManagerAssignment[]; // Manager -> Employee assignments
    workWeekDays?: number[]; // Days of week that count as work days (0=Sunday, 1=Monday, ..., 6=Saturday). Default: [1,2,3,4,5] (Mon-Fri)
    language?: 'auto' | 'de' | 'en'; // UI language (auto = browser detection)
    activityLogSettings?: {
        // Activity Log configuration
        enabled: boolean; // Master toggle for activity logging
        logCreate: boolean; // Log CREATE operations
        logUpdate: boolean; // Log UPDATE operations
        logDelete: boolean; // Log DELETE operations
        archiveAfterDays: number; // Auto-archive logs older than X days
    };
}

export interface UserPermissions {
    canSeeAllEntries: boolean; // HR role
    canSeeOwnEntries: boolean; // Everyone
    managedEmployeeIds: number[]; // Empty for non-managers
}

export interface ActivityLog {
    timestamp: number; // Unix timestamp
    userId: number; // User who performed the action
    userName: string; // User name for display
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    entityType: 'TIME_ENTRY'; // Future: could add 'CATEGORY', 'SETTINGS', etc.
    entityId: string; // Identifier of the affected entity (for TIME_ENTRY: startTime ISO string)
    details: {
        // Flexible details object
        oldValue?: Partial<TimeEntry>; // For UPDATE: previous values
        newValue?: Partial<TimeEntry>; // For CREATE/UPDATE: new values
        categoryName?: string; // Category name for quick display
        description?: string; // Description for quick display
        duration?: number; // Duration in milliseconds for quick display
    };
}

export type GroupingMode = 'day' | 'week' | 'month';
export type DateRange = { start: Date | null; end: Date | null };

export interface Absence {
    id: number;
    userId: number;
    absenceReasonId: number;
    startDate: string; // ISO Date YYYY-MM-DD
    endDate: string; // ISO Date YYYY-MM-DD
    comment: string | null;
    isFullDay: boolean;
    startTime: string | null; // ISO time HH:mm
    endTime: string | null; // ISO time HH:mm
}

export interface AbsenceCategory {
    id: number;
    name: string;
    color: string;
    shortName: string;
}
