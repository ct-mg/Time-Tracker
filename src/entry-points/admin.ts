import type { EntryPoint } from '../lib/main';
import type { AdminData } from '@churchtools/extension-points/admin';
import type { CustomModuleDataCategory } from '../utils/ct-types';
import {
    getOrCreateModule,
    getCustomDataCategory,
    createCustomDataCategory,
    getCustomDataValues,
    createCustomDataValue,
    updateCustomDataValue,
    deleteCustomDataValue,
} from '../utils/kv-store';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import { initI18n, t, detectBrowserLanguage, type Language } from '../utils/i18n';

/**
 * Time Tracker Admin Configuration
 *
 * Admin panel for configuring:
 * - Work categories (add/edit/delete)
 * - Default work hours settings
 * - Overtime calculation rules
 */

interface WorkCategory {
    id: string;
    name: string;
    color: string;
    kvStoreId?: number; // KV-Store ID for updates/deletes
}

interface UserHoursConfig {
    userId: number;
    userName: string;
    hoursPerDay: number;
    hoursPerWeek: number;
    isActive?: boolean; // False if user was removed from employee group (soft delete)
    workWeekDays?: number[]; // Individual work week (0=Sun, 1=Mon, ..., 6=Sat). Falls back to global setting if undefined.
}

interface ManagerAssignment {
    managerId: number;
    managerName: string;
    employeeIds: number[];
}

interface Settings {
    defaultHoursPerDay: number;
    defaultHoursPerWeek: number;
    excelImportEnabled: boolean; // Alpha feature toggle
    reportPeriod?: 'week' | 'month' | 'year' | 'custom';
    employeeGroupId?: number; // ChurchTools group ID for employees (with individual SOLL)
    volunteerGroupId?: number; // ChurchTools group ID for volunteers (no SOLL requirements)
    hrGroupId?: number; // ChurchTools group ID for HR (can see all time entries)
    managerGroupId?: number; // ChurchTools group ID for managers (can see assigned employees)
    userHoursConfig?: UserHoursConfig[]; // Individual SOLL hours for employees
    managerAssignments?: ManagerAssignment[]; // Manager -> Employee assignments
    workWeekDays?: number[]; // Days of week that count as work days (0=Sunday, 1=Monday, ..., 6=Saturday)
    language?: 'auto' | 'de' | 'en'; // UI language (auto = browser detection)
    activityLogSettings?: {
        // Activity Log configuration
        enabled: boolean; // Master toggle for activity logging
        logCreate: boolean; // Log CREATE operations
        logUpdate: boolean; // Log UPDATE operations
        logDelete: boolean; // Log DELETE operations
        archiveAfterDays: number; // Auto-archive logs older than X days
    };
    schemaVersion: number; // Schema version for migration handling
    lastModified: number; // Timestamp of last modification
    modifiedBy?: string; // Optional: User who made the change
}

interface SettingsBackup {
    timestamp: number;
    settings: Settings;
    summary: string; // Brief description of changes or state
    version: number;
}

const MAX_BACKUPS = 5;
const CURRENT_SCHEMA_VERSION = 2; // Bumped from 1 to 2 for HR/Manager Dashboard feature

const adminEntryPoint: EntryPoint<AdminData> = ({ data, emit, element, KEY }) => {
    let moduleId: number | null = null;
    let workCategoriesCategory: CustomModuleDataCategory | null = null;
    let settingsCategory: CustomModuleDataCategory | null = null;
    let settingsBackupsCategory: CustomModuleDataCategory | null = null;
    let workCategories: WorkCategory[] = [];
    let backupsList: SettingsBackup[] = [];
    let settings: Settings = {
        defaultHoursPerDay: 8,
        defaultHoursPerWeek: 40,
        excelImportEnabled: false, // Disabled by default (Alpha)
        workWeekDays: [1, 2, 3, 4, 5], // Default: Monday to Friday
        language: 'auto', // Default: auto-detect from browser
        activityLogSettings: {
            // Default: full logging enabled
            enabled: true,
            logCreate: true,
            logUpdate: true,
            logDelete: true,
            archiveAfterDays: 90,
        },
        schemaVersion: CURRENT_SCHEMA_VERSION,
        lastModified: Date.now(),
    };

    // UI State
    let isLoading = true;
    let errorMessage = '';
    let showAddCategory = false;
    let editingCategory: WorkCategory | null = null;

    // Deletion dialog state
    let showDeleteDialog = false;
    let categoryToDelete: WorkCategory | null = null;
    let replacementCategoryId: string = '';
    let affectedEntriesCount: number = 0;

    // Group Management state
    let loadingEmployees = false;
    let employeesList: Array<{ userId: number; userName: string }> = [];
    let loadingManagers = false;
    let managersList: Array<{ userId: number; userName: string }> = [];

    // Dirty state tracking for unsaved changes warning
    let hasUnsavedGeneralChanges = false;
    let hasUnsavedGroupChanges = false;
    let hasUnsavedManagerChanges = false;

    // Original state snapshots for smart change detection
    let originalGeneralSettings: {
        defaultHoursPerDay: number;
        defaultHoursPerWeek: number;
        excelImportEnabled: boolean;
        workWeekDays: number[];
    } = {
        defaultHoursPerDay: 8,
        defaultHoursPerWeek: 40,
        excelImportEnabled: false,
        workWeekDays: [1, 2, 3, 4, 5],
    };

    let originalGroupSettings: {
        employeeGroupId?: number;
        volunteerGroupId?: number;
        userHoursConfig?: UserHoursConfig[];
    } = {
        employeeGroupId: undefined,
        volunteerGroupId: undefined,
        userHoursConfig: undefined,
    };

    let originalManagerSettings: {
        managerGroupId?: number;
        managerAssignments?: ManagerAssignment[];
    } = {
        managerGroupId: undefined,
        managerAssignments: undefined,
    };

    // Activity Log state
    let activityLogs: any[] = []; // Will be typed as ActivityLog from main.ts
    let filteredLogs: any[] = [];
    let logFilterUser: string = 'all';
    let logFilterAction: string = 'all';
    let logFilterDateFrom: string = '';
    let logFilterDateTo: string = '';
    let logPage: number = 1;
    const LOGS_PER_PAGE = 50;
    let hasUnsavedActivityLogChanges = false;
    let originalActivityLogSettings = { ...settings.activityLogSettings };
    let activityLogCategory: any | null = null;
    let activityLogArchiveCategory: any | null = null;

    // Browser warning for unsaved changes
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (hasUnsavedGeneralChanges || hasUnsavedGroupChanges) {
            e.preventDefault();
            e.returnValue = ''; // Modern browsers show generic message
        }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Initialize and load settings
    async function initialize() {
        try {
            isLoading = true;
            render();

            // Get or create extension module
            const extensionModule = await getOrCreateModule(
                KEY,
                data.extensionInfo?.name || 'Time Tracker',
                data.extensionInfo?.description || 'Time tracking for church employees'
            );
            moduleId = extensionModule.id;

            // Get or create categories FIRST (before loadSettings needs them)
            workCategoriesCategory = await getOrCreateCategory(
                'workcategories',
                'Work Categories',
                'Categories for time tracking'
            );
            settingsCategory = await getOrCreateCategory(
                'settings',
                'Settings',
                'Extension configuration settings'
            );
            settingsBackupsCategory = await getOrCreateCategory(
                'settings_backups',
                'Settings Backups',
                'Automatic backups of extension settings'
            );

            // One-time cleanup: Remove old default categories
            await removeOldDefaultCategories();

            // Load settings (now that settingsCategory exists)
            await loadSettings();

            // Initialize i18n with user's language preference
            const language = settings.language || 'auto';
            const languageToUse = language === 'auto' ? detectBrowserLanguage() : language;
            console.log('[Admin] Language settings:', {
                savedLanguage: settings.language,
                autoDetected: detectBrowserLanguage(),
                finalLanguage: languageToUse,
            });
            await initI18n(languageToUse as Language);

            // Load work categories and backups
            await Promise.all([
                loadWorkCategories(),
                (async () => {
                    backupsList = await getBackups();
                })(),
            ]);

            // Auto-load employees if employee group ID is configured
            if (settings.employeeGroupId) {
                await loadEmployeesFromGroup(settings.employeeGroupId);
            }

            // Auto-load managers if manager group ID is configured
            if (settings.managerGroupId) {
                await loadManagersFromGroup(settings.managerGroupId);
            }

            // Load activity logs
            await loadActivityLogs();

            isLoading = false;
            render();
        } catch (error) {
            console.error('[TimeTracker Admin] Initialization error:', error);
            isLoading = false;
            errorMessage = error instanceof Error ? error.message : 'Failed to initialize';
            render();
        }
    }

    // Load activity logs from KV store
    async function loadActivityLogs(): Promise<void> {
        try {
            if (!moduleId) return;

            // Get or create activity log category
            activityLogCategory = await getCustomDataCategory<object>('activityLog');
            if (!activityLogCategory) {
                activityLogs = [];
                return;
            }

            // Load all logs
            const rawLogs = await getCustomDataValues<any>(activityLogCategory.id, moduleId);
            activityLogs = rawLogs.sort((a, b) => b.timestamp - a.timestamp); // Newest first

            // Apply filters
            applyLogFilters();
        } catch (error) {
            console.error('[TimeTracker Admin] Failed to load activity logs:', error);
            activityLogs = [];
        }
    }

    // Apply filters to activity logs
    function applyLogFilters() {
        filteredLogs = activityLogs.filter((log) => {
            // User filter
            if (logFilterUser !== 'all' && log.userId.toString() !== logFilterUser) {
                return false;
            }

            // Action filter
            if (logFilterAction !== 'all' && log.action !== logFilterAction) {
                return false;
            }

            // Date range filter
            if (logFilterDateFrom) {
                const logDate = new Date(log.timestamp).toISOString().split('T')[0];
                if (logDate < logFilterDateFrom) {
                    return false;
                }
            }

            if (logFilterDateTo) {
                const logDate = new Date(log.timestamp).toISOString().split('T')[0];
                if (logDate > logFilterDateTo) {
                    return false;
                }
            }

            return true;
        });

        // Reset to page 1 when filters change
        logPage = 1;
    }

    // Get or create a category
    async function getOrCreateCategory(
        shorty: string,
        name: string,
        description: string
    ): Promise<CustomModuleDataCategory> {
        const existing = await getCustomDataCategory<object>(shorty);
        if (existing) {
            return existing;
        }

        const created = await createCustomDataCategory(
            {
                customModuleId: moduleId!,
                name,
                shorty,
                description,
            },
            moduleId!
        );

        if (!created) {
            throw new Error(`Failed to create category: ${shorty}`);
        }

        return created;
    }

    // One-time cleanup: Remove old default categories
    async function removeOldDefaultCategories(): Promise<void> {
        try {
            const values = await getCustomDataValues<WorkCategory>(
                workCategoriesCategory!.id,
                moduleId!
            );

            const categoriesToRemove = [
                'Office Work',
                'Pastoral Care',
                'Event Preparation',
                'Administration',
            ];
            let removedCount = 0;

            for (const value of values) {
                if (categoriesToRemove.includes(value.name)) {
                    const kvStoreId = (value as any).id;
                    if (kvStoreId && typeof kvStoreId === 'number') {
                        try {
                            await deleteCustomDataValue(
                                workCategoriesCategory!.id,
                                kvStoreId,
                                moduleId!
                            );
                            console.log(
                                `[TimeTracker Admin] Removed old default category: ${value.name} (ID: ${kvStoreId})`
                            );
                            removedCount++;
                        } catch (deleteError) {
                            console.error(
                                `[TimeTracker Admin] Failed to delete ${value.name}:`,
                                deleteError
                            );
                        }
                    }
                }
            }

            if (removedCount > 0) {
                console.log(
                    `[TimeTracker Admin] Cleanup complete. Removed ${removedCount} old default categories.`
                );
            }
        } catch (error) {
            console.error('[TimeTracker Admin] Failed to remove old categories:', error);
        }
    }

    // Load work categories
    async function loadWorkCategories(): Promise<void> {
        try {
            // Call API directly to get raw values (we need the unparsed "value" field)
            const rawValues: Array<{ id: number; dataCategoryId: number; value: string }> = await (
                churchtoolsClient as any
            ).get(
                `/custommodules/${moduleId}/customdatacategories/${workCategoriesCategory!.id}/customdatavalues`
            );

            // Parse each value and preserve both string ID and numeric kvStoreId
            workCategories = rawValues.map((rawVal) => {
                const kvStoreId = rawVal.id; // Numeric KV-Store ID
                const parsedCategory = JSON.parse(rawVal.value) as WorkCategory;

                return {
                    id: parsedCategory.id, // String ID from stored data
                    name: parsedCategory.name,
                    color: parsedCategory.color,
                    kvStoreId: kvStoreId, // Numeric KV-Store ID for updates/deletes
                };
            });

            console.log('[TimeTracker Admin] Loaded categories:', workCategories);
        } catch (error) {
            console.error('[TimeTracker Admin] Failed to load categories:', error);
            workCategories = [];
        }
    }

    // Load settings
    async function loadSettings(): Promise<void> {
        try {
            const values = await getCustomDataValues<Settings>(settingsCategory!.id, moduleId!);

            if (values.length > 0) {
                settings = values[0];

                // Migration: Ensure schemaVersion exists
                if (!settings.schemaVersion) {
                    settings.schemaVersion = 1;
                    settings.lastModified = Date.now();
                }
            } else {
                // Create default settings
                await createCustomDataValue(
                    {
                        dataCategoryId: settingsCategory!.id,
                        value: JSON.stringify(settings),
                    },
                    moduleId!
                );
            }

            // Initialize original state snapshots for smart change detection
            originalGeneralSettings = {
                defaultHoursPerDay: settings.defaultHoursPerDay,
                defaultHoursPerWeek: settings.defaultHoursPerWeek,
                excelImportEnabled: settings.excelImportEnabled,
                workWeekDays: settings.workWeekDays ? [...settings.workWeekDays] : [1, 2, 3, 4, 5],
            };

            originalGroupSettings = {
                employeeGroupId: settings.employeeGroupId,
                volunteerGroupId: settings.volunteerGroupId,
                userHoursConfig: settings.userHoursConfig
                    ? JSON.parse(JSON.stringify(settings.userHoursConfig))
                    : undefined,
            };

            originalManagerSettings = {
                managerGroupId: settings.managerGroupId,
                managerAssignments: settings.managerAssignments
                    ? JSON.parse(JSON.stringify(settings.managerAssignments))
                    : undefined,
            };
        } catch (error) {
            console.error('[TimeTracker Admin] Failed to load settings:', error);
        }
    }

    // Validate settings integrity
    function validateSettings(settingsToValidate: Settings): { isValid: boolean; error?: string } {
        if (!settingsToValidate)
            return {
                isValid: false,
                error: t('ct.extension.timetracker.admin.validation.settingsNull'),
            };

        // Check required fields
        if (typeof settingsToValidate.defaultHoursPerDay !== 'number')
            return {
                isValid: false,
                error: t('ct.extension.timetracker.admin.validation.hoursPerDayInvalid'),
            };
        if (typeof settingsToValidate.defaultHoursPerWeek !== 'number')
            return {
                isValid: false,
                error: t('ct.extension.timetracker.admin.validation.hoursPerWeekInvalid'),
            };

        // Check integrity of optional fields if they exist
        if (
            settingsToValidate.employeeGroupId !== undefined &&
            typeof settingsToValidate.employeeGroupId !== 'number'
        ) {
            return { isValid: false, error: 'employeeGroupId must be a number' };
        }

        if (
            settingsToValidate.userHoursConfig &&
            !Array.isArray(settingsToValidate.userHoursConfig)
        ) {
            return { isValid: false, error: 'userHoursConfig must be an array' };
        }

        return { isValid: true };
    }

    // Create a backup of current settings
    async function createBackup(currentSettings: Settings, summary: string): Promise<void> {
        try {
            // Load existing backups
            const backupValues = await getCustomDataValues<SettingsBackup>(
                settingsBackupsCategory!.id,
                moduleId!
            );

            // Sort by timestamp descending
            const backups = backupValues.sort((a, b) => b.timestamp - a.timestamp);

            // Create new backup
            const newBackup: SettingsBackup = {
                timestamp: Date.now(),
                settings: JSON.parse(JSON.stringify(currentSettings)), // Deep copy
                summary,
                version: currentSettings.schemaVersion || 1,
            };

            // Save new backup
            await createCustomDataValue(
                {
                    dataCategoryId: settingsBackupsCategory!.id,
                    value: JSON.stringify(newBackup),
                },
                moduleId!
            );

            // Prune old backups if we exceed MAX_BACKUPS
            if (backups.length >= MAX_BACKUPS) {
                const backupsToDelete = backups.slice(MAX_BACKUPS - 1); // Keep 4, add 1 = 5
                for (const backup of backupsToDelete) {
                    const kvStoreId = (backup as any).id;
                    if (kvStoreId) {
                        await deleteCustomDataValue(settingsBackupsCategory!.id, kvStoreId);
                    }
                }
            }

            console.log('[TimeTracker Admin] Backup created:', summary);
        } catch (e) {
            console.error('[TimeTracker Admin] Backup failed:', e);
            // We don't block saving if backup fails, but we log it
        }
    }

    // Get backups
    async function getBackups(): Promise<SettingsBackup[]> {
        try {
            const values = await getCustomDataValues<SettingsBackup>(
                settingsBackupsCategory!.id,
                moduleId!
            );
            return values.sort((a, b) => b.timestamp - a.timestamp);
        } catch (e) {
            console.error('[TimeTracker Admin] Failed to load backups', e);
            return [];
        }
    }

    // Restore backup
    async function handleRestoreBackup(backupId: number) {
        if (!confirm(t('ct.extension.timetracker.admin.restoreBackupConfirm'))) {
            return;
        }

        try {
            const backups = await getBackups();
            const backupToRestore = backups.find((b: any) => b.id === backupId);

            if (!backupToRestore) {
                alert(t('ct.extension.timetracker.admin.backupNotFound'));
                return;
            }

            // We use saveSettings to restore, which will create a NEW backup of the current state before restoring!
            await saveSettings(
                backupToRestore.settings,
                `Restored from backup ${new Date(backupToRestore.timestamp).toLocaleString()}`
            );

            alert(t('ct.extension.timetracker.admin.backupRestored'));

            // Reload backups list
            backupsList = await getBackups();
            render();
        } catch (e) {
            console.error('[TimeTracker Admin] Restore failed:', e);
            alert(
                t('ct.extension.timetracker.admin.backupRestoreFailed') +
                ': ' +
                (e instanceof Error ? e.message : 'Unknown error')
            );
        }
    }

    // Save settings with validation and backup
    async function saveSettings(newSettings: Settings, changeSummary?: string): Promise<void> {
        // Use default summary if not provided
        const summary =
            changeSummary ||
            t('ct.extension.timetracker.admin.settingsUpdated').replace(
                '{version}',
                (newSettings.schemaVersion || 1).toString()
            );

        // 1. Validate
        const validation = validateSettings(newSettings);
        if (!validation.isValid) {
            throw new Error(`Settings validation failed: ${validation.error}`);
        }

        try {
            // 2. Create Backup of OLD settings (if they exist and are valid)
            if (settings && settings.defaultHoursPerDay) {
                await createBackup(settings, summary);
            }

            // 3. Update Metadata
            newSettings.lastModified = Date.now();
            newSettings.schemaVersion = CURRENT_SCHEMA_VERSION;

            const values = await getCustomDataValues<Settings>(settingsCategory!.id, moduleId!);

            if (values.length > 0) {
                const settingId = (values[0] as any).id;
                await updateCustomDataValue(settingsCategory!.id, settingId, {
                    dataCategoryId: settingsCategory!.id,
                    value: JSON.stringify(newSettings),
                });
            } else {
                await createCustomDataValue(
                    {
                        dataCategoryId: settingsCategory!.id,
                        value: JSON.stringify(newSettings),
                    },
                    moduleId!
                );
            }

            // Update local state
            settings = newSettings;
            // Note: Dirty flags reset in calling functions
        } catch (error) {
            console.error('[TimeTracker Admin] Failed to save settings:', error);
            throw error;
        }
    }

    // Load employees from a ChurchTools group with soft-delete support
    async function loadEmployeesFromGroup(groupId: number): Promise<void> {
        try {
            loadingEmployees = true;
            render();

            // Get members of the group from ChurchTools API
            const groupMembers = (await churchtoolsClient.get(
                `/groups/${groupId}/members`
            )) as any[];

            // Extract user IDs from current group
            const currentGroupUserIds = new Set(
                groupMembers.map(
                    (member: { personId?: number; id?: number }) => member.personId || member.id
                )
            );

            // Build employee list from current group members
            employeesList = groupMembers
                .map(
                    (member: {
                        personId?: number;
                        id?: number;
                        person?: { domainAttributes?: { firstName?: string; lastName?: string } };
                        firstName?: string;
                        lastName?: string;
                        vorname?: string;
                        nachname?: string;
                        name?: string;
                    }) => {
                        let firstName = '';
                        let lastName = '';

                        // Names are in person.domainAttributes (ChurchTools API structure)
                        if (member.person?.domainAttributes) {
                            firstName = member.person.domainAttributes.firstName || '';
                            lastName = member.person.domainAttributes.lastName || '';
                        }

                        // Fallback to member properties directly (if API structure changes)
                        if (!firstName && !lastName) {
                            firstName = member.firstName || member.vorname || '';
                            lastName = member.lastName || member.nachname || member.name || '';
                        }

                        const userName =
                            firstName && lastName
                                ? `${firstName} ${lastName}`
                                : firstName || lastName || `User ${member.personId || member.id}`;

                        return {
                            userId: member.personId || member.id || 0,
                            userName,
                            firstName: firstName || '',
                            lastName: lastName || '',
                        };
                    }
                )
                .sort(
                    (
                        a: { firstName: string; lastName: string },
                        b: { firstName: string; lastName: string }
                    ) => {
                        // Sort by first name, then last name
                        if (a.firstName !== b.firstName) {
                            return a.firstName.localeCompare(b.firstName);
                        }
                        return a.lastName.localeCompare(b.lastName);
                    }
                );

            // Update isActive status in existing userHoursConfig
            if (settings.userHoursConfig) {
                settings.userHoursConfig.forEach((config) => {
                    if (currentGroupUserIds.has(config.userId)) {
                        // User is in group - mark as active (re-mapping)
                        config.isActive = true;
                    } else {
                        // User not in group - mark as inactive (soft delete)
                        config.isActive = false;
                    }
                });

                // Add inactive users to employeesList so they can be displayed/deleted
                settings.userHoursConfig.forEach((config) => {
                    if (
                        !config.isActive &&
                        !employeesList.find((e) => e.userId === config.userId)
                    ) {
                        employeesList.push({
                            userId: config.userId,
                            userName: config.userName,
                        });
                    }
                });
            }

            loadingEmployees = false;
            render();
        } catch (error) {
            console.error('[TimeTracker Admin] Failed to load employees:', error);
            loadingEmployees = false;
            employeesList = [];

            emit('notification:show', {
                message: t('ct.extension.timetracker.admin.employeeLoadFailed'),
                type: 'error',
                duration: 5000,
            });

            render();
        }
    }

    // Load managers from a ChurchTools group
    async function loadManagersFromGroup(groupId: number): Promise<void> {
        try {
            loadingManagers = true;
            render();

            // Get members of the group from ChurchTools API
            const groupMembers = (await churchtoolsClient.get(
                `/groups/${groupId}/members`
            )) as any[];

            // Build manager list from group members
            managersList = groupMembers
                .map(
                    (member: {
                        personId?: number;
                        id?: number;
                        person?: { domainAttributes?: { firstName?: string; lastName?: string } };
                        firstName?: string;
                        lastName?: string;
                        vorname?: string;
                        nachname?: string;
                        name?: string;
                    }) => {
                        let firstName = '';
                        let lastName = '';

                        // Names are in person.domainAttributes (ChurchTools API structure)
                        if (member.person?.domainAttributes) {
                            firstName = member.person.domainAttributes.firstName || '';
                            lastName = member.person.domainAttributes.lastName || '';
                        }

                        // Fallback to member properties directly (if API structure changes)
                        if (!firstName && !lastName) {
                            firstName = member.firstName || member.vorname || '';
                            lastName = member.lastName || member.nachname || member.name || '';
                        }

                        const userName =
                            firstName && lastName
                                ? `${firstName} ${lastName}`
                                : firstName || lastName || `User ${member.personId || member.id}`;

                        return {
                            userId: member.personId || member.id || 0,
                            userName,
                        };
                    }
                )
                .sort((a: { userName: string }, b: { userName: string }) =>
                    a.userName.localeCompare(b.userName)
                );

            loadingManagers = false;
            render();
        } catch (error) {
            console.error('[TimeTracker Admin] Failed to load managers:', error);
            loadingManagers = false;
            managersList = [];

            emit('notification:show', {
                message: 'Failed to load managers from group',
                type: 'error',
                duration: 5000,
            });

            render();
        }
    }

    // Add or update category
    async function saveCategory(category: WorkCategory): Promise<void> {
        try {
            // Prepare data without kvStoreId (that's metadata, not part of the stored value)
            const { kvStoreId, ...categoryData } = category;
            const valueData = JSON.stringify(categoryData);

            if (kvStoreId) {
                // Update existing - we have a kvStoreId
                await updateCustomDataValue(
                    workCategoriesCategory!.id,
                    kvStoreId,
                    { value: valueData },
                    moduleId!
                );

                // Update in local array
                const index = workCategories.findIndex((c) => c.kvStoreId === kvStoreId);
                if (index !== -1) {
                    workCategories[index] = category;
                }
            } else {
                // Create new - no kvStoreId yet
                await createCustomDataValue(
                    {
                        dataCategoryId: workCategoriesCategory!.id,
                        value: valueData,
                    },
                    moduleId!
                );

                // Reload to get the kvStoreId from the database
                await loadWorkCategories();
            }
        } catch (error) {
            console.error('[TimeTracker Admin] Failed to save category:', error);
            throw error;
        }
    }

    // Check how many time entries use a specific category
    async function countEntriesUsingCategory(categoryId: string): Promise<number> {
        try {
            const timeEntriesCategory = await getCustomDataCategory<object>('timeentries');
            if (!timeEntriesCategory) return 0;

            const timeEntries = await getCustomDataValues<{ categoryId: string }>(
                timeEntriesCategory.id,
                moduleId!
            );

            return timeEntries.filter((entry) => entry.categoryId === categoryId).length;
        } catch (error) {
            console.error('[TimeTracker Admin] Failed to count entries:', error);
            return 0;
        }
    }

    // Reassign all time entries from one category to another
    async function reassignTimeEntries(
        fromCategoryId: string,
        toCategoryId: string
    ): Promise<void> {
        try {
            const timeEntriesCategory = await getCustomDataCategory<object>('timeentries');
            if (!timeEntriesCategory) return;

            // Get raw values to access kvStoreId
            const rawValues: Array<{ id: number; dataCategoryId: number; value: string }> = await (
                churchtoolsClient as any
            ).get(
                `/custommodules/${moduleId}/customdatacategories/${timeEntriesCategory.id}/customdatavalues`
            );

            const toCategory = workCategories.find((c) => c.id === toCategoryId);
            if (!toCategory) {
                throw new Error('Replacement category not found');
            }

            let updatedCount = 0;

            for (const rawVal of rawValues) {
                const entry = JSON.parse(rawVal.value);

                if (entry.categoryId === fromCategoryId) {
                    // Update the entry with new category
                    entry.categoryId = toCategoryId;
                    entry.categoryName = toCategory.name;

                    await updateCustomDataValue(
                        timeEntriesCategory.id,
                        rawVal.id,
                        { value: JSON.stringify(entry) },
                        moduleId!
                    );

                    updatedCount++;
                }
            }

            console.log(
                `[TimeTracker Admin] Reassigned ${updatedCount} entries from ${fromCategoryId} to ${toCategoryId}`
            );
        } catch (error) {
            console.error('[TimeTracker Admin] Failed to reassign entries:', error);
            throw error;
        }
    }

    // Initiate category deletion (check for usage first)
    async function initiateDeleteCategory(categoryId: string): Promise<void> {
        try {
            const category = workCategories.find((c) => c.id === categoryId);
            if (!category) {
                throw new Error('Category not found');
            }

            // Check if any entries use this category
            affectedEntriesCount = await countEntriesUsingCategory(categoryId);

            if (affectedEntriesCount > 0) {
                // Show dialog to select replacement category
                categoryToDelete = category;
                showDeleteDialog = true;
                replacementCategoryId = workCategories.find((c) => c.id !== categoryId)?.id || '';
                render();
            } else {
                // No entries using this category, delete immediately
                await deleteCategory(categoryId);
                emit('notification', {
                    message: t('ct.extension.timetracker.admin.categoryDeleted'),
                    type: 'success',
                    duration: 3000,
                });
                render();
            }
        } catch (error) {
            console.error('[TimeTracker Admin] Failed to initiate delete:', error);
            emit('notification', {
                message: 'Failed to delete category',
                type: 'error',
                duration: 3000,
            });
        }
    }

    // Confirm deletion with reassignment
    async function confirmDeleteCategory(): Promise<void> {
        try {
            if (!categoryToDelete || !replacementCategoryId) {
                throw new Error('Missing category information');
            }

            // Reassign all entries first
            await reassignTimeEntries(categoryToDelete.id, replacementCategoryId);

            // Then delete the category
            await deleteCategory(categoryToDelete.id);

            // Reset dialog state
            showDeleteDialog = false;
            categoryToDelete = null;
            replacementCategoryId = '';
            affectedEntriesCount = 0;

            emit('notification', {
                message: t('ct.extension.timetracker.admin.categoryDeletedReassigned'),
                type: 'success',
                duration: 3000,
            });

            render();
        } catch (error) {
            console.error('[TimeTracker Admin] Failed to confirm delete:', error);
            emit('notification', {
                message: 'Failed to delete category',
                type: 'error',
                duration: 3000,
            });
        }
    }

    // Cancel deletion
    function cancelDeleteCategory(): void {
        showDeleteDialog = false;
        categoryToDelete = null;
        replacementCategoryId = '';
        affectedEntriesCount = 0;
        render();
    }

    // Delete category (internal function - only called after checks)
    async function deleteCategory(categoryId: string): Promise<void> {
        try {
            // Find the category in our local array (which has kvStoreId)
            const category = workCategories.find((c) => c.id === categoryId);

            if (category && category.kvStoreId) {
                await deleteCustomDataValue(
                    workCategoriesCategory!.id,
                    category.kvStoreId,
                    moduleId!
                );

                // Remove from local array
                workCategories = workCategories.filter((c) => c.id !== categoryId);
            } else {
                throw new Error('Category not found or missing kvStoreId');
            }
        } catch (error) {
            console.error('[TimeTracker Admin] Failed to delete category:', error);
            throw error;
        }
    }

    // Render UI
    // Check if current values differ from original state
    function checkGeneralChanges(): boolean {
        const hoursPerDayInput = element.querySelector('#hours-per-day') as HTMLInputElement;
        const hoursPerWeekInput = element.querySelector('#hours-per-week') as HTMLInputElement;
        const excelImportToggle = element.querySelector('#excel-import-toggle') as HTMLInputElement;

        if (!hoursPerDayInput || !hoursPerWeekInput || !excelImportToggle) return false;

        // Check simple values
        if (parseFloat(hoursPerDayInput.value) !== originalGeneralSettings.defaultHoursPerDay)
            return true;
        if (parseFloat(hoursPerWeekInput.value) !== originalGeneralSettings.defaultHoursPerWeek)
            return true;
        if (excelImportToggle.checked !== originalGeneralSettings.excelImportEnabled) return true;

        // Check work week days
        const currentWorkWeekDays: number[] = [];
        element.querySelectorAll('.work-week-day-checkbox').forEach((checkbox, index) => {
            if ((checkbox as HTMLInputElement).checked) {
                currentWorkWeekDays.push(index);
            }
        });

        if (currentWorkWeekDays.length !== originalGeneralSettings.workWeekDays.length) return true;
        if (
            !currentWorkWeekDays.every(
                (day, idx) => day === originalGeneralSettings.workWeekDays[idx]
            )
        )
            return true;

        return false;
    }

    function checkGroupChanges(): boolean {
        const employeeGroupIdInput = element.querySelector(
            '#employee-group-id'
        ) as HTMLInputElement;
        const volunteerGroupIdInput = element.querySelector(
            '#volunteer-group-id'
        ) as HTMLInputElement;

        if (!employeeGroupIdInput || !volunteerGroupIdInput) return false;

        // Check group IDs
        const currentEmployeeGroupId = employeeGroupIdInput.value
            ? parseInt(employeeGroupIdInput.value)
            : undefined;
        const currentVolunteerGroupId = volunteerGroupIdInput.value
            ? parseInt(volunteerGroupIdInput.value)
            : undefined;

        if (currentEmployeeGroupId !== originalGroupSettings.employeeGroupId) return true;
        if (currentVolunteerGroupId !== originalGroupSettings.volunteerGroupId) return true;

        // Check user hours configs
        const currentUserConfigs: UserHoursConfig[] = [];
        employeesList.forEach((emp) => {
            const dayInput = element.querySelector(
                `.employee-hours-day[data-user-id="${emp.userId}"]`
            ) as HTMLInputElement;
            const weekInput = element.querySelector(
                `.employee-hours-week[data-user-id="${emp.userId}"]`
            ) as HTMLInputElement;

            if (dayInput && weekInput) {
                const hoursPerDay =
                    parseFloat(dayInput.value) || originalGeneralSettings.defaultHoursPerDay;
                const hoursPerWeek =
                    parseFloat(weekInput.value) || originalGeneralSettings.defaultHoursPerWeek;

                // Check work week days for this user
                const workWeekDays: number[] = [];
                element
                    .querySelectorAll(`.user-work-week-checkbox[data-user-id="${emp.userId}"]`)
                    .forEach((checkbox) => {
                        const day = parseInt((checkbox as HTMLInputElement).dataset.day!);
                        if ((checkbox as HTMLInputElement).checked) {
                            workWeekDays.push(day);
                        }
                    });

                currentUserConfigs.push({
                    userId: emp.userId,
                    userName: emp.userName,
                    hoursPerDay,
                    hoursPerWeek,
                    workWeekDays: workWeekDays.length > 0 ? workWeekDays : undefined,
                });
            }
        });

        // Compare with original
        const originalConfigs = originalGroupSettings.userHoursConfig || [];
        if (currentUserConfigs.length !== originalConfigs.length) return true;

        for (const current of currentUserConfigs) {
            const original = originalConfigs.find((c) => c.userId === current.userId);
            if (!original) return true;
            if (current.hoursPerDay !== original.hoursPerDay) return true;
            if (current.hoursPerWeek !== original.hoursPerWeek) return true;

            // Compare work week days
            const currentDays = current.workWeekDays || [];
            const originalDays = original.workWeekDays || [];
            if (currentDays.length !== originalDays.length) return true;
            if (!currentDays.every((day, idx) => day === originalDays[idx])) return true;
        }

        return false;
    }

    // Smart change detection for manager settings
    function checkManagerChanges(): boolean {
        // Check if manager group ID changed
        const managerGroupIdInput = element.querySelector('#manager-group-id') as HTMLInputElement;
        if (managerGroupIdInput) {
            const currentManagerGroupId = managerGroupIdInput.value
                ? parseInt(managerGroupIdInput.value)
                : undefined;
            if (currentManagerGroupId !== originalManagerSettings.managerGroupId) {
                return true;
            }
        }

        // Read current checkbox states (live from DOM)
        const checkboxes = element.querySelectorAll(
            '.manager-employee-checkbox'
        ) as NodeListOf<HTMLInputElement>;
        if (checkboxes.length === 0) {
            // No checkboxes yet, compare with original
            return (originalManagerSettings.managerAssignments || []).length > 0;
        }

        // Build current assignments from checkbox states
        const currentAssignmentsMap = new Map<number, Set<number>>();
        checkboxes.forEach((checkbox) => {
            const managerId = parseInt(checkbox.dataset.managerId || '0');
            const employeeId = parseInt(checkbox.dataset.employeeId || '0');

            if (checkbox.checked) {
                if (!currentAssignmentsMap.has(managerId)) {
                    currentAssignmentsMap.set(managerId, new Set());
                }
                currentAssignmentsMap.get(managerId)!.add(employeeId);
            }
        });

        // Convert to array for comparison
        const currentAssignments: ManagerAssignment[] = [];
        currentAssignmentsMap.forEach((employeeIds, managerId) => {
            currentAssignments.push({
                managerId,
                managerName: '', // Name not important for comparison
                employeeIds: Array.from(employeeIds).sort(),
            });
        });

        const originalAssignments = originalManagerSettings.managerAssignments || [];

        // Different number of assignments
        if (currentAssignments.length !== originalAssignments.length) {
            return true;
        }

        // Check each assignment for changes
        for (const current of currentAssignments) {
            const original = originalAssignments.find((a) => a.managerId === current.managerId);
            if (!original) return true;

            // Check if employee lists are different
            const currentIds = current.employeeIds;
            const originalIds = [...original.employeeIds].sort();

            if (currentIds.length !== originalIds.length) return true;
            if (currentIds.some((id, i) => id !== originalIds[i])) return true;
        }

        // Check if any original assignments are missing in current
        for (const original of originalAssignments) {
            const current = currentAssignments.find((a) => a.managerId === original.managerId);
            if (!current) return true;
        }

        return false;
    }

    // Update save button visual state based on dirty flag
    function updateSaveButtonState() {
        // Check if there are actual changes
        hasUnsavedGeneralChanges = checkGeneralChanges();
        hasUnsavedGroupChanges = checkGroupChanges();
        hasUnsavedManagerChanges = checkManagerChanges();

        const saveGroupBtn = element.querySelector('#save-group-settings-btn') as HTMLButtonElement;
        const saveGeneralBtn = element.querySelector('#save-settings-btn') as HTMLButtonElement;
        const saveManagerBtn = element.querySelector(
            '#save-manager-assignments-btn'
        ) as HTMLButtonElement;

        const updateButton = (btn: HTMLButtonElement, label: string, isDirty: boolean) => {
            if (!btn) return;

            if (isDirty) {
                btn.style.cssText =
                    'width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem 1.5rem; background: #dc3545 !important; color: white !important; border: none !important; border-radius: 4px !important; cursor: pointer !important; font-size: 1rem !important; font-weight: 600 !important; transition: background 0.2s !important; animation: pulse 2s ease-in-out infinite;';
                btn.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                        <polyline points="7 3 7 8 15 8"></polyline>
                    </svg>
                    Save ${label} (Unsaved Changes!)
                `;
            } else {
                btn.style.cssText =
                    'width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem 1.5rem; background: #28a745 !important; color: white !important; border: none !important; border-radius: 4px !important; cursor: pointer !important; font-size: 1rem !important; font-weight: 600 !important; transition: background 0.2s !important;';
                btn.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M5 13l4 4L19 7"></path>
                    </svg>
                    ${label} Saved
                `;
            }
        };

        if (saveGroupBtn) updateButton(saveGroupBtn, 'Group Settings', hasUnsavedGroupChanges);
        if (saveGeneralBtn)
            updateButton(saveGeneralBtn, 'General Settings', hasUnsavedGeneralChanges);
        if (saveManagerBtn)
            updateButton(saveManagerBtn, 'Manager Assignments', hasUnsavedManagerChanges);
    }

    // Render Activity Log Section
    function renderActivityLogSection(): string {
        const totalPages = Math.ceil(filteredLogs.length / LOGS_PER_PAGE);
        const startIdx = (logPage - 1) * LOGS_PER_PAGE;
        const endIdx = Math.min(startIdx + LOGS_PER_PAGE, filteredLogs.length);
        const pageLog = filteredLogs.slice(startIdx, endIdx);

        // Calculate statistics
        const todayTimestamp = new Date().setHours(0, 0, 0, 0);
        const actionsToday = filteredLogs.filter(log => log.timestamp >= todayTimestamp).length;
        const createCount = filteredLogs.filter(log => log.action === 'CREATE').length;
        const updateCount = filteredLogs.filter(log => log.action === 'UPDATE').length;
        const deleteCount = filteredLogs.filter(log => log.action === 'DELETE').length;

        return `
            <!-- Activity Log Section -->
            <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="margin: 0 0 0.5rem 0; font-size: 1.3rem; color: #333;">${t('ct.extension.timetracker.admin.activityLog')}</h2>
                <p style="margin: 0 0 1.5rem 0; color: #666; font-size: 0.95rem;">${t('ct.extension.timetracker.admin.activityLog.description')}</p>

                <!-- Activity Log Settings -->
                <div style="background: #f9f9f9; padding: 1rem; border-radius: 6px; margin-bottom: 1.5rem;">
                    <h3 style="margin: 0 0 1rem 0; font-size: 1.1rem; color: #333;">${t('ct.extension.timetracker.admin.activityLog.settings')}</h3>
                    
                    <div style="display: grid; gap: 1rem;">
                        <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                            <input type="checkbox" id="activity-log-enabled" ${settings.activityLogSettings?.enabled ? 'checked' : ''} 
                                   style="cursor: pointer;"/>
                            <span>${t('ct.extension.timetracker.admin.activityLog.enableLogging')}</span>
                        </label>

                        <div style="display: flex; gap: 1.5rem; margin-left: 1.5rem;">
                            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                                <input type="checkbox" id="activity-log-create" ${settings.activityLogSettings?.logCreate ? 'checked' : ''}
                                       ${!settings.activityLogSettings?.enabled ? 'disabled' : ''} style="cursor: pointer;"/>
                                <span style="color: ${!settings.activityLogSettings?.enabled ? '#999' : ''};">${t('ct.extension.timetracker.admin.activityLog.logCreate')}</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                                <input type="checkbox" id="activity-log-update" ${settings.activityLogSettings?.logUpdate ? 'checked' : ''}
                                       ${!settings.activityLogSettings?.enabled ? 'disabled' : ''} style="cursor: pointer;"/>
                                <span style="color: ${!settings.activityLogSettings?.enabled ? '#999' : ''};">${t('ct.extension.timetracker.admin.activityLog.logUpdate')}</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                                <input type="checkbox" id="activity-log-delete" ${settings.activityLogSettings?.logDelete ? 'checked' : ''}
                                       ${!settings.activityLogSettings?.enabled ? 'disabled' : ''} style="cursor: pointer;"/>
                                <span style="color: ${!settings.activityLogSettings?.enabled ? '#999' : ''};">${t('ct.extension.timetracker.admin.activityLog.logDelete')}</span>
                            </label>
                        </div>

                        <div style="display: grid; grid-template-columns: auto 1fr; gap: 0.5rem; align-items: center;">
                            <label for="activity-log-archive-days">${t('ct.extension.timetracker.admin.activityLog.archiveAfterDays')}:</label>
                            <div style="display: flex; gap: 0.5rem; align-items: center;">
                                <input type="range" id="activity-log-archive-days" min="30" max="365" step="5"
                                       value="${settings.activityLogSettings?.archiveAfterDays || 90}"
                                       ${!settings.activityLogSettings?.enabled ? 'disabled' : ''}
                                       style="flex: 1;"/>
                                <span id="archive-days-value" style="min-width: 60px; font-weight: bold;">${settings.activityLogSettings?.archiveAfterDays || 90} ${t('ct.extension.timetracker.dashboard.day')}${(settings.activityLogSettings?.archiveAfterDays || 90) > 1 ? 's' : ''}</span>
                            </div>
                            <div style="grid-column: 2; font-size: 0.85rem; color: #666;">
                                ${t('ct.extension.timetracker.admin.activityLog.archiveAfterDaysHelp')}
                            </div>
                        </div>
                    </div>

                    <button id="save-activity-log-settings-btn"
                            style="margin-top: 1rem; padding: 0.5rem 1rem; background: ${hasUnsavedActivityLogChanges ? '#dc3545' : '#28a745'}; 
                                   color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">
                        ${t('ct.extension.timetracker.admin.activityLog.saveSettings')}
                    </button>
                </div>

                <!-- Statistics -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                    <div style="background: #f0f8ff; padding: 1rem; border-radius: 6px; text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: #007bff;">${filteredLogs.length}</div>
                        <div style="font-size: 0.85rem; color: #666;">${t('ct.extension.timetracker.admin.activityLog.activeLogs')}</div>
                    </div>
                    <div style="background: #f0fff4; padding: 1rem; border-radius: 6px; text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: #28a745;">${actionsToday}</div>
                        <div style="font-size: 0.85rem; color: #666;">${t('ct.extension.timetracker.admin.activityLog.actionsToday')}</div>
                    </div>
                    <div style="background: #fef5e7; padding: 1rem; border-radius: 6px; text-align: center;">
                        <div style="font-size: 1.2rem; font-weight: bold; color: #f39c12;">
                            C:${createCount} U:${updateCount} D:${deleteCount}
                        </div>
                        <div style="font-size: 0.85rem; color: #666;">By Action</div>
                    </div>
                </div>

                <!-- Filters -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                    <div>
                        <label style="display: block; margin-bottom: 0.25rem; font-size: 0.9rem; color: #666;">${t('ct.extension.timetracker.admin.activityLog.filterUser')}</label>
                        <select id="log-filter-user" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="all">${t('ct.extension.timetracker.entries.allUsers')}</option>
                            ${[...new Set(activityLogs.map(log => log.userId))].map(userId => {
            const log = activityLogs.find(l => l.userId === userId);
            return `<option value="${userId}" ${logFilterUser === userId.toString() ? 'selected' : ''}>${log?.userName || `User ${userId}`}</option>`;
        }).join('')}
                        </select>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.25rem; font-size: 0.9rem; color: #666;">${t('ct.extension.timetracker.admin.activityLog.filterAction')}</label>
                        <select id="log-filter-action" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="all" ${logFilterAction === 'all' ? 'selected' : ''}>${t('ct.extension.timetracker.admin.activityLog.allActions')}</option>
                            <option value="CREATE" ${logFilterAction === 'CREATE' ? 'selected' : ''}>${t('ct.extension.timetracker.admin.activityLog.created')}</option>
                            <option value="UPDATE" ${logFilterAction === 'UPDATE' ? 'selected' : ''}>${t('ct.extension.timetracker.admin.activityLog.updated')}</option>
                            <option value="DELETE" ${logFilterAction === 'DELETE' ? 'selected' : ''}>${t('ct.extension.timetracker.admin.activityLog.deleted')}</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.25rem; font-size: 0.9rem; color: #666;">${t('ct.extension.timetracker.admin.activityLog.dateFrom')}</label>
                        <input type="date" id="log-filter-date-from" value="${logFilterDateFrom}"
                               style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;"/>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.25rem; font-size: 0.9rem; color: #666;">${t('ct.extension.timetracker.admin.activityLog.dateTo')}</label>
                        <input type="date" id="log-filter-date-to" value="${logFilterDateTo}"
                               style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;"/>
                    </div>
                </div>

                <!-- Log Table -->
                ${pageLog.length > 0 ? `
                    <div style="overflow-x: auto; margin-bottom: 1rem;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                            <thead>
                                <tr style="background: #f5f5f5;">
                                    <th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid #ddd;">${t('ct.extension.timetracker.admin.activityLog.timestamp')}</th>
                                    <th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid #ddd;">${t('ct.extension.timetracker.admin.activityLog.user')}</th>
                                    <th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid #ddd;">${t('ct.extension.timetracker.admin.activityLog.action')}</th>
                                    <th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid #ddd;">${t('ct.extension.timetracker.admin.activityLog.details')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${pageLog.map(log => {
            const actionColor = log.action === 'CREATE' ? '#28a745' : log.action === 'UPDATE' ? '#ffc107' : '#dc3545';
            const date = new Date(log.timestamp);
            return `
                                        <tr style="border-bottom: 1px solid #eee;">
                                            <td style="padding: 0.75rem;">${date.toLocaleString()}</td>
                                            <td style="padding: 0.75rem;">${log.userName}</td>
                                            <td style="padding: 0.75rem;"><span style="background: ${actionColor}; color: white; padding: 0.25rem 0.5rem; border-radius: 3px; font-size: 0.85rem;">${log.action}</span></td>
                                            <td style="padding: 0.75rem; font-size: 0.85rem; color: #666;">
                                                ${log.details.categoryName || ''} 
                                                ${log.details.description ? `- ${log.details.description.substring(0, 50)}${log.details.description.length > 50 ? '...' : ''}` : ''}
                                                ${log.details.duration ? `(${Math.round(log.details.duration / 1000 / 60)}min)` : ''}
                                            </td>
                                        </tr>
                                    `;
        }).join('')}
                            </tbody>
                        </table>
                    </div>

                    <!-- Pagination -->
                    ${totalPages > 1 ? `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem 0;">
                            <div style="font-size: 0.9rem; color: #666;">
                                ${t('ct.extension.timetracker.admin.activityLog.showingEntries')
                        .replace('{from}', (startIdx + 1).toString())
                        .replace('{to}', endIdx.toString())
                        .replace('{total}', filteredLogs.length.toString())}
                            </div>
                            <div style="display: flex; gap: 0.5rem;">
                                <button id="log-prev-page" ${logPage === 1 ? 'disabled' : ''}
                                        style="padding: 0.5rem 1rem; border: 1px solid #ddd; background: ${logPage === 1 ? '#f5f5f5' : '#fff'}; 
                                               border-radius: 4px; cursor: ${logPage === 1 ? 'not-allowed' : 'pointer'};">
                                    ← Prev
                                </button>
                                <span style="padding: 0.5rem 1rem; border: 1px solid #ddd; background: #f5f5f5; border-radius: 4px;">
                                    ${t('ct.extension.timetracker.admin.activityLog.page')
                        .replace('{current}', logPage.toString())
                        .replace('{total}', totalPages.toString())}
                                </span>
                                <button id="log-next-page" ${logPage === totalPages ? 'disabled' : ''}
                                        style="padding: 0.5rem 1rem; border: 1px solid #ddd; background: ${logPage === totalPages ? '#f5f5f5' : '#fff'}; 
                                               border-radius: 4px; cursor: ${logPage === totalPages ? 'not-allowed' : 'pointer'};">
                                    Next →
                                </button>
                            </div>
                        </div>
                    ` : ''}
                ` : `
                    <div style="padding: 2rem; text-align: center; color: #999;">
                        ${t('ct.extension.timetracker.admin.activityLog.noLogs')}
                    </div>
                `}
            </div>
        `;
    }

    function renderBackupsSection(): string {
        if (backupsList.length === 0) {
            return `
                <div style="margin-top: 3rem; border-top: 1px solid #eee; padding-top: 2rem;">
                    <h3 style="color: #333; margin-bottom: 1rem;">${t('ct.extension.timetracker.admin.settingsBackup')}</h3>
                    <p style="color: #666; font-style: italic;">${t('ct.extension.timetracker.admin.noBackups')}</p>
                </div>
            `;
        }

        const backupsHtml = backupsList
            .map((backup) => {
                const date = new Date(backup.timestamp).toLocaleString();
                const id = (backup as any).id; // KV Store ID
                return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; border-bottom: 1px solid #eee;">
                    <div>
                        <div style="font-weight: 600; color: #333;">${date}</div>
                        <div style="font-size: 0.85rem; color: #666;">${backup.summary || 'No summary'} (v${backup.version})</div>
                    </div>
                    <button class="restore-backup-btn btn btn-sm btn-outline-secondary" data-backup-id="${id}" style="padding: 0.25rem 0.5rem; border: 1px solid #ccc; background: #fff; border-radius: 4px; cursor: pointer;">
                        ${t('ct.extension.timetracker.admin.restoreBackup')}
                    </button>
                </div>
            `;
            })
            .join('');

        return `
            <div style="margin-top: 3rem; border-top: 1px solid #eee; padding-top: 2rem;">
                <h3 style="color: #333; margin-bottom: 1rem;">${t('ct.extension.timetracker.admin.settingsBackup')}</h3>
                <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                    <div style="padding: 1rem; background: #f8f9fa; border-bottom: 1px solid #ddd; font-size: 0.9rem; color: #666;">
                        ${t('ct.extension.timetracker.admin.lastBackups').replace('{count}', backupsList.length.toString())}
                    </div>
                    ${backupsHtml}
                </div>
            </div>
        `;
    }

    function render() {
        element.innerHTML = `
            <div style="max-width: 900px; margin: 2rem auto; padding: 2rem;">
                <!-- Extension Info Header -->
                <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h1 style="margin: 0 0 0.5rem 0; font-size: 1.8rem; color: #333;">${t('ct.extension.timetracker.admin.title')}</h1>
                    <p style="margin: 0 0 0.5rem 0; color: #666;">
                        ${t('ct.extension.timetracker.admin.description')}
                    </p>
                    <div style="display: flex; gap: 1rem; margin-top: 1rem; font-size: 0.85rem; color: #999;">
                        <span><strong>${t('ct.extension.timetracker.admin.version')}:</strong> ${data.extensionInfo?.version || 'N/A'}</span>
                        <span><strong>${t('ct.extension.timetracker.admin.key')}:</strong> ${data.extensionInfo?.key || KEY || 'N/A'}</span>
                        ${data.extensionInfo?.author?.name ? `<span><strong>Author:</strong> ${data.extensionInfo.author.name}</span>` : ''}
                    </div>
                </div>

                ${isLoading
                ? `
                    <div style="max-width: 1200px; margin: 0 auto; text-align: center; padding: 3rem;">
                        <div style="margin-bottom: 1rem; display: flex; justify-content: center;">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#007bff" stroke-width="2" style="animation: spin 1s linear infinite;">
                                <style>
                                    @keyframes spin {
                                        from { transform: rotate(0deg); }
                                        to { transform: rotate(360deg); }
                                    }
                                </style>
                                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
                            </svg>
                        </div>
                        <p>Loading settings...</p>
                    </div>
                `
                : errorMessage
                    ? `
                    <div style="padding: 1.5rem; background: #fee; border: 1px solid #fcc; border-radius: 8px; color: #c00; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <strong>Error:</strong> ${errorMessage}
                    </div>
                `
                    : `
                    ${renderGeneralSettings()}
                    ${renderGroupManagement()}
                    ${renderManagerAssignments()}
                    ${renderWorkCategories()}
                    ${renderActivityLogSection()}
                    ${renderBackupsSection()}
                `
            }
            </div>
        `;

        if (!isLoading && !errorMessage) {
            attachEventHandlers();
            // Initialize button states after render
            setTimeout(() => updateSaveButtonState(), 0);
        }
    }

    function renderGeneralSettings(): string {
        return `
            <!-- General Settings -->
            <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="margin: 0 0 1rem 0; font-size: 1.3rem; color: #333;">${t('ct.extension.timetracker.admin.generalSettings')}</h2>
                <p style="margin: 0 0 1.5rem 0; color: #666; font-size: 0.95rem;">
                    ${t('ct.extension.timetracker.admin.generalSettingsHelp')}
                </p>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 600;">
                            ${t('ct.extension.timetracker.admin.hoursPerDay')}
                        </label>
                        <input
                            type="number"
                            id="hours-per-day"
                            value="${settings.defaultHoursPerDay}"
                            min="1"
                            max="24"
                            step="0.5"
                            style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;"
                        />
                        <small style="color: #666; font-size: 0.85rem;">${t('ct.extension.timetracker.admin.hoursHelp')}</small>
                    </div>

                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 600;">
                            ${t('ct.extension.timetracker.admin.hoursPerWeek')}
                        </label>
                        <input
                            type="number"
                            id="hours-per-week"
                            value="${settings.defaultHoursPerWeek}"
                            min="1"
                            max="168"
                            step="0.5"
                            style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;"
                        />
                        <small style="color: #666; font-size: 0.85rem;">${t('ct.extension.timetracker.admin.hoursHelp')}</small>
                    </div>
                </div>

                <!-- Language Selection -->
                <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #e0e0e0;">
                    <label style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 600;">
                        ${t('ct.extension.timetracker.admin.language')}
                    </label>
                    <select
                        id="language-select"
                        style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem; cursor: pointer;"
                    >
                        <option value="auto" ${(settings.language || 'auto') === 'auto' ? 'selected' : ''}>🌐 Automatic (Browser)</option>
                        <option value="de" ${settings.language === 'de' ? 'selected' : ''}>🇩🇪 Deutsch</option>
                        <option value="en" ${settings.language === 'en' ? 'selected' : ''}>🇬🇧 English</option>
                    </select>
                    <small style="color: #666; font-size: 0.85rem; display: block; margin-top: 0.5rem;">
                        ${t('ct.extension.timetracker.admin.languageHelp')}
                    </small>
                </div>

                <!-- Work Week Days Configuration -->
                <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #e0e0e0;">
                    <h3 style="margin: 0 0 0.5rem 0; font-size: 1.1rem; color: #333;">${t('ct.extension.timetracker.admin.workWeekDays')}</h3>
                    <p style="margin: 0 0 1rem 0; color: #666; font-size: 0.95rem;">
                        ${t('ct.extension.timetracker.admin.workWeekDaysHelp')}
                    </p>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 0.75rem;">
                        ${[
                // Array indices: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
                {
                    day: 0,
                    label: t('ct.extension.timetracker.common.weekDaysFull.sun'),
                },
                {
                    day: 1,
                    label: t('ct.extension.timetracker.common.weekDaysFull.mon'),
                },
                {
                    day: 2,
                    label: t('ct.extension.timetracker.common.weekDaysFull.tue'),
                },
                {
                    day: 3,
                    label: t('ct.extension.timetracker.common.weekDaysFull.wed'),
                },
                {
                    day: 4,
                    label: t('ct.extension.timetracker.common.weekDaysFull.thu'),
                },
                {
                    day: 5,
                    label: t('ct.extension.timetracker.common.weekDaysFull.fri'),
                },
                {
                    day: 6,
                    label: t('ct.extension.timetracker.common.weekDaysFull.sat'),
                },
            ]
                .map(({ day, label }) => {
                    const isChecked = (
                        settings.workWeekDays || [1, 2, 3, 4, 5]
                    ).includes(day);
                    return `
                                <label style="display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; background: ${isChecked ? '#e7f3ff' : '#f8f9fa'}; border: 1px solid ${isChecked ? '#007bff' : '#dee2e6'}; border-radius: 4px; cursor: pointer; transition: all 0.2s;">
                                    <input
                                        type="checkbox"
                                        class="work-week-day-checkbox"
                                        data-day="${day}"
                                        ${isChecked ? 'checked' : ''}
                                        style="width: 18px; height: 18px; cursor: pointer;"
                                    />
                                    <span style="font-weight: ${isChecked ? '600' : '400'}; color: ${isChecked ? '#007bff' : '#333'}; font-size: 0.9rem;">${label}</span>
                                </label>
                            `;
                })
                .join('')}
                    </div>
                </div>

                <!-- ${t('ct.extension.timetracker.admin.alphaFeatures')} -->
                <div style="margin-top: 2.5rem; padding-top: 1.5rem; border-top: 1px solid #e0e0e0;">
                    <h3 style="margin: 0 0 0.5rem 0; font-size: 1.1rem; color: #333; display: flex; align-items: center; gap: 0.5rem;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 2v6m0 0v6m0-6h6M9 8H3m18 4v6m0 0v2m0-2h-6m6 0h2"></path>
                            <circle cx="9" cy="14" r="3"></circle>
                            <circle cx="18" cy="6" r="3"></circle>
                        </svg>
                        ${t('ct.extension.timetracker.admin.alphaFeatures')}
                    </h3>
                    <p style="margin: 0 0 1rem 0; color: #ff9800; font-size: 0.9rem; background: #fff3e0; padding: 0.75rem; border-radius: 4px; border-left: 3px solid #ff9800;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#856404" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-right: 0.5rem;">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        ${t('ct.extension.timetracker.admin.alphaWarning')}
                    </p>

                    <label style="display: flex; align-items: center; cursor: pointer; padding: 0.75rem; background: #f8f9fa; border-radius: 4px; border: 1px solid #e0e0e0;">
                        <input
                            type="checkbox"
                            id="excel-import-toggle"
                            ${settings.excelImportEnabled ? 'checked' : ''}
                            style="width: 20px; height: 20px; margin-right: 0.75rem; cursor: pointer;"
                        />
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: #333; margin-bottom: 0.25rem;">
                                ${t('ct.extension.timetracker.admin.excelImportEnabled')}
                                <span style="background: #ff9800; color: white; padding: 0.125rem 0.5rem; border-radius: 3px; font-size: 0.75rem; margin-left: 0.5rem; font-weight: 700;">ALPHA</span>
                            </div>
                            <div style="color: #666; font-size: 0.85rem;">
                                ${t('ct.extension.timetracker.admin.excelImportDescription')}
                            </div>
                        </div>
                    </label>
                </div>

                <button
                    id="save-settings-btn"
                    style="width: 100%; padding: 0.75rem 1.5rem; background: #28a745 !important; color: white !important; border: none !important; border-radius: 4px !important; cursor: pointer !important; font-size: 1rem !important; font-weight: 600 !important; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; margin-top: 3rem; transition: background 0.2s !important;"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M5 13l4 4L19 7"></path>
                    </svg>
                    ${t('ct.extension.timetracker.admin.settingsSaved')}
                </button>

                <div id="settings-status" style="margin-top: 1rem; padding: 0.75rem; border-radius: 4px; display: none;"></div>
            </div>
        `;
    }

    function renderGroupManagement(): string {
        // Initialize userHoursConfig if not present
        if (!settings.userHoursConfig) {
            settings.userHoursConfig = [];
        }

        return `
            <!-- Group Management -->
            <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="margin: 0 0 1rem 0; font-size: 1.3rem; color: #333;">👥 ${t('ct.extension.timetracker.admin.employeeConfig')}</h2>
                <p style="margin: 0 0 1.5rem 0; color: #666; font-size: 0.95rem;">
                    ${t('ct.extension.timetracker.admin.employeeGroupHelp')}
                </p>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 600;">
                            ${t('ct.extension.timetracker.admin.employeeGroup')}
                        </label>
                        <input
                            type="number"
                            id="employee-group-id"
                            value="${settings.employeeGroupId || ''}"
                            placeholder="e.g., 42"
                            style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;"
                        />
                        <small style="color: #666; font-size: 0.85rem;">${t('ct.extension.timetracker.admin.employeeGroupHelp')}</small>
                    </div>

                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 600;">
                            ${t('ct.extension.timetracker.admin.volunteerGroup')}
                        </label>
                        <input
                            type="number"
                            id="volunteer-group-id"
                            value="${settings.volunteerGroupId || ''}"
                            placeholder="e.g., 43"
                            style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;"
                        />
                        <small style="color: #666; font-size: 0.85rem;">${t('ct.extension.timetracker.admin.volunteerGroupHelp')}</small>
                    </div>
                </div>

                <!-- Employee Configuration -->
                <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #e0e0e0;">
                    <h3 style="margin: 0 0 0.5rem 0; font-size: 1.1rem; color: #333;">
                        ${t('ct.extension.timetracker.admin.individualSettings')}
                    </h3>
                    <p style="margin: 0 0 1rem 0; color: #666; font-size: 0.9rem;">
                        ${t('ct.extension.timetracker.admin.individualSettingsHelp')}
                    </p>

                    ${employeesList.length > 0
                ? `
                        <!-- Employees Table -->
                        <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; padding: 1rem;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin: 0 0 1rem 0;">
                                <p style="margin: 0; color: #333; font-weight: 600;">
                                    ${t('ct.extension.timetracker.admin.foundEmployees').replace('{count}', employeesList.length.toString())}
                                </p>
                                <button
                                    id="refresh-employees-btn"
                                    ${!settings.employeeGroupId || loadingEmployees ? 'disabled' : ''}
                                    style="padding: 0.5rem; background: ${!settings.employeeGroupId || loadingEmployees ? '#6c757d' : '#17a2b8'}; color: white; border: none; border-radius: 4px; cursor: ${!settings.employeeGroupId || loadingEmployees ? 'not-allowed' : 'pointer'}; display: inline-flex; align-items: center; gap: 0.5rem;"
                                    title="${loadingEmployees ? 'Loading...' : 'Refresh employees from ChurchTools'}"
                                >
                                    ${loadingEmployees
                    ? `
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
                                            <style>
                                                @keyframes spin {
                                                    from { transform: rotate(0deg); }
                                                    to { transform: rotate(360deg); }
                                                }
                                            </style>
                                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                                        </svg>
                                    `
                    : `
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="23 4 23 10 17 10"></polyline>
                                            <polyline points="1 20 1 14 7 14"></polyline>
                                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                        </svg>
                                    `
                }
                                </button>
                            </div>

                            <div style="overflow-x: auto;">
                                <table style="width: 100%; border-collapse: collapse;">
                                    <thead>
                                        <tr style="background: #e9ecef;">
                                            <th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid #dee2e6; font-weight: 600; color: #333;">${t('ct.extension.timetracker.admin.employee')}</th>
                                            <th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid #dee2e6; font-weight: 600; color: #333;">${t('ct.extension.timetracker.admin.status')}</th>
                                            <th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid #dee2e6; font-weight: 600; color: #333;">Hours/Day</th>
                                            <th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid #dee2e6; font-weight: 600; color: #333;">Hours/Week</th>
                                            <th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid #dee2e6; font-weight: 600; color: #333; min-width: 280px;">${t('ct.extension.timetracker.admin.workWeekDays')}</th>
                                            <th style="padding: 0.75rem; text-align: center; border-bottom: 2px solid #dee2e6; font-weight: 600; color: #333;">${t('ct.extension.timetracker.timeEntries.actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${employeesList
                    .map((emp) => {
                        const existingConfig =
                            settings.userHoursConfig?.find(
                                (c) => c.userId === emp.userId
                            );
                        const hoursPerDay =
                            existingConfig?.hoursPerDay ||
                            settings.defaultHoursPerDay;
                        const hoursPerWeek =
                            existingConfig?.hoursPerWeek ||
                            settings.defaultHoursPerWeek;
                        const isActive = existingConfig?.isActive !== false;

                        return `
                                                <tr style="border-bottom: 1px solid #dee2e6; ${!isActive ? 'background: #fff3cd;' : ''}">
                                                    <td style="padding: 0.75rem; color: #333;">
                                                        ${emp.userName} <span style="color: #999; font-size: 0.85rem;">(${emp.userId})</span>
                                                    </td>
                                                    <td style="padding: 0.75rem;">
                                                        ${isActive
                                ? `
                                                            <span style="background: #d4edda; color: #155724; padding: 0.25rem 0.5rem; border-radius: 3px; font-size: 0.75rem; font-weight: 600; border: 1px solid #c3e6cb; white-space: nowrap;">
                                                                ✓ ${t('ct.extension.timetracker.admin.active')}
                                                            </span>
                                                        `
                                : `
                                                            <span style="background: #fff3cd; color: #856404; padding: 0.25rem 0.5rem; border-radius: 3px; font-size: 0.75rem; font-weight: 600; border: 1px solid #ffeaa7;">
                                                                ⚠ ${t('ct.extension.timetracker.admin.removed')}
                                                            </span>
                                                        `
                            }
                                                    </td>
                                                    <td style="padding: 0.75rem;">
                                                        <input
                                                            type="number"
                                                            class="employee-hours-day"
                                                            data-user-id="${emp.userId}"
                                                            data-user-name="${emp.userName}"
                                                            value="${hoursPerDay}"
                                                            min="0.5"
                                                            max="24"
                                                            step="0.5"
                                                            ${!isActive ? 'disabled' : ''}
                                                            style="width: 80px; padding: 0.5rem; border: 1px solid #ced4da; border-radius: 4px; ${!isActive ? 'background: #f5f5f5; cursor: not-allowed;' : ''}"
                                                        />
                                                    </td>
                                                    <td style="padding: 0.75rem;">
                                                        <input
                                                            type="number"
                                                            class="employee-hours-week"
                                                            data-user-id="${emp.userId}"
                                                            data-user-name="${emp.userName}"
                                                            value="${hoursPerWeek}"
                                                            min="0.5"
                                                            max="168"
                                                            step="0.5"
                                                            ${!isActive ? 'disabled' : ''}
                                                            style="width: 80px; padding: 0.5rem; border: 1px solid #ced4da; border-radius: 4px; ${!isActive ? 'background: #f5f5f5; cursor: not-allowed;' : ''}"
                                                        />
                                                    </td>
                                                    <td style="padding: 0.75rem;">
                                                        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;">
                                                            ${[
                                t(
                                    'ct.extension.timetracker.common.weekDays.sun'
                                ),
                                t(
                                    'ct.extension.timetracker.common.weekDays.mon'
                                ),
                                t(
                                    'ct.extension.timetracker.common.weekDays.tue'
                                ),
                                t(
                                    'ct.extension.timetracker.common.weekDays.wed'
                                ),
                                t(
                                    'ct.extension.timetracker.common.weekDays.thu'
                                ),
                                t(
                                    'ct.extension.timetracker.common.weekDays.fri'
                                ),
                                t(
                                    'ct.extension.timetracker.common.weekDays.sat'
                                ),
                            ]
                                .map((day, index) => {
                                    const workWeek =
                                        existingConfig?.workWeekDays ||
                                        settings.workWeekDays || [
                                            1, 2, 3, 4, 5,
                                        ];
                                    const isChecked =
                                        workWeek.includes(index);
                                    return `
                                                                <label style="display: flex; align-items: center; justify-content: center; cursor: ${isActive ? 'pointer' : 'not-allowed'}; opacity: ${isActive ? '1' : '0.5'};" title="${[
                                            t(
                                                'ct.extension.timetracker.common.weekDaysFull.sun'
                                            ),
                                            t(
                                                'ct.extension.timetracker.common.weekDaysFull.mon'
                                            ),
                                            t(
                                                'ct.extension.timetracker.common.weekDaysFull.tue'
                                            ),
                                            t(
                                                'ct.extension.timetracker.common.weekDaysFull.wed'
                                            ),
                                            t(
                                                'ct.extension.timetracker.common.weekDaysFull.thu'
                                            ),
                                            t(
                                                'ct.extension.timetracker.common.weekDaysFull.fri'
                                            ),
                                            t(
                                                'ct.extension.timetracker.common.weekDaysFull.sat'
                                            ),
                                        ][index]
                                        }">
                                                                    <input
                                                                        type="checkbox"
                                                                        class="user-work-week-checkbox"
                                                                        data-user-id="${emp.userId}"
                                                                        data-day="${index}"
                                                                        ${isChecked ? 'checked' : ''}
                                                                        ${!isActive ? 'disabled' : ''}
                                                                        style="width: 16px; height: 16px; cursor: ${isActive ? 'pointer' : 'not-allowed'}; margin: 0; accent-color: #007bff;"
                                                                    />
                                                                    <span style="font-size: 0.7rem; margin-left: 2px; color: ${isActive ? '#333' : '#999'}; user-select: none;">${day}</span>
                                                                </label>
                `;
                                })
                                .join('')}
                                                        </div>
                                                    </td>
                                                    <td style="padding: 0.75rem; text-align: center;">
                                                        ${!isActive
                                ? `
                                                            <button
                                                                class="delete-employee-btn"
                                                                data-user-id="${emp.userId}"
                                                                data-user-name="${emp.userName}"
                                                                style="padding: 0.4rem 0.8rem; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.35rem;"
                                                                title="${t('ct.extension.timetracker.admin.deleteEmployeeTooltip')}"
                                                            >
                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                                    <polyline points="3 6 5 6 21 6"></polyline>
                                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                                </svg>
                                                                ${t('ct.extension.timetracker.common.delete')}
                                                            </button>
                                                        `
                                : `
                                                            <span style="color: #999; font-size: 0.85rem; font-style: italic;">-</span>
                                                        `
                            }
                                                    </td>
                                                </tr>
                                            `;
                    })
                    .join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    `
                : !loadingEmployees && settings.employeeGroupId
                    ? `
                        <p style="color: #666; font-style: italic; background: #f8f9fa; padding: 1rem; border-radius: 4px; border-left: 3px solid #6c757d;">
                            ${t('ct.extension.timetracker.admin.clickLoadEmployees')}
                        </p>
                    `
                    : ''
            }
                </div>

                <button
                    id="save-group-settings-btn"
                    style="width: 100%; padding: 0.75rem 1.5rem; background: #28a745 !important; color: white !important; border: none !important; border-radius: 4px !important; cursor: pointer !important; font-size: 1rem !important; font-weight: 600 !important; margin-top: 3rem; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; transition: background 0.2s !important;"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M5 13l4 4L19 7"></path>
                    </svg>
                    ${t('ct.extension.timetracker.admin.settingsSaved')}
                </button>

                <div id="group-settings-status" style="margin-top: 1rem; padding: 0.75rem; border-radius: 4px; display: none;"></div>
            </div>
        `;
    }

    //  Render Manager Assignments UI
    function renderManagerAssignments(): string {
        // Only show if employee group is configured (manager group can be set here)
        if (!settings.employeeGroupId) {
            return ''; // Don't show this section if employees aren't configured yet
        }

        // Initialize manager assignments if not present
        if (!settings.managerAssignments) {
            settings.managerAssignments = [];
        }

        return `
            <!-- Manager Assignments -->
            <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="margin: 0 0 1rem 0; font-size: 1.3rem; color: #333;">👔 Manager-to-Employee Assignments</h2>
                <p style="margin: 0 0 1.5rem 0; color: #666; font-size: 0.95rem;">
                    Assign employees to managers. Managers can view and export time entries for their assigned employees.
                </p>

                <!-- Manager Group ID Input -->
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 600;">
                        Manager Group ID
                    </label>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <input
                            type="number"
                            id="manager-group-id"
                            value="${settings.managerGroupId || ''}"
                            placeholder="Enter ChurchTools Manager Group ID"
                            style="flex: 1; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;"
                        />
                        <button
                            id="load-managers-btn"
                            style="padding: 0.75rem 1.5rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; white-space: nowrap;"
                        >
                            Load Managers
                        </button>
                    </div>
                    <small style="color: #666; font-size: 0.85rem;">Enter the ChurchTools group ID for managers, then click "Load Managers"</small>
                </div>

                ${loadingManagers
                ? `
                    <div style="text-align: center; padding: 2rem; color: #666;">
                        <div style="display: inline-block;">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#007bff" stroke-width="2" style="animation: spin 1s linear infinite;">
                                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
                            </svg>
                        </div>
                        <p style="margin-top: 1rem;">Loading managers...</p>
                    </div>
                `
                : managersList.length > 0
                    ? `
                    <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; padding: 1rem; margin-bottom: 1rem;">
                        <h3 style="margin: 0 0 1rem 0; font-size: 1.1rem; color: #333;">Manager Assignments (${managersList.length} managers)</h3>
                        
                        ${managersList
                        .map((manager) => {
                            const assignment = settings.managerAssignments?.find(
                                (a) => a.managerId === manager.userId
                            );
                            const assignedIds = assignment?.employeeIds || [];

                            return `
                                <div style="background: white; border: 1px solid #dee2e6; border-radius: 4px; padding: 1rem; margin-bottom: 0.75rem;">
                                    <h4 style="margin: 0 0 0.75rem 0; font-size: 1rem; color: #495057;">${manager.userName}</h4>
                                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.5rem;">
                                        ${employeesList
                                    .map((emp) => {
                                        const isChecked = assignedIds.includes(emp.userId);
                                        return `
                                                <label style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; border-radius: 3px; cursor: pointer; hover: background: #f8f9fa;">
                                                    <input
                                                        type="checkbox"
                                                        class="manager-employee-checkbox"
                                                        data-manager-id="${manager.userId}"
                                                        data-employee-id="${emp.userId}"
                                                        ${isChecked ? 'checked' : ''}
                                                        style="width: 16px; height: 16px; cursor: pointer; accent-color: #007bff;"
                                                    />
                                                    <span style="font-size: 0.9rem;">${emp.userName}</span>
                                                </label>
                                            `;
                                    })
                                    .join('')}
                                    </div>
                                </div>
                            `;
                        })
                        .join('')}
                    </div>

                    <!-- Status Message -->
                    <div id="manager-assignments-status" style="display: none; padding: 1rem; margin-top: 1rem; border-radius: 4px; font-size: 0.95rem; font-weight: 600;"></div>

                    <button
                        id="save-manager-assignments-btn"
                        style="width: 100%; margin-top: 1.5rem; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem 1.5rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; font-weight: 600;"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                            <polyline points="17 21 17 13 7 13 7 21"></polyline>
                            <polyline points="7 3 7 8 15 8"></polyline>
                        </svg>
                        Save Manager Assignments
                    </button>
                `
                    : settings.managerGroupId
                        ? `
                    <div style="text-align: center; padding: 2rem; color: #666; background: #f8f9fa; border-radius: 4px;">
                        <p>Click "Load Managers" to load managers from group ${settings.managerGroupId}</p>
                    </div>
                `
                        : ''
            }
            </div>
        `;
    }

    function renderWorkCategories(): string {
        return `
            <!-- Work Categories -->
            <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <div>
                        <h2 style="margin: 0 0 0.25rem 0; font-size: 1.3rem; color: #333;">${t('ct.extension.timetracker.admin.workCategories')}</h2>
                        <p style="margin: 0; color: #666; font-size: 0.95rem;">
                            ${t('ct.extension.timetracker.admin.workCategoriesHelp')}
                        </p>
                    </div>
                    <button
                        id="add-category-btn"
                        style="padding: 0.5rem 1rem; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; white-space: nowrap; display: inline-flex; align-items: center; gap: 0.5rem;"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        ${t('ct.extension.timetracker.admin.addCategory')}
                    </button>
                </div>

                ${showAddCategory || editingCategory
                ? `
                    <!-- Category Form -->
                    <div style="background: #f8f9fa; border: 2px solid ${editingCategory ? '#ffc107' : '#28a745'}; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
                        <h3 style="margin: 0 0 1rem 0; color: #333; display: flex; align-items: center; gap: 0.5rem;">
                            ${editingCategory
                    ? `
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                                ${t('ct.extension.timetracker.admin.editCategory')}
                            `
                    : `
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                                ${t('ct.extension.timetracker.admin.addCategory')}
                            `
                }
                        </h3>

                        <div style="display: grid; gap: 1rem; margin-bottom: 1rem;">
                            ${editingCategory
                    ? `
                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 600;">
                                    ${t('ct.extension.timetracker.admin.categoryId')}
                                </label>
                                <input
                                    type="text"
                                    id="category-id"
                                    value="${editingCategory.id}"
                                    disabled
                                    style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; background: #e9ecef; cursor: not-allowed; font-family: monospace;"
                                />
                                <small style="color: #666; font-size: 0.85rem;">${t('ct.extension.timetracker.admin.idCannotBeChanged')}</small>
                            </div>
                            `
                    : ''
                }

                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 600;">
                                    ${t('ct.extension.timetracker.admin.categoryName')}
                                </label>
                                <input
                                    type="text"
                                    id="category-name"
                                    value="${editingCategory?.name || ''}"
                                    placeholder="e.g., Pastoral Care"
                                    style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px;"
                                />
                                <small style="color: #666; font-size: 0.85rem;">${t('ct.extension.timetracker.admin.categoryNameHelp')}</small>
                            </div>

                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 600;">
                                    ${t('ct.extension.timetracker.admin.categoryColor')}
                                </label>
                                <div style="display: flex; gap: 1rem; align-items: center;">
                                    <input
                                        type="color"
                                        id="category-color"
                                        value="${editingCategory?.color || '#007bff'}"
                                        style="width: 80px; height: 45px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;"
                                    />
                                    <input
                                        type="text"
                                        id="category-color-hex"
                                        value="${editingCategory?.color || '#007bff'}"
                                        placeholder="#007bff"
                                        style="flex: 1; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-family: monospace;"
                                    />
                                </div>
                            </div>
                        </div>

                        <div style="display: flex; gap: 0.5rem;">
                            <button
                                id="save-category-btn"
                                style="padding: 0.75rem 1.5rem; background: ${editingCategory ? '#ffc107' : '#28a745'}; color: ${editingCategory ? '#333' : 'white'}; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem;"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                    <polyline points="7 3 7 8 15 8"></polyline>
                                </svg>
                                ${editingCategory ? t('ct.extension.timetracker.common.save') : t('ct.extension.timetracker.common.save')}
                            </button>
                            <button
                                id="cancel-category-btn"
                                style="padding: 0.75rem 1.5rem; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;"
                            >
                                Cancel
                            </button>
                        </div>

                        <div id="category-form-status" style="margin-top: 1rem; padding: 0.75rem; border-radius: 4px; display: none;"></div>
                    </div>
                `
                : ''
            }

                ${showDeleteDialog && categoryToDelete
                ? `
                    <!-- Delete Confirmation Dialog -->
                    <div style="background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
                        <h3 style="margin: 0 0 1rem 0; color: #856404; display: flex; align-items: center; gap: 0.5rem;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                <line x1="12" y1="9" x2="12" y2="13"></line>
                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                            Kategorie wird verwendet
                        </h3>

                        <p style="color: #856404; margin-bottom: 1rem;">
                            Die Kategorie <strong>"${categoryToDelete.name}"</strong> wird von <strong>${affectedEntriesCount}</strong>
                            ${affectedEntriesCount === 1 ? 'Zeiteintrag' : 'Zeiteinträgen'} verwendet.
                        </p>

                        <p style="color: #856404; margin-bottom: 1rem;">
                            Bitte wähle eine Ersatzkategorie aus, der diese Einträge zugewiesen werden sollen, bevor die Kategorie gelöscht wird:
                        </p>

                        <div style="margin-bottom: 1rem;">
                            <label style="display: block; margin-bottom: 0.5rem; color: #856404; font-weight: 600;">
                                Ersatzkategorie
                            </label>
                            <select
                                id="replacement-category-select"
                                style="width: 100%; padding: 0.75rem; border: 1px solid #ffc107; border-radius: 4px; background: white;"
                            >
                                ${workCategories
                    .filter((c) => c.id !== categoryToDelete!.id)
                    .map(
                        (c) =>
                            `<option value="${c.id}" ${c.id === replacementCategoryId ? 'selected' : ''}>${c.name}</option>`
                    )
                    .join('')}
                            </select>
                        </div>

                        <div style="display: flex; gap: 0.5rem;">
                            <button
                                id="confirm-delete-btn"
                                style="padding: 0.75rem 1.5rem; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem;"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                                Kategorie löschen und Einträge neu zuweisen
                            </button>
                            <button
                                id="cancel-delete-btn"
                                style="padding: 0.75rem 1.5rem; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;"
                            >
                                Abbrechen
                            </button>
                        </div>
                    </div>
                `
                : ''
            }

                <!-- Categories List -->
                ${workCategories.length === 0
                ? '<p style="color: #666; text-align: center; padding: 2rem;">No categories defined yet. Click "Add Category" to create one.</p>'
                : `
                    <div style="display: grid; gap: 1rem;">
                        ${workCategories
                    .map(
                        (category) => `
                            <div style="display: flex; align-items: center; justify-content: space-between; padding: 1rem; border: 1px solid #dee2e6; border-radius: 6px; background: #f8f9fa;">
                                <div style="display: flex; align-items: center; gap: 1rem; flex: 1;">
                                    <div style="width: 40px; height: 40px; background: ${category.color}; border-radius: 6px; border: 2px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"></div>
                                    <div>
                                        <div style="font-weight: 600; color: #333; margin-bottom: 0.25rem;">${category.name}</div>
                                        <div style="font-size: 0.85rem; color: #666; font-family: monospace;">${category.id}</div>
                                    </div>
                                </div>
                                <div style="display: flex; gap: 0.5rem;">
                                    <button
                                        data-category-id="${category.id}"
                                        class="edit-category-btn"
                                        style="padding: 0.5rem 1rem; background: #ffc107; color: #333; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem;"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                        </svg>
                                        ${t('ct.extension.timetracker.common.edit')}
                                    </button>
                                    <button
                                        data-category-id="${category.id}"
                                        class="delete-category-btn"
                                        style="padding: 0.5rem 1rem; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem;"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                        </svg>
                                        ${t('ct.extension.timetracker.common.delete')}
                                    </button>
                                </div>
                            </div>
                        `
                    )
                    .join('')}
                    </div>
                `
            }
            </div>
        `;
    }

    // Attach event handlers
    function attachEventHandlers() {
        // General Settings
        const saveSettingsBtn = element.querySelector('#save-settings-btn') as HTMLButtonElement;

        saveSettingsBtn?.addEventListener('click', async () => {
            await handleSaveSettings();
        });

        // Group Management
        const refreshEmployeesBtn = element.querySelector(
            '#refresh-employees-btn'
        ) as HTMLButtonElement;
        const saveGroupSettingsBtn = element.querySelector(
            '#save-group-settings-btn'
        ) as HTMLButtonElement;

        refreshEmployeesBtn?.addEventListener('click', async () => {
            const employeeGroupIdInput = element.querySelector(
                '#employee-group-id'
            ) as HTMLInputElement;
            const groupId = parseInt(employeeGroupIdInput.value);

            if (groupId && groupId > 0) {
                await loadEmployeesFromGroup(groupId);
            }
        });

        // Delete employee buttons (event delegation)
        element.querySelectorAll('.delete-employee-btn').forEach((btn) => {
            btn.addEventListener('click', async (e) => {
                const target = e.target as HTMLElement;
                const userId = parseInt(target.getAttribute('data-user-id') || '0');
                const userName = target.getAttribute('data-user-name') || 'Unknown';

                if (
                    confirm(
                        `Delete employee "${userName}" and all their time tracking data?\n\nThis action cannot be undone!`
                    )
                ) {
                    await handleDeleteEmployee(userId);
                }
            });
        });

        // Work week checkbox handlers - use smart change detection
        element.querySelectorAll('.user-work-week-checkbox').forEach((checkbox) => {
            checkbox.addEventListener('change', () => {
                updateSaveButtonState(); // Smart detection checks actual changes
            });
        });

        // Hours input handlers - use smart change detection
        element.querySelectorAll('.employee-hours-day, .employee-hours-week').forEach((input) => {
            input.addEventListener('input', () => {
                updateSaveButtonState(); // Smart detection checks actual changes
            });
        });

        // General Settings inputs (hours/day, hours/week) - use smart change detection
        element.querySelectorAll('#hours-per-day, #hours-per-week').forEach((input) => {
            input.addEventListener('input', () => {
                updateSaveButtonState(); // Smart detection checks actual changes
            });
        });

        // Language select - use smart change detection
        const languageSelect = element.querySelector('#language-select');
        languageSelect?.addEventListener('change', () => {
            updateSaveButtonState(); // Smart detection checks actual changes
        });

        //  Manager Assignments Handlers
        const loadManagersBtn = element.querySelector('#load-managers-btn') as HTMLButtonElement;
        const saveManagerAssignmentsBtn = element.querySelector(
            '#save-manager-assignments-btn'
        ) as HTMLButtonElement;

        loadManagersBtn?.addEventListener('click', async () => {
            const managerGroupIdInput = element.querySelector(
                '#manager-group-id'
            ) as HTMLInputElement;
            const groupId = parseInt(managerGroupIdInput.value);

            if (groupId && groupId > 0) {
                // Update settings first
                settings.managerGroupId = groupId;
                await loadManagersFromGroup(groupId);
            }
        });

        saveManagerAssignmentsBtn?.addEventListener('click', async () => {
            await handleSaveManagerAssignments();
        });

        // Manager assignment checkboxes - use smart change detection
        element.querySelectorAll('.manager-employee-checkbox').forEach((checkbox) => {
            checkbox.addEventListener('change', () => {
                updateSaveButtonState(); // Smart detection checks actual changes
            });
        });

        // Excel import toggle - use smart change detection
        const excelImportToggle = element.querySelector('#excel-import-toggle');
        excelImportToggle?.addEventListener('change', () => {
            updateSaveButtonState(); // Smart detection checks actual changes
        });

        // Global work week checkboxes - use smart change detection
        element.querySelectorAll('.work-week-day-checkbox').forEach((checkbox) => {
            checkbox.addEventListener('change', () => {
                updateSaveButtonState(); // Smart detection checks actual changes
            });
        });

        // Group ID inputs - use smart change detection
        element.querySelectorAll('#employee-group-id, #volunteer-group-id').forEach((input) => {
            input.addEventListener('input', () => {
                updateSaveButtonState(); // Smart detection checks actual changes
            });
        });

        saveGroupSettingsBtn?.addEventListener('click', async () => {
            await handleSaveGroupSettings();
        });

        // Work Categories
        const addCategoryBtn = element.querySelector('#add-category-btn') as HTMLButtonElement;
        const cancelCategoryBtn = element.querySelector(
            '#cancel-category-btn'
        ) as HTMLButtonElement;
        const saveCategoryBtn = element.querySelector('#save-category-btn') as HTMLButtonElement;

        addCategoryBtn?.addEventListener('click', () => {
            showAddCategory = true;
            editingCategory = null;
            render();
        });

        cancelCategoryBtn?.addEventListener('click', () => {
            showAddCategory = false;
            editingCategory = null;
            render();
        });

        saveCategoryBtn?.addEventListener('click', async () => {
            await handleSaveCategory();
        });

        // Color picker sync
        const colorPicker = element.querySelector('#category-color') as HTMLInputElement;
        const colorHex = element.querySelector('#category-color-hex') as HTMLInputElement;

        colorPicker?.addEventListener('input', (e) => {
            const color = (e.target as HTMLInputElement).value;
            if (colorHex) colorHex.value = color;
        });

        colorHex?.addEventListener('input', (e) => {
            const color = (e.target as HTMLInputElement).value;
            if (/^#[0-9A-Fa-f]{6}$/.test(color) && colorPicker) {
                colorPicker.value = color;
            }
        });

        // Edit/Delete category buttons
        const editCategoryBtns = element.querySelectorAll('.edit-category-btn');
        const deleteCategoryBtns = element.querySelectorAll('.delete-category-btn');

        editCategoryBtns.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();

                const target = e.currentTarget as HTMLElement;
                const categoryId = target.dataset.categoryId;
                console.log('[TimeTracker Admin] Edit button clicked, categoryId:', categoryId);
                console.log('[TimeTracker Admin] Available categories:', workCategories);

                const category = workCategories.find((c) => c.id === categoryId);
                console.log('[TimeTracker Admin] Found category:', category);

                if (category) {
                    editingCategory = { ...category }; // Create a copy
                    showAddCategory = false;
                    render();
                } else {
                    console.error('[TimeTracker Admin] Category not found for ID:', categoryId);
                    alert('Category not found. Please refresh the page.');
                }
            });
        });

        deleteCategoryBtns.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();

                const target = e.currentTarget as HTMLElement;
                const categoryId = target.dataset.categoryId;
                console.log('[TimeTracker Admin] Delete button clicked, categoryId:', categoryId);

                if (categoryId) {
                    initiateDeleteCategory(categoryId);
                } else {
                    console.error('[TimeTracker Admin] Category ID not found');
                    alert('Category not found. Please refresh the page.');
                }
            });
        });

        // Delete dialog handlers
        const confirmDeleteBtn = element.querySelector('#confirm-delete-btn');
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', () => {
                confirmDeleteCategory();
            });
        }

        const cancelDeleteBtn = element.querySelector('#cancel-delete-btn');
        if (cancelDeleteBtn) {
            cancelDeleteBtn.addEventListener('click', () => {
                cancelDeleteCategory();
            });
        }

        const replacementCategorySelect = element.querySelector(
            '#replacement-category-select'
        ) as HTMLSelectElement;
        if (replacementCategorySelect) {
            replacementCategorySelect.addEventListener('change', (e) => {
                replacementCategoryId = (e.target as HTMLSelectElement).value;
            });
        }

        // Restore backup handlers
        element.querySelectorAll('.restore-backup-btn').forEach((btn) => {
            btn.addEventListener('click', async (e) => {
                const target = e.target as HTMLElement;
                const button = target.closest('.restore-backup-btn') as HTMLElement;
                if (button) {
                    const id = parseInt(button.getAttribute('data-backup-id') || '0');
                    if (id) {
                        await handleRestoreBackup(id);
                    }
                }
            });
        });
    }

    // Handle save manager assignments
    async function handleSaveManagerAssignments() {
        const saveBtn = element.querySelector('#save-manager-assignments-btn') as HTMLButtonElement;
        const statusMessage = element.querySelector('#manager-assignments-status') as HTMLElement;

        if (!saveBtn || !statusMessage) return;

        const saveIconHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
        `;

        try {
            saveBtn.disabled = true;
            saveBtn.innerHTML = saveIconHTML + 'Saving...';

            // Collect all manager assignments from checkboxes
            const checkboxes = element.querySelectorAll(
                '.manager-employee-checkbox'
            ) as NodeListOf<HTMLInputElement>;

            // Build manager assignments map
            const assignmentsMap = new Map<number, Set<number>>();

            checkboxes.forEach((checkbox) => {
                const managerId = parseInt(checkbox.dataset.managerId || '0');
                const employeeId = parseInt(checkbox.dataset.employeeId || '0');

                if (checkbox.checked) {
                    if (!assignmentsMap.has(managerId)) {
                        assignmentsMap.set(managerId, new Set());
                    }
                    assignmentsMap.get(managerId)!.add(employeeId);
                }
            });

            // Convert map to ManagerAssignment array
            const managerAssignments: ManagerAssignment[] = [];
            assignmentsMap.forEach((employeeIds, managerId) => {
                const manager = managersList.find((m) => m.userId === managerId);
                if (manager) {
                    managerAssignments.push({
                        managerId,
                        managerName: manager.userName,
                        employeeIds: Array.from(employeeIds),
                    });
                }
            });

            // Update settings
            settings.managerAssignments = managerAssignments;
            await saveSettings(settings, 'Manager assignments updated');

            // Update original snapshots after successful save
            originalManagerSettings = {
                managerGroupId: settings.managerGroupId,
                managerAssignments: JSON.parse(JSON.stringify(managerAssignments)),
            };

            // Show success message
            statusMessage.style.display = 'block';
            statusMessage.style.background = '#d4edda';
            statusMessage.style.border = '1px solid #c3e6cb';
            statusMessage.style.color = '#155724';
            statusMessage.textContent = `✓ Manager assignments saved! ${managerAssignments.length} managers configured.`;

            // Show ChurchTools toast notification (top-right)
            emit('notification:show', {
                message: `✓ Manager assignments saved! ${managerAssignments.length} managers configured.`,
                type: 'success',
                duration: 3000,
            });

            console.log('[TimeTracker Admin] Manager assignments saved:', managerAssignments);

            // Update button state (will show green checkmark since hasUnsavedManagerChanges will be false)
            updateSaveButtonState();

            // Hide status message after 3 seconds
            setTimeout(() => {
                statusMessage.style.display = 'none';
            }, 3000);

            saveBtn.disabled = false;
        } catch (error) {
            console.error('[TimeTracker Admin] Failed to save manager assignments:', error);

            saveBtn.disabled = false;

            // Show error message
            statusMessage.style.display = 'block';
            statusMessage.style.background = '#f8d7da';
            statusMessage.style.border = '1px solid #f5c6cb';
            statusMessage.style.color = '#721c24';
            statusMessage.textContent =
                '✗ Failed to save manager assignments: ' +
                (error instanceof Error ? error.message : 'Unknown error');

            // Show ChurchTools toast notification (top-right)
            emit('notification:show', {
                message: '✗ Failed to save manager assignments',
                type: 'error',
                duration: 5000,
            });
        }
    }

    // Handle save general settings
    async function handleSaveSettings() {
        const hoursPerDayInput = element.querySelector('#hours-per-day') as HTMLInputElement;
        const hoursPerWeekInput = element.querySelector('#hours-per-week') as HTMLInputElement;
        const excelImportToggle = element.querySelector('#excel-import-toggle') as HTMLInputElement;
        const languageSelect = element.querySelector('#language-select') as HTMLSelectElement;
        const statusMessage = element.querySelector('#settings-status') as HTMLElement;
        const saveBtn = element.querySelector('#save-settings-btn') as HTMLButtonElement;

        if (
            !hoursPerDayInput ||
            !hoursPerWeekInput ||
            !excelImportToggle ||
            !languageSelect ||
            !statusMessage ||
            !saveBtn
        )
            return;

        const saveIconHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
        `;

        try {
            saveBtn.disabled = true;
            saveBtn.innerHTML = saveIconHTML + 'Saving...';

            // Collect work week days from checkboxes
            const workWeekDays: number[] = [];
            const workWeekCheckboxes = element.querySelectorAll(
                '.work-week-day-checkbox'
            ) as NodeListOf<HTMLInputElement>;
            workWeekCheckboxes.forEach((checkbox) => {
                if (checkbox.checked) {
                    const day = parseInt(checkbox.getAttribute('data-day') || '0');
                    workWeekDays.push(day);
                }
            });
            workWeekDays.sort((a, b) => a - b);

            const newSettings: Settings = {
                ...settings,
                defaultHoursPerDay: parseFloat(hoursPerDayInput.value),
                defaultHoursPerWeek: parseFloat(hoursPerWeekInput.value),
                excelImportEnabled: excelImportToggle.checked,
                workWeekDays: workWeekDays,
                language: languageSelect.value as 'auto' | 'de' | 'en',
            };

            await saveSettings(newSettings);

            // Check if language changed - if so, re-initialize i18n and re-render
            if (newSettings.language !== settings.language) {
                const languageToUse =
                    (newSettings.language || 'auto') === 'auto'
                        ? detectBrowserLanguage()
                        : newSettings.language || 'de';
                await initI18n(languageToUse as Language);
                settings = newSettings; // Update settings before re-render
                render(); // Re-render entire page with new language
                return; // Early return to avoid showing success message (render() will show it)
            }

            // Update original snapshots after successful save
            originalGeneralSettings = {
                defaultHoursPerDay: newSettings.defaultHoursPerDay,
                defaultHoursPerWeek: newSettings.defaultHoursPerWeek,
                excelImportEnabled: newSettings.excelImportEnabled,
                workWeekDays: [...newSettings.workWeekDays!],
            };

            // Reset dirty state after successful save
            hasUnsavedGeneralChanges = false;
            updateSaveButtonState();

            // Show success message
            statusMessage.style.display = 'block';
            statusMessage.style.background = '#d4edda';
            statusMessage.style.border = '1px solid #c3e6cb';
            statusMessage.style.color = '#155724';
            statusMessage.textContent =
                '✓ ' + t('ct.extension.timetracker.admin.settingsSavedSuccess');

            // Emit notification to ChurchTools
            emit('notification:show', {
                message: t('ct.extension.timetracker.admin.settingsSavedSuccess'),
                type: 'success',
                duration: 3000,
            });

            setTimeout(() => {
                statusMessage.style.display = 'none';
            }, 3000);
        } catch (error) {
            console.error('[TimeTracker Admin] Save settings error:', error);

            // Show error message
            statusMessage.style.display = 'block';
            statusMessage.style.background = '#f8d7da';
            statusMessage.style.border = '1px solid #f5c6cb';
            statusMessage.style.color = '#721c24';
            statusMessage.textContent =
                '✗ Failed to save: ' + (error instanceof Error ? error.message : 'Unknown error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = saveIconHTML + 'Save General Settings';
        }
    }

    // Handle delete employee
    async function handleDeleteEmployee(userId: number) {
        try {
            // Remove from userHoursConfig
            if (settings.userHoursConfig) {
                settings.userHoursConfig = settings.userHoursConfig.filter(
                    (c) => c.userId !== userId
                );
            }

            // Remove from employeesList (UI)
            employeesList = employeesList.filter((emp) => emp.userId !== userId);

            // Save updated settings
            await saveSettings(settings);

            emit('notification', {
                message: 'Employee deleted successfully',
                type: 'success',
                duration: 3000,
            });

            render();
        } catch (error) {
            console.error('[TimeTracker Admin] Failed to delete employee:', error);
            emit('notification', {
                message: 'Failed to delete employee',
                type: 'error',
                duration: 3000,
            });
        }
    }

    // Handle save group settings
    async function handleSaveGroupSettings() {
        const employeeGroupIdInput = element.querySelector(
            '#employee-group-id'
        ) as HTMLInputElement;
        const volunteerGroupIdInput = element.querySelector(
            '#volunteer-group-id'
        ) as HTMLInputElement;
        const statusMessage = element.querySelector('#group-settings-status') as HTMLElement;
        const saveBtn = element.querySelector('#save-group-settings-btn') as HTMLButtonElement;

        if (!statusMessage || !saveBtn) return;

        const saveIconHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
        `;

        try {
            saveBtn.disabled = true;
            saveBtn.innerHTML = saveIconHTML + 'Saving...';

            // Get group IDs (allow empty)
            const employeeGroupId = employeeGroupIdInput?.value
                ? parseInt(employeeGroupIdInput.value)
                : undefined;
            const volunteerGroupId = volunteerGroupIdInput?.value
                ? parseInt(volunteerGroupIdInput.value)
                : undefined;

            // Collect global work week days
            const globalWorkWeekDays: number[] = [];
            const globalWorkWeekCheckboxes = element.querySelectorAll(
                '.global-work-week-checkbox'
            ) as NodeListOf<HTMLInputElement>;
            globalWorkWeekCheckboxes.forEach((checkbox) => {
                if (checkbox.checked) {
                    globalWorkWeekDays.push(parseInt(checkbox.getAttribute('data-day') || '0'));
                }
            });
            globalWorkWeekDays.sort((a, b) => a - b);

            // Collect individual employee hours from table
            const userHoursConfig: UserHoursConfig[] = [];
            const employeeHoursDayInputs = element.querySelectorAll(
                '.employee-hours-day'
            ) as NodeListOf<HTMLInputElement>;
            const employeeHoursWeekInputs = element.querySelectorAll(
                '.employee-hours-week'
            ) as NodeListOf<HTMLInputElement>;

            employeeHoursDayInputs.forEach((dayInput, index) => {
                const userId = parseInt(dayInput.dataset.userId || '0');
                const hoursPerDay = parseFloat(dayInput.value);
                const hoursPerWeek = parseFloat(employeeHoursWeekInputs[index]?.value || '0');

                if (userId > 0) {
                    // Get current userName from employeesList (not from old data-attribute)
                    const employee = employeesList.find((e) => e.userId === userId);
                    const userName = employee?.userName || `User ${userId}`;

                    // Collect work week days from checkboxes for this user
                    const workWeekDays: number[] = [];
                    const userCheckboxes = element.querySelectorAll(
                        `.user-work-week-checkbox[data-user-id="${userId}"]`
                    ) as NodeListOf<HTMLInputElement>;
                    userCheckboxes.forEach((checkbox) => {
                        if (checkbox.checked) {
                            const day = parseInt(checkbox.getAttribute('data-day') || '0');
                            workWeekDays.push(day);
                        }
                    });
                    // Sort to maintain Sun-Sat order
                    workWeekDays.sort((a, b) => a - b);

                    // Preserve isActive status from existing config
                    const existingConfig = settings.userHoursConfig?.find(
                        (c) => c.userId === userId
                    );
                    userHoursConfig.push({
                        userId,
                        userName,
                        hoursPerDay,
                        hoursPerWeek,
                        isActive: existingConfig?.isActive !== false, // Preserve existing isActive status
                        workWeekDays: workWeekDays.length > 0 ? workWeekDays : undefined, // Only set if user has custom work week
                    });
                }
            });

            // Create new settings object with group settings
            const newSettings: Settings = {
                ...settings,
                employeeGroupId,
                volunteerGroupId,
                userHoursConfig,
                workWeekDays: globalWorkWeekDays,
            };
            await saveSettings(newSettings);

            // Update original snapshots after successful save
            originalGroupSettings = {
                employeeGroupId: newSettings.employeeGroupId,
                volunteerGroupId: newSettings.volunteerGroupId,
                userHoursConfig: newSettings.userHoursConfig
                    ? JSON.parse(JSON.stringify(newSettings.userHoursConfig))
                    : undefined,
            };

            // Reset dirty state after successful save
            hasUnsavedGroupChanges = false;
            updateSaveButtonState();

            // Show success message
            statusMessage.style.display = 'block';
            statusMessage.style.background = '#d4edda';
            statusMessage.style.border = '1px solid #c3e6cb';
            statusMessage.style.color = '#155724';
            statusMessage.textContent = `✓ Group settings saved successfully! Configured ${userHoursConfig.length} employee${userHoursConfig.length === 1 ? '' : 's'}.`;

            // Emit notification to ChurchTools
            emit('notification:show', {
                message: `Group settings saved! Configured ${userHoursConfig.length} employee${userHoursConfig.length === 1 ? '' : 's'}.`,
                type: 'success',
                duration: 3000,
            });

            setTimeout(() => {
                statusMessage.style.display = 'none';
            }, 3000);
        } catch (error) {
            console.error('[TimeTracker Admin] Save group settings error:', error);

            // Show error message
            statusMessage.style.display = 'block';
            statusMessage.style.background = '#f8d7da';
            statusMessage.style.border = '1px solid #f5c6cb';
            statusMessage.style.color = '#721c24';
            statusMessage.textContent =
                '✗ Failed to save: ' + (error instanceof Error ? error.message : 'Unknown error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = saveIconHTML + 'Save Group Settings';
        }
    }

    // Generate a valid category ID from a name
    function generateCategoryId(name: string): string {
        // Convert to lowercase, remove special chars, replace spaces with nothing
        let id = name
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '') // Remove special characters
            .replace(/\s+/g, ''); // Remove spaces

        // Make sure it's unique
        let finalId = id;
        let counter = 1;
        while (workCategories.some((c) => c.id === finalId)) {
            finalId = `${id}${counter}`;
            counter++;
        }

        return finalId;
    }

    // Handle save category
    async function handleSaveCategory() {
        const nameInput = element.querySelector('#category-name') as HTMLInputElement;
        const colorInput = element.querySelector('#category-color') as HTMLInputElement;
        const statusMessage = element.querySelector('#category-form-status') as HTMLElement;
        const saveBtn = element.querySelector('#save-category-btn') as HTMLButtonElement;

        if (!nameInput || !colorInput || !statusMessage || !saveBtn) return;

        const saveIconHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
        `;

        // Validation
        if (!nameInput.value.trim()) {
            alert('Please enter a category name');
            return;
        }

        // Generate ID from name (only for new categories)
        const categoryId = editingCategory
            ? editingCategory.id
            : generateCategoryId(nameInput.value.trim());

        try {
            saveBtn.disabled = true;
            saveBtn.innerHTML = saveIconHTML + (editingCategory ? 'Updating...' : 'Saving...');

            const category: WorkCategory = {
                id: categoryId,
                name: nameInput.value.trim(),
                color: colorInput.value,
                kvStoreId: editingCategory?.kvStoreId, // Preserve kvStoreId for updates
            };

            await saveCategory(category);

            // Show success message
            statusMessage.style.display = 'block';
            statusMessage.style.background = '#d4edda';
            statusMessage.style.border = '1px solid #c3e6cb';
            statusMessage.style.color = '#155724';
            statusMessage.textContent = editingCategory
                ? '✓ Category updated successfully!'
                : '✓ Category created successfully!';

            // Emit notification
            emit('notification:show', {
                message: editingCategory
                    ? 'Category updated successfully!'
                    : 'Category created successfully!',
                type: 'success',
                duration: 3000,
            });

            setTimeout(() => {
                showAddCategory = false;
                editingCategory = null;
                render();
            }, 1500);
        } catch (error) {
            console.error('[TimeTracker Admin] Save category error:', error);

            // Show error message
            statusMessage.style.display = 'block';
            statusMessage.style.background = '#f8d7da';
            statusMessage.style.border = '1px solid #f5c6cb';
            statusMessage.style.color = '#721c24';
            statusMessage.textContent =
                '✗ Failed to save: ' + (error instanceof Error ? error.message : 'Unknown error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML =
                saveIconHTML + (editingCategory ? 'Update Category' : 'Save Category');
        }
    }

    // This function will attach all event handlers to the DOM elements
    function attachEventHandlers() {
        // Activity Log Event Handlers
        const activityLogEnabled = element.querySelector('#activity-log-enabled') as HTMLInputElement;
        const activityLogCreate = element.querySelector('#activity-log-create') as HTMLInputElement;
        const activityLogUpdate = element.querySelector('#activity-log-update') as HTMLInputElement;
        const activityLogDelete = element.querySelector('#activity-log-delete') as HTMLInputElement;
        const activityLogArchiveDays = element.querySelector('#activity-log-archive-days') as HTMLInputElement;
        const saveActivityLogSettingsBtn = element.querySelector('#save-activity-log-settings-btn') as HTMLButtonElement;
        const logFilterUserSelect = element.querySelector('#log-filter-user') as HTMLSelectElement;
        const logFilterActionSelect = element.querySelector('#log-filter-action') as HTMLSelectElement;
        const logFilterDateFromInput = element.querySelector('#log-filter-date-from') as HTMLInputElement;
        const logFilterDateToInput = element.querySelector('#log-filter-date-to') as HTMLInputElement;
        const logPrevPageBtn = element.querySelector('#log-prev-page') as HTMLButtonElement;
        const logNextPageBtn = element.querySelector('#log-next-page') as HTMLButtonElement;

        // Track activity log settings changes
        function checkActivityLogChanges() {
            const currentSettings = settings.activityLogSettings;
            const original = originalActivityLogSettings;

            hasUnsavedActivityLogChanges =
                currentSettings?.enabled !== original?.enabled ||
                currentSettings?.logCreate !== original?.logCreate ||
                currentSettings?.logUpdate !== original?.logUpdate ||
                currentSettings?.logDelete !== original?.logDelete ||
                currentSettings?.archiveAfterDays !== original?.archiveAfterDays;

            if (saveActivityLogSettingsBtn) {
                saveActivityLogSettingsBtn.style.background = hasUnsavedActivityLogChanges ? '#dc3545' : '#28a745';
            }
        }

        activityLogEnabled?.addEventListener('change', () => {
            if (!settings.activityLogSettings) settings.activityLogSettings = { enabled: true, logCreate: true, logUpdate: true, logDelete: true, archiveAfterDays: 90 };
            settings.activityLogSettings.enabled = activityLogEnabled.checked;

            // Enable/disable sub-checkboxes
            [activityLogCreate, activityLogUpdate, activityLogDelete, activityLogArchiveDays].forEach(el => {
                if (el) el.disabled = !activityLogEnabled.checked;
            });

            checkActivityLogChanges();
            render();
        });

        [activityLogCreate, activityLogUpdate, activityLogDelete].forEach(checkbox => {
            checkbox?.addEventListener('change', () => {
                if (!settings.activityLogSettings) return;
                if (checkbox === activityLogCreate) settings.activityLogSettings.logCreate = checkbox.checked;
                if (checkbox === activityLogUpdate) settings.activityLogSettings.logUpdate = checkbox.checked;
                if (checkbox === activityLogDelete) settings.activityLogSettings.logDelete = checkbox.checked;
                checkActivityLogChanges();
            });
        });

        activityLogArchiveDays?.addEventListener('input', () => {
            if (!settings.activityLogSettings) return;
            const value = parseInt(activityLogArchiveDays.value);
            settings.activityLogSettings.archiveAfterDays = value;
            const valueDisplay = element.querySelector('#archive-days-value');
            if (valueDisplay) {
                valueDisplay.textContent = `${value} ${t('ct.extension.timetracker.dashboard.day')}${value > 1 ? 's' : ''}`;
            }
            checkActivityLogChanges();
        });

        saveActivityLogSettingsBtn?.addEventListener('click', async () => {
            try {
                await saveSettings(settings, 'Activity log settings updated');
                originalActivityLogSettings = { ...settings.activityLogSettings };
                hasUnsavedActivityLogChanges = false;
                render();

                emit('notification:show', {
                    message: '✓ Activity log settings saved!',
                    type: 'success',
                    duration: 3000,
                });
            } catch (error) {
                console.error('[Admin] Failed to save activity log settings:', error);
                emit('notification:show', {
                    message: 'Failed to save activity log settings',
                    type: 'error',
                    duration: 5000,
                });
            }
        });

        // Filter event handlers
        logFilterUserSelect?.addEventListener('change', () => {
            logFilterUser = logFilterUserSelect.value;
            applyLogFilters();
            render();
        });

        logFilterActionSelect?.addEventListener('change', () => {
            logFilterAction = logFilterActionSelect.value;
            applyLogFilters();
            render();
        });

        logFilterDateFromInput?.addEventListener('change', () => {
            logFilterDateFrom = logFilterDateFromInput.value;
            applyLogFilters();
            render();
        });

        logFilterDateToInput?.addEventListener('change', () => {
            logFilterDateTo = logFilterDateToInput.value;
            applyLogFilters();
            render();
        });

        // Pagination event handlers
        logPrevPageBtn?.addEventListener('click', () => {
            if (logPage > 1) {
                logPage--;
                render();
            }
        });

        logNextPageBtn?.addEventListener('click', () => {
            const totalPages = Math.ceil(filteredLogs.length / LOGS_PER_PAGE);
            if (logPage < totalPages) {
                logPage++;
                render();
            }
        });
    }

    // Initialize on load
    initialize();

    // Cleanup function
    return () => {
        // No cleanup needed
    };
};

// Named export for simple mode
export { adminEntryPoint };

// Default export for advanced mode
export default adminEntryPoint;
