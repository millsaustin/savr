import { test, expect } from '@playwright/test';

test.describe('Chat off-topic handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/chat/relay', async (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          intent: 'OFF_TOPIC',
          error: {
            code: 'OFF_TOPIC',
            message:
              'I stay focused on cooking, groceries, nutrition, and your pantry.',
            examples: [
              'Help me plan dinners for the week with a $75 grocery budget.',
              'Use my pantry items to suggest a quick lunch.',
            ],
          },
        }),
      });
    });
  });

  test('shows off-topic helper card and prefills example', async ({ page }) => {
    await page.goto('/assistant');

    const textarea = page.locator('textarea#chat-input');
    await textarea.fill('Tell me about cars');

    await page.getByRole('button', { name: 'Send' }).click();

    await expect(
      page.getByText(
        'I stay focused on cooking, groceries, nutrition, and your pantry.',
      ),
    ).toBeVisible();

    const tryButton = page.getByRole('button', { name: 'Try this instead' });
    await tryButton.click();

    await expect(textarea).toHaveValue(
      'Plan five high-protein dinners under $200 using my pantry.',
    );
  });
});
