/**
 * The "Edit it on GitHub" offer.
 *
 * It is rendered from baseof.html rather than from each page template, so the
 * thing worth checking is the two halves of that decision: it appears on every
 * page with a source file, and it is absent from the pages where the link
 * would be a trap.
 */
import { test, expect, pages } from './fixtures.mjs';

// Laid out entirely by their templates, so their markdown holds nothing but
// front matter and an edit link would send someone to the wrong file.
const NO_LINK = ['', 'search/', 'sitemap/'];

test('every content page offers a way to fix it', async ({ page }) => {
  for (const path of pages) {
    if (NO_LINK.includes(path)) continue;
    await page.goto(path);

    const edit = page.locator('.edit-page a');
    await expect(edit, `/${path} has no edit link`).toHaveCount(1);

    const href = await edit.getAttribute('href');
    expect(href, `/${path} edit href`).toMatch(/^https:\/\/github\.com\/.+\/edit\/.+\/content\/.+\.md$/);
    // A new tab, like every other off-site link.
    await expect(edit).toHaveAttribute('target', '_blank');
    await expect(edit).toHaveAttribute('rel', /noopener/);

    // The path is shown, because knowing WHICH file to change is the useful
    // half of the offer on a documentation site.
    await expect(page.locator('.edit-page__path')).toHaveText(/^content\/.+\.md$/);
  }
});

test('the template-built pages do not offer one', async ({ page }) => {
  for (const path of NO_LINK) {
    await page.goto(path);
    await expect(page.locator('.edit-page'), `/${path} should have no edit link`).toHaveCount(0);
  }
});

test('it sits below the content and above the footer', async ({ page }) => {
  await page.goto(pages.find((p) => !NO_LINK.includes(p)));
  const order = await page.evaluate(() => {
    const main = document.querySelector('main').getBoundingClientRect().bottom;
    const edit = document.querySelector('.edit-page').getBoundingClientRect();
    const foot = document.querySelector('footer').getBoundingClientRect().top;
    return { afterMain: edit.top >= main - 1, beforeFooter: edit.bottom <= foot + 1 };
  });
  expect(order.afterMain, 'below the content').toBe(true);
  expect(order.beforeFooter, 'above the footer').toBe(true);
});
