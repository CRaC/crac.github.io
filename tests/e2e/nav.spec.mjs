/**
 * The header. Everything here is JavaScript-assisted or CSS-state-dependent,
 * so none of it can be checked by looking at the HTML.
 */
import { test, expect } from './fixtures.mjs';

/** Header geometry, for the "nothing moved" checks. */
async function barBox(page) {
  return page.evaluate(() => {
    const bar = document.querySelector('.masthead__inner').getBoundingClientRect();
    const last = document.querySelector('.masthead__list > .nav-item:last-of-type a');
    const r = last ? last.getBoundingClientRect() : null;
    return { barH: Math.round(bar.height), lastX: r ? Math.round(r.x) : null,
             lastY: r ? Math.round(r.y) : null };
  });
}

test.describe('desktop header', () => {
  test.skip(({ isMobile }) => !!isMobile, 'the bar is a drawer on mobile');

  test('exactly one search control is shown', async ({ page }) => {
    await page.goto('');
    // Two are rendered — one for the bar, one for the drawer — and only the
    // bar's may be visible here. The drawer copy showed through once, because
    // `.nav-item { display: flex }` in the sub-menu block outranked the rule
    // hiding it on source order.
    await expect(page.locator('.site-search__toggle:visible')).toHaveCount(1);
  });

  test('sub-menu opens on click and on hover, and closes on Escape', async ({ page }) => {
    await page.goto('');
    const item = page.locator('.nav-item--sub', { has: page.getByRole('link', { name: 'Using CRaC', exact: true }) });
    const panel = page.locator('#sub-use');
    const toggle = item.locator('.nav-sub-toggle');

    await expect(panel).toBeHidden();

    await toggle.click();
    await expect(panel).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    // The overview is first, which is the only order that reads as a way in.
    await expect(panel.locator('a').first()).toHaveText('Overview');

    // Move the pointer off the item before testing Escape. Clicking leaves the
    // mouse on the toggle, and :hover legitimately holds the panel open — so
    // asserting from there would test the hover rule, not Escape. It also
    // checks what the click state exists for: it survives the mouse leaving.
    await page.mouse.move(700, 600);
    await expect(panel).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    // Hover is the mouse path and is CSS-only, so it is checked apart from the
    // button.
    await item.getByRole('link', { name: 'Using CRaC', exact: true }).hover();
    await expect(panel).toBeVisible();
  });

  test('the parent stays lit while a sub-page is open', async ({ page }) => {
    await page.goto('use/crac-runtime/');
    const parent = page.locator('.masthead__list > .nav-item--sub > a', { hasText: 'Using CRaC' });
    await expect(parent).toHaveAttribute('data-in-section', '');
    await expect(page.locator('#sub-use a[aria-current="page"]')).toHaveText('Runtimes with CRaC');
  });

  test('opening search does not move the bar', async ({ page }) => {
    await page.goto('');
    const before = await barBox(page);

    await page.locator('.masthead__search [data-search-toggle]').click();
    const field = page.locator('.masthead__search input[type="search"]');
    await expect(field).toBeVisible();
    await expect(field).toBeFocused();

    // The regression this exists for: an inline field that grows wraps the last
    // nav item onto a second row, and a form stretched across the bar covers
    // the wordmark. Neither may happen.
    expect(await barBox(page), 'header geometry while search is open').toEqual(before);
    await expect(page.locator('.masthead__logo')).toBeVisible();

    // The popover hangs below the bar rather than inside it.
    const geom = await page.evaluate(() => {
      const i = document.querySelector('.masthead__search input').getBoundingClientRect();
      const bar = document.querySelector('.masthead__inner').getBoundingClientRect();
      const tog = document.querySelector('.masthead__search [data-search-toggle]').getBoundingClientRect();
      return { below: Math.round(i.top - bar.bottom), rightOffset: Math.round(i.right - tog.right) };
    });
    expect(geom.below, 'gap below the bar').toBeGreaterThan(0);
    expect(geom.rightOffset, 'right edge aligned with the magnifier').toBe(0);

    // Escape clears and closes; a click away closes but keeps what was typed.
    await field.fill('checkpoint');
    await page.locator('.hero h1').click();
    await expect(field).toBeHidden();
    await page.locator('.masthead__search [data-search-toggle]').click();
    await expect(field).toHaveValue('checkpoint');
    await page.keyboard.press('Escape');
    await expect(field).toBeHidden();
  });
});

test.describe('mobile header', () => {
  test.skip(({ isMobile }) => !isMobile, 'the drawer only exists on narrow screens');

  test('the drawer opens with every sub-page shown and a search field', async ({ page }) => {
    await page.goto('');
    const nav = page.locator('#site-nav');
    const toggle = page.locator('.nav-toggle');

    await expect(nav).toBeHidden();
    await toggle.click();
    await expect(nav).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    // No fly-out to open on a phone: the sub-pages sit indented under their
    // parent, all of them, always.
    const subs = page.locator('.nav-sub');
    expect(await subs.count()).toBeGreaterThan(2);
    for (let i = 0; i < await subs.count(); i++) await expect(subs.nth(i)).toBeVisible();

    await expect(page.locator('.nav-item--drawer-search input')).toBeVisible();
  });

  test('the bar magnifier reaches the search page without script', async ({ page }) => {
    // It is a real submit, so this is the no-JavaScript path as well.
    await page.goto('');
    await page.locator('.masthead__search [data-search-toggle]').click();
    await page.waitForURL(/\/search\//);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/search/i);
  });
});

test.describe('breadcrumbs', () => {
  test('a nested page shows its real trail, and home shows none', async ({ page }) => {
    await page.goto('reference/fd-policies/');
    const crumbs = page.locator('.crumbs a, .crumbs [aria-current]');
    await expect(crumbs).toHaveText(['Home', 'Reference', 'File descriptor policies']);
    for (const href of await page.locator('.crumbs a').evaluateAll(
      (els) => els.map((e) => e.getAttribute('href')))) {
      expect(href).toBeTruthy();
    }

    await page.goto('');
    await expect(page.locator('.crumbs')).toHaveCount(0);
  });
});

test.describe('menu coverage', () => {
  test.skip(({ isMobile }) => !!isMobile, 'the same menu, checked once');

  test('every section a reader would scan for is reachable from the menu',
    async ({ page }) => {
      await page.goto('');
      const hrefs = await page.locator('.masthead__list a').evaluateAll(
        (els) => els.map((e) => e.getAttribute('href')));

      for (const path of ['/use/', '/use/crac-runtime/', '/use/implement-crac/',
                          '/frameworks/', '/examples/', '/reference/', '/about/']) {
        expect(hrefs.some((h) => h && h.endsWith(path)),
          `${path} is not reachable from the main menu`).toBe(true);
      }
    });

  test('every menu link resolves', async ({ page }) => {
    await page.goto('');
    const hrefs = await page.locator('.masthead__list a').evaluateAll(
      (els) => els.map((e) => e.getAttribute('href')).filter((h) => h && !h.startsWith('http')));

    // Deduplicated: a parent and the child that repeats it share a URL.
    for (const href of [...new Set(hrefs)]) {
      const res = await page.request.get(href);
      expect(res.status(), `menu link ${href}`).toBe(200);
    }
  });
});
