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

interface Settings {
    defaultHoursPerDay: number;
    defaultHoursPerWeek: number;
}

const adminEntryPoint: EntryPoint<AdminData> = ({ data, emit, element, KEY }) => {
    let moduleId: number | null = null;
    let workCategoriesCategory: CustomModuleDataCategory | null = null;
    let settingsCategory: CustomModuleDataCategory | null = null;
    let workCategories: WorkCategory[] = [];
    let settings: Settings = { defaultHoursPerDay: 8, defaultHoursPerWeek: 40 };

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

            // Get or create categories
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

            // One-time cleanup: Remove old default categories
            await removeOldDefaultCategories();

            // Load data
            await Promise.all([loadWorkCategories(), loadSettings()]);

            isLoading = false;
            errorMessage = '';
            render();
        } catch (error) {
            console.error('[TimeTracker Admin] Initialization error:', error);
            isLoading = false;
            errorMessage = error instanceof Error ? error.message : 'Failed to initialize';
            render();
        }
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

            const categoriesToRemove = ['Office Work', 'Pastoral Care', 'Event Preparation', 'Administration'];
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
                            console.log(`[TimeTracker Admin] Removed old default category: ${value.name} (ID: ${kvStoreId})`);
                            removedCount++;
                        } catch (deleteError) {
                            console.error(`[TimeTracker Admin] Failed to delete ${value.name}:`, deleteError);
                        }
                    }
                }
            }

            if (removedCount > 0) {
                console.log(`[TimeTracker Admin] Cleanup complete. Removed ${removedCount} old default categories.`);
            }
        } catch (error) {
            console.error('[TimeTracker Admin] Failed to remove old categories:', error);
        }
    }

    // Load work categories
    async function loadWorkCategories(): Promise<void> {
        try {
            // Call API directly to get raw values (we need the unparsed "value" field)
            const rawValues: Array<{ id: number; dataCategoryId: number; value: string }> =
                await (churchtoolsClient as any).get(
                    `/custommodules/${moduleId}/customdatacategories/${workCategoriesCategory!.id}/customdatavalues`
                );

            // Parse each value and preserve both string ID and numeric kvStoreId
            workCategories = rawValues.map(rawVal => {
                const kvStoreId = rawVal.id; // Numeric KV-Store ID
                const parsedCategory = JSON.parse(rawVal.value) as WorkCategory;

                return {
                    id: parsedCategory.id, // String ID from stored data
                    name: parsedCategory.name,
                    color: parsedCategory.color,
                    kvStoreId: kvStoreId // Numeric KV-Store ID for updates/deletes
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
            const values = await getCustomDataValues<Settings>(
                settingsCategory!.id,
                moduleId!
            );

            if (values.length > 0) {
                settings = values[0];
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
        } catch (error) {
            console.error('[TimeTracker Admin] Failed to load settings:', error);
        }
    }

    // Save settings
    async function saveSettings(newSettings: Settings): Promise<void> {
        try {
            const values = await getCustomDataValues<Settings>(
                settingsCategory!.id,
                moduleId!
            );

            const valueData = JSON.stringify(newSettings);

            if (values.length > 0) {
                // Update existing
                await updateCustomDataValue(
                    settingsCategory!.id,
                    (values[0] as any).id,
                    { value: valueData },
                    moduleId!
                );
            } else {
                // Create new
                await createCustomDataValue(
                    {
                        dataCategoryId: settingsCategory!.id,
                        value: valueData,
                    },
                    moduleId!
                );
            }

            settings = newSettings;
        } catch (error) {
            console.error('[TimeTracker Admin] Failed to save settings:', error);
            throw error;
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

            return timeEntries.filter(entry => entry.categoryId === categoryId).length;
        } catch (error) {
            console.error('[TimeTracker Admin] Failed to count entries:', error);
            return 0;
        }
    }

    // Reassign all time entries from one category to another
    async function reassignTimeEntries(fromCategoryId: string, toCategoryId: string): Promise<void> {
        try {
            const timeEntriesCategory = await getCustomDataCategory<object>('timeentries');
            if (!timeEntriesCategory) return;

            // Get raw values to access kvStoreId
            const rawValues: Array<{ id: number; dataCategoryId: number; value: string }> =
                await (churchtoolsClient as any).get(
                    `/custommodules/${moduleId}/customdatacategories/${timeEntriesCategory.id}/customdatavalues`
                );

            const toCategory = workCategories.find(c => c.id === toCategoryId);
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

            console.log(`[TimeTracker Admin] Reassigned ${updatedCount} entries from ${fromCategoryId} to ${toCategoryId}`);
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
                replacementCategoryId = workCategories.find(c => c.id !== categoryId)?.id || '';
                render();
            } else {
                // No entries using this category, delete immediately
                await deleteCategory(categoryId);
                emit('notification', {
                    message: 'Category deleted successfully!',
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
                message: 'Category deleted and entries reassigned successfully!',
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
    function render() {
        element.innerHTML = `
            <div style="max-width: 900px; margin: 2rem auto; padding: 2rem;">
                <!-- Extension Info Header -->
                <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h1 style="margin: 0 0 0.5rem 0; font-size: 1.8rem; color: #333;">⚙️ ${data.extensionInfo?.name || 'Time Tracker Settings'}</h1>
                    <p style="margin: 0 0 0.5rem 0; color: #666;">
                        ${data.extensionInfo?.description || 'Configure time tracking settings'}
                    </p>
                    <div style="display: flex; gap: 1rem; margin-top: 1rem; font-size: 0.85rem; color: #999;">
                        <span><strong>Version:</strong> ${data.extensionInfo?.version || 'N/A'}</span>
                        <span><strong>Key:</strong> ${data.extensionInfo?.key || KEY || 'N/A'}</span>
                        ${data.extensionInfo?.author?.name ? `<span><strong>Author:</strong> ${data.extensionInfo.author.name}</span>` : ''}
                    </div>
                </div>

                ${
                    isLoading
                        ? `
                    <div style="padding: 3rem; text-align: center; color: #666;">
                        <div style="font-size: 2rem; margin-bottom: 1rem;">⏳</div>
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
                    ${renderWorkCategories()}
                `
                }
            </div>
        `;

        if (!isLoading && !errorMessage) {
            attachEventHandlers();
        }
    }

    function renderGeneralSettings(): string {
        return `
            <!-- General Settings -->
            <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="margin: 0 0 1rem 0; font-size: 1.3rem; color: #333;">General Settings</h2>
                <p style="margin: 0 0 1.5rem 0; color: #666; font-size: 0.95rem;">
                    Configure default work hours for overtime calculation
                </p>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 600;">
                            Default Hours per Day
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
                        <small style="color: #666; font-size: 0.85rem;">Standard working hours per day</small>
                    </div>

                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 600;">
                            Default Hours per Week
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
                        <small style="color: #666; font-size: 0.85rem;">Standard working hours per week</small>
                    </div>
                </div>

                <button
                    id="save-settings-btn"
                    style="width: 100%; padding: 0.75rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; font-weight: 600; transition: background 0.2s;"
                    onmouseover="this.style.background='#0056b3'"
                    onmouseout="this.style.background='#007bff'"
                >
                    💾 Save General Settings
                </button>

                <div id="settings-status" style="margin-top: 1rem; padding: 0.75rem; border-radius: 4px; display: none;"></div>
            </div>
        `;
    }

    function renderWorkCategories(): string {
        return `
            <!-- Work Categories -->
            <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <div>
                        <h2 style="margin: 0 0 0.25rem 0; font-size: 1.3rem; color: #333;">Work Categories</h2>
                        <p style="margin: 0; color: #666; font-size: 0.95rem;">
                            Manage categories for tracking different types of work
                        </p>
                    </div>
                    <button
                        id="add-category-btn"
                        style="padding: 0.5rem 1rem; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; white-space: nowrap;"
                    >
                        ➕ Add Category
                    </button>
                </div>

                ${
                    showAddCategory || editingCategory
                        ? `
                    <!-- Category Form -->
                    <div style="background: #f8f9fa; border: 2px solid ${editingCategory ? '#ffc107' : '#28a745'}; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
                        <h3 style="margin: 0 0 1rem 0; color: #333;">
                            ${editingCategory ? '✏️ Edit Category' : '➕ New Category'}
                        </h3>

                        <div style="display: grid; gap: 1rem; margin-bottom: 1rem;">
                            ${editingCategory ? `
                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 600;">
                                    Category ID
                                </label>
                                <input
                                    type="text"
                                    id="category-id"
                                    value="${editingCategory.id}"
                                    disabled
                                    style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; background: #e9ecef; cursor: not-allowed; font-family: monospace;"
                                />
                                <small style="color: #666; font-size: 0.85rem;">ID cannot be changed</small>
                            </div>
                            ` : ''}

                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 600;">
                                    Category Name
                                </label>
                                <input
                                    type="text"
                                    id="category-name"
                                    value="${editingCategory?.name || ''}"
                                    placeholder="e.g., Pastoral Care"
                                    style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px;"
                                />
                                <small style="color: #666; font-size: 0.85rem;">Display name for the category ${!editingCategory ? '(ID will be auto-generated)' : ''}</small>
                            </div>

                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 600;">
                                    Color
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
                                style="padding: 0.75rem 1.5rem; background: ${editingCategory ? '#ffc107' : '#28a745'}; color: ${editingCategory ? '#333' : 'white'}; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;"
                            >
                                ${editingCategory ? '💾 Update Category' : '💾 Save Category'}
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

                ${
                    showDeleteDialog && categoryToDelete
                        ? `
                    <!-- Delete Confirmation Dialog -->
                    <div style="background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
                        <h3 style="margin: 0 0 1rem 0; color: #856404;">
                            ⚠️ Kategorie wird verwendet
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
                                    .filter(c => c.id !== categoryToDelete!.id)
                                    .map(c => `<option value="${c.id}" ${c.id === replacementCategoryId ? 'selected' : ''}>${c.name}</option>`)
                                    .join('')}
                            </select>
                        </div>

                        <div style="display: flex; gap: 0.5rem;">
                            <button
                                id="confirm-delete-btn"
                                style="padding: 0.75rem 1.5rem; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;"
                            >
                                🗑️ Kategorie löschen und Einträge neu zuweisen
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
                ${
                    workCategories.length === 0
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
                                        style="padding: 0.5rem 1rem; background: #ffc107; color: #333; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;"
                                    >
                                        ✏️ Edit
                                    </button>
                                    <button
                                        data-category-id="${category.id}"
                                        class="delete-category-btn"
                                        style="padding: 0.5rem 1rem; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;"
                                    >
                                        🗑️ Delete
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

        const replacementCategorySelect = element.querySelector('#replacement-category-select') as HTMLSelectElement;
        if (replacementCategorySelect) {
            replacementCategorySelect.addEventListener('change', (e) => {
                replacementCategoryId = (e.target as HTMLSelectElement).value;
            });
        }
    }

    // Handle save general settings
    async function handleSaveSettings() {
        const hoursPerDayInput = element.querySelector('#hours-per-day') as HTMLInputElement;
        const hoursPerWeekInput = element.querySelector('#hours-per-week') as HTMLInputElement;
        const statusMessage = element.querySelector('#settings-status') as HTMLElement;
        const saveBtn = element.querySelector('#save-settings-btn') as HTMLButtonElement;

        if (!hoursPerDayInput || !hoursPerWeekInput || !statusMessage || !saveBtn) return;

        try {
            saveBtn.disabled = true;
            saveBtn.textContent = '💾 Saving...';

            const newSettings: Settings = {
                defaultHoursPerDay: parseFloat(hoursPerDayInput.value),
                defaultHoursPerWeek: parseFloat(hoursPerWeekInput.value),
            };

            await saveSettings(newSettings);

            // Show success message
            statusMessage.style.display = 'block';
            statusMessage.style.background = '#d4edda';
            statusMessage.style.border = '1px solid #c3e6cb';
            statusMessage.style.color = '#155724';
            statusMessage.textContent = '✓ Settings saved successfully!';

            // Emit notification to ChurchTools
            emit('notification:show', {
                message: 'Settings saved successfully!',
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
            saveBtn.textContent = '💾 Save General Settings';
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
            saveBtn.textContent = editingCategory ? '💾 Updating...' : '💾 Saving...';

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
            saveBtn.textContent = editingCategory ? '💾 Update Category' : '💾 Save Category';
        }
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
