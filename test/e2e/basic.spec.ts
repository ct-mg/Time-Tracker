import { test, expect } from '@playwright/test';

test.describe('Time Tracker Basic Flow', () => {
    test('should load the dashboard and show tabs', async ({ page }) => {
        // Navigate to the app base URL
        await page.goto('/extensions/timetracker/');

        // Check if the dashboard title is visible
        // We search for a button that contains "Dashboard"
        const dashboardTab = page.locator('button', { hasText: 'Dashboard' });
        await expect(dashboardTab).toBeVisible();

        // Check for Reports/Berichte tab
        const reportsTab = page.locator('button', { hasText: /Reports|Berichte/ });
        await expect(reportsTab).toBeVisible();
    });

    test('should show dashboard content', async ({ page }) => {
        await page.goto('/extensions/timetracker/');

        // Check if "Today" / "Heute" card is visible
        await expect(page.locator('h3', { hasText: /Today|Heute/ })).toBeVisible();
    });
});

test.describe('Mobile Responsiveness', () => {
    test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

    test('should show mobile-friendly layout', async ({ page }) => {
        await page.goto('/extensions/timetracker/');

        // Tabs should be visible
        const dashboardTab = page.locator('button', { hasText: 'Dashboard' });
        await expect(dashboardTab).toBeVisible();
    });
});
