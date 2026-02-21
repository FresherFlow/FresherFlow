import { test, expect } from '@playwright/test';

const adminStorageState = process.env.ADMIN_STORAGE_STATE;

test.describe('admin create listing from json', () => {
  test.skip(!adminStorageState, 'Set ADMIN_STORAGE_STATE to run admin create-from-json e2e.');
  test.use({ storageState: adminStorageState });

  test('paste json -> autofill -> publish -> listing appears in admin and opens edit page', async ({ page }) => {
    const now = Date.now();
    const title = `E2E Software Engineer ${now}`;
    const company = `E2E Corp ${now}`;

    const payload = {
      type: 'JOB',
      title,
      company,
      companyWebsite: 'https://example.com',
      description: 'E2E generated listing for admin JSON autofill flow.',
      allowedDegrees: ["Bachelor's Degree"],
      allowedCourses: ['Computer Science', 'Information Technology'],
      allowedPassoutYears: [2024, 2025],
      requiredSkills: ['JavaScript', 'React'],
      locations: ['Bangalore'],
      workMode: 'Hybrid',
      experienceMin: 0,
      experienceMax: 1,
      salaryRange: '6-8 LPA',
      salaryPeriod: 'YEARLY',
      employmentType: 'Full Time',
      jobFunction: 'Engineering',
      applyLink: 'https://example.com/careers/e2e',
    };

    await page.goto('/admin/opportunities/create');
    await expect(page.getByRole('heading', { name: /new listing/i })).toBeVisible();

    await page.getByRole('button', { name: /auto-fill text/i }).click();
    await page
      .locator('textarea[placeholder*="WALKIN"][placeholder*="title"]')
      .fill(JSON.stringify(payload, null, 2));
    await page.getByRole('button', { name: /apply json/i }).click();

    await expect(page.locator(`input[value="${title}"]`)).toBeVisible();
    await expect(page.locator(`input[value="${company}"]`)).toBeVisible();

    await page.getByRole('button', { name: /publish listing/i }).click();
    await expect(page).toHaveURL(/\/admin\/opportunities/);
    await expect(page.getByText(title, { exact: false })).toBeVisible({ timeout: 15000 });

    const listingContainer = page.locator('tr, article, div', { hasText: title }).first();
    const editHref = await listingContainer
      .locator('a[href*="/admin/opportunities/edit/"]')
      .first()
      .getAttribute('href');
    expect(editHref).toBeTruthy();
    await page.goto(editHref!);
    await expect(page.getByRole('heading', { name: /edit listing/i })).toBeVisible({ timeout: 15000 });
    await expect(page.locator(`input[value="${title}"]`)).toBeVisible();
    await expect(page.locator(`input[value="${company}"]`)).toBeVisible();
  });
});
