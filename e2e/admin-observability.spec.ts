import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@example.com';

test.describe('Admin Observability', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await page.setExtraHTTPHeaders({
      'x-test-admin-email': ADMIN_EMAIL,
    });

    if (baseURL) {
      const { hostname } = new URL(baseURL);
      await page.context().addCookies([
        {
          name: 'sb-access-token',
          value: 'pw-admin-token',
          domain: hostname,
          path: '/',
        },
      ]);
    }

    await page.route('**/api/admin/guardrails', async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON() as {
          similarityThreshold?: number;
          blockAfterThree?: boolean;
        };
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            current: {
              guardSimilarityThreshold: body.similarityThreshold ?? 0.4,
              guardBlockAfterThree: body.blockAfterThree ?? true,
            },
            note: 'test',
          }),
        });
        return;
      }
      route.fallback();
    });
  });

  test('renders dashboard and updates guardrail settings', async ({ page }) => {
    await page.goto('/admin/observability');

    await expect(page.getByText('Guardrail Observability')).toBeVisible();
    await expect(page.getByText('Off-topic Rate')).toBeVisible();

    const numberInput = page.locator('input[type="number"]').first();
    await numberInput.fill('0.5');

    await page.getByRole('button', { name: 'Save' }).click();

    await expect(
      page.getByText('Guardrail configuration updated.'),
    ).toBeVisible();
    await expect(numberInput).toHaveValue('0.5');
  });
});
