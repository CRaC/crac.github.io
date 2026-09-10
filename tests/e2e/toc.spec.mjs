/**
 * The table of contents marks the section being read. It is driven by scroll
 * position, so nothing about it is visible in the built HTML.
 */
import { test, expect, pages } from './fixtures.mjs';

test.describe('table of contents', () => {
  test.skip(({ isMobile }) => !!isMobile, 'the sidebar is stacked below 62rem');

  test('the marked entry follows the scroll', async ({ page }) => {
    await page.goto('reference/fd-policies/');

    const toc = page.locator('.toc');
    await expect(toc).toBeVisible();
    await expect(toc.locator('a').nth(2)).toBeAttached();

    const entries = await toc.locator('a').evaluateAll(
      (els) => els.map((e) => ({ hash: e.hash, text: e.textContent.trim() })));

    // At the top, the first section is the one being read.
    await expect(toc.locator('a[aria-current]')).toHaveText(entries[0].text);

    // Put a later heading just above the reading line — a third of the way
    // down the viewport — and the mark should move to it.
    //
    // scrollIntoViewIfNeeded is wrong for this: it scrolls the minimum needed,
    // which can leave the heading near the BOTTOM of the viewport, below the
    // reading line. The mark then sits on the previous section, which is
    // correct behaviour and looks like a bug.
    const target = entries[entries.length - 1];
    await page.evaluate((hash) => {
      const h = document.querySelector(hash);
      window.scrollTo({ top: h.getBoundingClientRect().top + window.scrollY - 100,
                        behavior: 'instant' });
    }, target.hash);
    await expect(toc.locator('a[aria-current]')).toHaveText(target.text);

    // Exactly one entry is ever marked.
    await expect(toc.locator('a[aria-current]')).toHaveCount(1);
  });

  test('a page gets a TOC when its content has two or more sections',
    async ({ page }) => {
      // The rule, checked against the pages that made it necessary.
      //
      // It counts h2 AND h3, because that is what markup.tableOfContents
      // renders. Counting h2 alone said /reference/debugging/ — one h2 and
      // five h3s, a six-entry table — was too thin to bother with.
      for (const path of ['use/', 'reference/debugging/', 'reference/best-practices/',
                          'frameworks/', 'examples/jetty/', 'examples/super-heroes/']) {
        await page.goto(path);
        const entries = await page.locator('main h2[id], main h3[id]').count();
        expect(entries, `/${path} heading count`).toBeGreaterThan(1);
        await expect(page.locator('.toc'), `/${path} should have a TOC`).toBeVisible();
      }

      // A page whose content has no headings gets none, because there would be
      // nothing to list. These are short pages; the fix if they ever want one
      // is headings, not a lower threshold.
      for (const path of ['frameworks/quarkus/', 'use/implement-crac/']) {
        await page.goto(path);
        expect(await page.locator('main h2[id], main h3[id]').count(),
          `/${path} unexpectedly has headings`).toBeLessThan(2);
        await expect(page.locator('.toc'), `/${path} should not have a TOC`).toHaveCount(0);
      }
    });

  test('the TOC script is loaded on exactly the pages that render one',
    async ({ page }) => {
      // The invariant rather than one example. baseof.html and the layouts ask
      // the same partial, but a layout that renders no TOC while its content
      // has three sections would still pull the script in.
      for (const path of pages) {
        await page.goto(path);
        const hasToc = (await page.locator('.toc').count()) > 0;
        const hasScript = (await page.locator('script[src]').evaluateAll(
          (els) => els.map((e) => e.getAttribute('src')))).some((s) => s.includes('toc'));
        expect(hasScript, `/${path} — TOC ${hasToc ? 'rendered' : 'absent'} ` +
          `but script ${hasScript ? 'loaded' : 'absent'}`).toBe(hasToc);
      }
    });
});
