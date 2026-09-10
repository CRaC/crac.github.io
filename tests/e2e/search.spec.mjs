/**
 * Search is filled in entirely client-side from the Pagefind index, so it is
 * the one part of the site a static check cannot see at all: the page returns
 * 200 with an empty results area whether the index is there or not.
 */
import { test, expect } from './fixtures.mjs';

test('the index exists and the page finds things in it', async ({ page, problems }) => {
  await page.goto('search/');

  // Fail loudly when the index is missing rather than reporting "no results":
  // a build that forgot the Pagefind step must not look like a working search
  // that happens to match nothing.
  //
  // A relative path here resolves against the config's baseURL, which already
  // carries the base path — unlike resolving against page.url(), which would
  // look for the index inside /search/.
  const res = await page.request.get('pagefind/pagefind.js');
  expect(res.status(), 'pagefind.js — did the build run `pagefind --site public`?').toBe(200);

  await page.locator('#search-page-input').fill('checkpoint');
  await expect(page.locator('#search-page-status')).toContainText(/\d+ pages? matched/);

  // Web-first assertions, not `count()`. The status line is set BEFORE the
  // results are hydrated — each hit is a separate fetch of its fragment — so a
  // snapshot count taken as soon as the status appears is a race, and it
  // failed exactly once in a full run. `expect(...).not.toHaveCount(0)`
  // retries; `expect(await ...count()).toBeGreaterThan(0)` cannot.
  await expect(page.locator('.search-result h3 a')).not.toHaveCount(0);

  // Results are grouped by section, with a count per heading.
  const headings = page.locator('.search-page__section > h2');
  await expect(headings).not.toHaveCount(0);
  await expect(headings.first().locator('.search-page__count')).toHaveText(/^\d+$/);

  // The excerpt is Pagefind's markup and carries the match, which is the whole
  // reason it is inserted as HTML rather than as text.
  await expect(page.locator('.search-result mark').first()).toBeVisible();

  expect(problems).toEqual([]);
});

test('a result actually goes somewhere', async ({ page }) => {
  await page.goto('search/?q=beforeCheckpoint');
  await expect(page.locator('#search-page-status')).toContainText(/matched/);
  await page.locator('.search-result h3 a').first().click();
  await expect(page.locator('h1')).toHaveCount(1);
  expect(page.url()).not.toContain('404');
});

test('?q= from the header box runs the search on load', async ({ page }) => {
  await page.goto('search/?q=criu');
  await expect(page.locator('#search-page-input')).toHaveValue('criu');
  await expect(page.locator('#search-page-status')).toContainText(/matched/);
});

test('a query that matches nothing says so', async ({ page }) => {
  await page.goto('search/');
  await page.locator('#search-page-input').fill('zzzqqqnothinghere');
  await expect(page.locator('#search-page-status')).toContainText(/Nothing matched/);
  await expect(page.locator('.search-result')).toHaveCount(0);
});

test('the header box submits as a plain GET', async ({ page, isMobile }) => {
  await page.goto('');
  const box = isMobile ? '.nav-item--drawer-search' : '.masthead__search';
  if (isMobile) await page.locator('.nav-toggle').click();
  else await page.locator('.masthead__search [data-search-toggle]').click();
  await page.locator(`${box} input`).fill('restore');
  await page.locator(`${box} input`).press('Enter');
  await page.waitForURL(/\/search\/\?q=restore/);
  await expect(page.locator('#search-page-status')).toContainText(/matched/);
});

test('the index records only each page\'s own content', async ({ page, baseURL }) => {
  await page.goto('search/');

  // Asking by query cannot answer this. Pagefind matches WORDS, not phrases,
  // so a "chrome-only" phrase also matches pages containing its words apart.
  // So read the fragment the index actually stored and check what is in it.
  //
  // The index URL comes from the config's baseURL, not from a root-absolute
  // path: on a project site it lives under the base path.
  const indexUrl = new URL('pagefind/pagefind.js', baseURL).href;
  const content = await page.evaluate(async (url) => {
    const pagefind = await import(url);
    const search = await pagefind.search('checkpoint');
    const first = await search.results[0].data();
    return first.content;
  }, indexUrl);

  expect(content).toMatch(/checkpoint/i);
  // The footer, which is on every page, is not in it. If it were,
  // data-pagefind-body would have stopped scoping the index to <main> and
  // every query would return the whole site.
  expect(content).not.toMatch(/sponsored by the HotSpot Group/i);
  expect(content).not.toMatch(/trademarks of Oracle/i);
});
