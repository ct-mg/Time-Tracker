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
}

interface Settings {
    defaultHoursPerDay: number;
    defaultHoursPerWeek: number;
}

const adminEntryPoint: EntryPoint<AdminData> = ({ data, emit, element, KEY }) => {
    console.log('[TimeTracker Admin] Initializing');
    console.log('[TimeTracker Admin] Extension info:', data.extensionInfo);

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
            console.log('[TimeTracker Admin] Extension module:', extensionModule);

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

        console.log(`[TimeTracker Admin] Creating category: ${shorty}`);

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

    // Load work categories
    async function loadWorkCategories(): Promise<void> {
        try {
            const values = await getCustomDataValues<WorkCategory>(
                workCategoriesCategory!.id,
                moduleId!
            );

            if (values.length > 0) {
                workCategories = values;
            } else {
                // Create default categories
                workCategories = [
                    { id: 'office', name: 'Office Work', color: '#007bff' },
                    { id: 'pastoral', name: 'Pastoral Care', color: '#28a745' },
                    { id: 'event', name: 'Event Preparation', color: '#ffc107' },
                    { id: 'administration', name: 'Administration', color: '#6c757d' },
                ];

                // Save default categories
                for (const category of workCategories) {
                    await createCustomDataValue(
                        {
                            dataCategoryId: workCategoriesCategory!.id,
                            value: JSON.stringify(category),
                        },
                        moduleId!
                    );
                }
            }
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
            const values = await getCustomDataValues<WorkCategory>(
                workCategoriesCategory!.id,
                moduleId!
            );

            const valueData = JSON.stringify(category);
            const existing = values.find((v) => v.id === category.id);

            if (existing) {
                // Update existing
                await updateCustomDataValue(
                    workCategoriesCategory!.id,
                    (existing as any).id,
                    { value: valueData },
                    moduleId!
                );

                // Update in local array
                const index = workCategories.findIndex((c) => c.id === category.id);
                if (index !== -1) {
                    workCategories[index] = category;
                }
            } else {
                // Create new
                await createCustomDataValue(
                    {
                        dataCategoryId: workCategoriesCategory!.id,
                        value: valueData,
                    },
                    moduleId!
                );

                workCategories.push(category);
            }
        } catch (error) {
            console.error('[TimeTracker Admin] Failed to save category:', error);
            throw error;
        }
    }

    // Delete category
    async function deleteCategory(categoryId: string): Promise<void> {
        try {
            const values = await getCustomDataValues<WorkCategory>(
                workCategoriesCategory!.id,
                moduleId!
            );

            const existing = values.find((v) => v.id === categoryId);

            if (existing) {
                await deleteCustomDataValue(
                    workCategoriesCategory!.id,
                    (existing as any).id,
                    moduleId!
                );

                // Remove from local array
                workCategories = workCategories.filter((c) => c.id !== categoryId);
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
                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 600;">
                                    Category ID
                                </label>
                                <input
                                    type="text"
                                    id="category-id"
                                    value="${editingCategory?.id || ''}"
                                    placeholder="e.g., pastoralcare"
                                    ${editingCategory ? 'disabled' : ''}
                                    style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; ${editingCategory ? 'background: #e9ecef; cursor: not-allowed;' : ''}"
                                />
                                <small style="color: #666; font-size: 0.85rem;">Unique identifier (lowercase, no hyphens)</small>
                            </div>

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
                                <small style="color: #666; font-size: 0.85rem;">Display name for the category</small>
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

        // Edit category buttons
        const editCategoryBtns = element.querySelectorAll('.edit-category-btn');
        editCategoryBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
                const categoryId = (btn as HTMLElement).dataset.categoryId;
                const category = workCategories.find((c) => c.id === categoryId);
                if (category) {
                    editingCategory = category;
                    showAddCategory = false;
                    render();
                }
            });
        });

        // Delete category buttons
        const deleteCategoryBtns = element.querySelectorAll('.delete-category-btn');
        deleteCategoryBtns.forEach((btn) => {
            btn.addEventListener('click', async () => {
                const categoryId = (btn as HTMLElement).dataset.categoryId;
                const category = workCategories.find((c) => c.id === categoryId);

                if (
                    category &&
                    confirm(
                        `Are you sure you want to delete the category "${category.name}"?\n\nNote: Existing time entries with this category will not be deleted.`
                    )
                ) {
                    try {
                        await deleteCategory(categoryId!);
                        emit('notification:show', {
                            message: 'Category deleted successfully!',
                            type: 'success',
                            duration: 3000,
                        });
                        render();
                    } catch (error) {
                        alert('Failed to delete category. Please try again.');
                    }
                }
            });
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

    // Handle save category
    async function handleSaveCategory() {
        const idInput = element.querySelector('#category-id') as HTMLInputElement;
        const nameInput = element.querySelector('#category-name') as HTMLInputElement;
        const colorInput = element.querySelector('#category-color') as HTMLInputElement;
        const statusMessage = element.querySelector('#category-form-status') as HTMLElement;
        const saveBtn = element.querySelector('#save-category-btn') as HTMLButtonElement;

        if (!idInput || !nameInput || !colorInput || !statusMessage || !saveBtn) return;

        // Validation
        if (!idInput.value.trim()) {
            alert('Please enter a category ID');
            return;
        }

        if (!/^[a-z0-9]+$/.test(idInput.value)) {
            alert('Category ID must contain only lowercase letters and numbers (no hyphens)');
            return;
        }

        if (!nameInput.value.trim()) {
            alert('Please enter a category name');
            return;
        }

        // Check for duplicate ID (only when creating new)
        if (!editingCategory && workCategories.some((c) => c.id === idInput.value)) {
            alert('A category with this ID already exists');
            return;
        }

        try {
            saveBtn.disabled = true;
            saveBtn.textContent = editingCategory ? '💾 Updating...' : '💾 Saving...';

            const category: WorkCategory = {
                id: editingCategory ? editingCategory.id : idInput.value.trim(),
                name: nameInput.value.trim(),
                color: colorInput.value,
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
        console.log('[TimeTracker Admin] Cleaning up');
    };
};

// Named export for simple mode
export { adminEntryPoint };

// Default export for advanced mode
export default adminEntryPoint;
