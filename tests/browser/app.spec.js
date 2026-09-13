import { test, expect } from '@playwright/test';

test('comparison edits, persists, exports and prepares an AI discussion', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('./');
  await expect(page.locator('#ranking h2')).toHaveText('Established company');
  await page.getByLabel('Decision', { exact: true }).fill('My next role');
  for (let i = 1; i <= 4; i++) await page.getByLabel(`Criterion ${i} weight`, { exact: true }).fill(i === 4 ? '100' : '0');
  await expect(page.locator('#ranking h2')).toHaveText('Freelance');
  await page.reload();
  await expect(page.getByLabel('Decision', { exact: true })).toHaveValue('My next role');
  await expect(page.locator('#ranking h2')).toHaveText('Freelance');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download report' }).click();
  expect((await download).suggestedFilename()).toBe('decision-report.md');
  await page.getByRole('button', { name: 'Discuss with Gemini' }).click();
  await expect(page.getByRole('textbox', { name: 'Type your message' })).toHaveValue(/My next role/);
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Type your message' })).toHaveValue(/My next role/);
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('streamed chat, safe rendering, persistence and delete undo', async ({ page, isMobile }) => {
  await page.addInitScript(() => localStorage.setItem('gemini_api_key', 'test-key'));
  await page.route('https://generativelanguage.googleapis.com/**', async route => {
    expect(route.request().headers()['x-goog-api-key']).toBe('test-key');
    expect(route.request().url()).not.toContain('test-key');
    const payload = { candidates: [{ content: { parts: [{ text: '**Compare constraints.** <img src=x onerror=alert(1)>\nTHEORIES_USED: opportunity-cost' }] } }] };
    await route.fulfill({ contentType: 'text/event-stream', body: `data: ${JSON.stringify(payload)}\n\n` });
  });
  await page.goto('./');
  await page.getByRole('button', { name: 'AI advisor', exact: true }).click();
  await page.getByRole('textbox', { name: 'Type your message' }).fill('Compare two roles');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.locator('.message--ai')).toContainText('Compare constraints.');
  await expect(page.locator('.message--ai img')).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', { name: 'AI advisor', exact: true }).click();
  await expect(page.locator('.message--ai')).toContainText('Compare constraints.');
  if (isMobile) await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Delete conversation', exact: true }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('.message--ai')).toContainText('Compare constraints.');
});

test('malformed local data does not prevent boot', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('homo_economicus_user', '{"name":12}');
    localStorage.setItem('homo_economicus_chats', '[null,{"id":"bad","messages":[null]}]');
    localStorage.setItem('homo_economicus_matrix_v1', '{"criteria":[]}');
  });
  await page.goto('./');
  await expect(page.locator('#ranking h2')).toHaveText('Established company');
});
