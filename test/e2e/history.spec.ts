import { test, expect } from '@playwright/test';

test.describe('Navigation History', () => {
    test.beforeEach(async ({ page }) => {
        // Mock essential APIs
        await page.route('**/whoami', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ id: 1, firstName: 'Test', lastName: 'User', admin: true })
            });
        });

        await page.route('**/custommodules', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([{ id: 1, shorty: 'timetracker', name: 'Time Tracker' }])
            });
        });

        await page.route(/\/custommodules\/\d+\/customdatacategories(\?.*)?$/, async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    { id: 1, shorty: 'workcategories' },
                    { id: 2, shorty: 'timeentries' },
                    { id: 3, shorty: 'settings' },
                    { id: 4, shorty: 'absences' }
                ])
            });
        });

        await page.route(/\/custommodules\/\d+\/customdatacategories\/\d+\/customdatavalues(\?.*)?$/, async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([])
            });
        });

        await page.goto('/extensions/timetracker/');
    });

    test('should navigate back correctly through tabs', async ({ page }) => {
        // 1. Start at Dashboard (default)
        const dashboardTab = page.locator('nav[aria-label="Tabs"] button').filter({ hasText: /Dashboard/i });
        await expect(dashboardTab).toBeVisible();
        await expect(dashboardTab).toHaveClass(/text-blue-600/);

        // 2. Go to Entries
        await page.getByRole('button', { name: /Entries/i }).click();
        const entriesTab = page.locator('nav[aria-label="Tabs"] button').filter({ hasText: /Entries/i });
        await expect(entriesTab).toHaveClass(/text-blue-600/);

        // 3. Go to Reports
        await page.getByRole('button', { name: /Reports/i }).click();
        const reportsTab = page.locator('nav[aria-label="Tabs"] button').filter({ hasText: /Reports/i });
        await expect(reportsTab).toHaveClass(/text-blue-600/);

        // 4. Go Back to Entries
        await page.goBack();
        await expect(entriesTab).toHaveClass(/text-blue-600/);

        // 5. Go Back to Dashboard
        await page.goBack();
        await expect(dashboardTab).toHaveClass(/text-blue-600/);
    });
});
