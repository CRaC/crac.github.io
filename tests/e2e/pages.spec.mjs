/**
 * Every built page, in the browser. Static analysis can tell you a file exists;
 * only a browser can tell you the page works — and on this site the ways it can
 * fail all look like a 200 with a full-looking page.
 */
import { test, expect, pages, aliases, horizontalOverflow } from './fixtures.mjs';

test.describe('every page', () => {
  for (const path of pages) {
    test(`/${path} renders`, async ({ page, problems }) => {
      const res = await page.goto(path, { waitUntil: 'load' });
      expect(res?.status(), 'HTTP status').toBe(200);

      // One h1, always. Two is a document outline nobody can navigate, none is
      // a page with no subject.
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page).toHaveTitle(/\S/);

      // The header and footer are on every page; if either is missing, a
      // template broke rather than the content.
      await expect(page.locator('header.masthead')).toBeVisible();
      await expect(page.locator('footer.footer')).toBeVisible();

      // The stylesheet is fingerprinted, so a stale reference shows up as an
      // unstyled page rather than an error. Check it actually applied.
      const styled = await page.evaluate(() =>
        getComputedStyle(document.body).backgroundColor);
      expect(styled, 'body background from the stylesheet').not.toBe('rgba(0, 0, 0, 0)');

      expect(await horizontalOverflow(page), 'sideways scroll').toBeLessThanOrEqual(1);
      expect(problems, 'console and network errors').toEqual([]);
    });
  }
});

test.describe('aliases', () => {
  for (const path of aliases) {
    test(`/${path} redirects`, async ({ page, baseURL }) => {
      // Fetched, not navigated to. Hugo writes an alias as a zero-delay
      // meta-refresh to an ABSOLUTE url built from baseURL —
      // https://payara.org/… — which is right on the deploy and unreachable
      // here, because the config switches DNS off for everything but
      // localhost. In a browser the refresh fires before anything can read
      // the tag, and the navigation then fails with ERR_NAME_NOT_RESOLVED,
      // which says nothing at all about the alias.
      //
      // The claim worth checking needs no browser: the old URL still exists,
      // and it points at a page that also exists.
      const res = await page.request.get(path);
      expect(res.status(), `/${path} is not served`).toBe(200);

      const html = await res.text();
      const meta = html.match(/http-equiv=["']?refresh["']?[^>]*content=["']([^"']+)["']/i)
                ?? html.match(/content=["']([^"']*url=[^"']+)["'][^>]*http-equiv=["']?refresh/i);
      expect(meta, `/${path} carries no refresh target`).toBeTruthy();

      const target = new URL(meta[1].replace(/^\s*\d+\s*;\s*url=/i, '').trim());
      expect(target.pathname, `/${path} redirects to itself`)
        .not.toBe(new URL(path, baseURL).pathname);
      expect(target.pathname).not.toContain('404');

      // The same path on the local server, which is where it resolves for us.
      const landing = await page.request.get(new URL(target.pathname, baseURL).href);
      expect(landing.status(), `/${path} lands on ${target.pathname}`).toBe(200);
    });
  }
});

test('404 page answers with a 404 and offers a way out', async ({ page }) => {
  const res = await page.goto('no-such-page/');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/not found/i);
  await expect(page.locator('main a[href*="/use/"]').first()).toBeVisible();
});
