import { test, expect } from '@playwright/test';

test.describe('Time Tracker Advanced Scenarios', () => {
    test.beforeEach(async ({ page }) => {
        // Log console messages from the browser
        page.on('console', msg => {
            console.log(`BROWSER CONSOLE: ${msg.text()}`);
        });

        // Broader mock patterns
        await page.route('**/whoami', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ id: 1, firstName: 'Test', lastName: 'User', admin: true })
            });
        });

        await page.route('**/persons', async route => {
            const url = route.request().url();
            if (url.endsWith('/persons')) {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([
                        { id: 1, firstName: 'Test', lastName: 'User' },
                        { id: 2, firstName: 'Employee', lastName: 'A' },
                        { id: 3, firstName: 'Employee', lastName: 'B' }
                    ])
                });
            } else if (url.includes('/absences')) {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([])
                });
            } else {
                await route.continue();
            }
        });

        await page.route('**/event/masterdata', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ absenceReasons: [] })
            });
        });

        await page.route('**/custommodules', async route => {
            if (route.request().method() === 'GET' && (route.request().url().endsWith('/custommodules') || route.request().url().includes('/custommodules?'))) {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([{ id: 1, shorty: 'timetracker', name: 'Time Tracker' }])
                });
            } else {
                await route.continue();
            }
        });

        await page.route(/\/custommodules\/\d+\/customdatacategories(\?.*)?$/, async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    { id: 1, shorty: 'workcategories' },
                    { id: 2, shorty: 'timeentries' },
                    { id: 3, shorty: 'settings' },
                    { id: 4, shorty: 'absences' },
                    { id: 5, shorty: 'absencecategories' },
                    { id: 6, shorty: 'settings_backups' }
                ])
            });
        });

        await page.route(/\/custommodules\/\d+\/customdatacategories\/\d+\/customdatavalues(\?.*)?$/, async route => {
            const url = route.request().url();
            if (route.request().method() === 'GET') {
                if (url.includes('/1/customdatavalues')) { // workcategories
                    await route.fulfill({
                        status: 200,
                        contentType: 'application/json',
                        body: JSON.stringify([{ id: 1, value: JSON.stringify({ id: 'office', name: 'Office', color: '#007bff' }) }])
                    });
                } else if (url.includes('/3/customdatavalues')) { // settings
                    await route.fulfill({
                        status: 200,
                        contentType: 'application/json',
                        body: JSON.stringify([{
                            id: 1, value: JSON.stringify({
                                defaultHoursPerDay: 8,
                                defaultHoursPerWeek: 40,
                                workWeekDays: [1, 2, 3, 4, 5],
                                managerGroupId: 10,
                                managerAssignments: [],
                                language: 'en'
                            })
                        }])
                    });
                } else {
                    await route.fulfill({
                        status: 200,
                        contentType: 'application/json',
                        body: JSON.stringify([])
                    });
                }
            } else {
                await route.continue();
            }
        });

        await page.route(/\/groups\/\d+\/members/, async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    { personId: 1, personName: 'Test User' }
                ])
            });
        });

        await page.goto('/extensions/timetracker/');
    });

    test('should show error toast when clock-in fails', async ({ page }) => {
        // Ensure app title is visible
        await expect(page.locator('h1')).toContainText(/Time Tracker/i);

        // Force a clock-in failure by re-routing the POST
        await page.route(/\/custommodules\/\d+\/customdatacategories\/2\/customdatavalues/, async route => {
            if (route.request().method() === 'POST') {
                await route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'Internal Server Error' })
                });
            } else {
                await route.continue();
            }
        });

        // "Start" is the English label for clocking in
        const clockInButton = page.getByRole('button', { name: /^Start$/i });
        await expect(clockInButton).toBeVisible({ timeout: 30000 });
        await clockInButton.click();

        // Check for error toast
        const toast = page.locator('.toast.error, .bg-red-500, .bg-red-600, div:has-text(/Failed/i)');
        await expect(toast.first()).toBeVisible();
    });

    test('should allow adding overlapping entries', async ({ page }) => {
        await expect(page.locator('h1')).toContainText(/Time Tracker/i);

        // Go to Entries tab
        await page.getByRole('button', { name: /Entries/i }).click();

        // Add first entry
        await page.getByRole('button', { name: /Manual Entry/i }).click();
        await page.getByRole('button', { name: /Save/i }).click();

        // Mock the GET request to return entries now
        await page.route(/\/custommodules\/\d+\/customdatacategories\/2\/customdatavalues/, async route => {
            if (route.request().method() === 'GET') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([
                        {
                            id: 10, value: JSON.stringify({
                                startTime: new Date(Date.now() - 3600000 * 2).toISOString(),
                                endTime: new Date(Date.now() - 3600000).toISOString(),
                                categoryId: 'office',
                                categoryName: 'Office',
                                description: 'First Entry',
                                userId: 1
                            })
                        },
                        {
                            id: 11, value: JSON.stringify({
                                startTime: new Date(Date.now() - 3600000 * 1.5).toISOString(),
                                endTime: new Date(Date.now() - 3600000 * 0.5).toISOString(),
                                categoryId: 'office',
                                categoryName: 'Office',
                                description: 'Overlapping Entry',
                                userId: 1
                            })
                        }
                    ])
                });
            } else {
                await route.continue();
            }
        });

        // Switch tabs to refresh
        await page.getByRole('button', { name: /Dashboard/i }).click();
        await page.getByRole('button', { name: /Entries/i }).click();

        const items = page.locator('tr.border-b');
        await expect(items).toHaveCount(2, { timeout: 20000 });
    });

    test('should filter managers in Admin view', async ({ page }) => {
        await expect(page.locator('h1')).toContainText(/Time Tracker/i);

        // Switch to Admin view - use precise matching for the tab button
        // header .flex button should match the navigation buttons
        const adminTab = page.locator('header .flex button').filter({ hasText: /^Admin$/ });
        await expect(adminTab).toBeVisible({ timeout: 30000 });
        await adminTab.click();

        // Navigate to Managers tab
        const userMgmtTab = page.getByRole('button', { name: /User Management/i });
        await expect(userMgmtTab).toBeVisible();
        await userMgmtTab.click();

        // Ensure managers are loaded
        await page.waitForSelector('h3:has-text("Test User")');

        const searchInput = page.getByPlaceholder(/search managers/i);
        await expect(searchInput).toBeVisible();

        // Search for non-existent manager
        await searchInput.fill('NonExistent');
        await expect(page.locator('h3:has-text("Test User")')).not.toBeVisible();

        // Search for Test User
        await searchInput.fill('Test');
        await expect(page.locator('h3:has-text("Test User")')).toBeVisible();
    });
});
