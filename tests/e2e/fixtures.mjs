// Shared helpers. Kept small on purpose: anything clever here is a thing that
// can be wrong in a way that makes a real failure look like a passing test.
import { test as base, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { PAGES_FILE } from './discover.mjs';

export const { pages, aliases } = JSON.parse(readFileSync(PAGES_FILE, 'utf8'));

/**
 * The page fixture, with console and page errors collected. Every spec asserts
 * on them, because the failures this site can actually have — a script that
 * throws before wiring the menu, a stylesheet that 404s after a fingerprint
 * change — all present as a page that looks fine and is broken.
 */
export const test = base.extend({
  problems: async ({ page }, use) => {
    const found = [];
    page.on('console', (m) => {
      if (m.type() === 'error') found.push(`console: ${m.text()}`);
    });
    page.on('pageerror', (e) => found.push(`pageerror: ${e.message}`));
    page.on('requestfailed', (r) => {
      // A blocked third party is the DNS rule doing its job, not a failure —
      // but nothing on this site should be reaching outside in the first
      // place, so record it and let the spec decide.
      found.push(`requestfailed: ${r.url()} ${r.failure()?.errorText ?? ''}`);
    });
    await use(found);
  },
});

export { expect };

/** Does the document scroll sideways? The single most common responsive bug. */
export async function horizontalOverflow(page) {
  return page.evaluate(() => {
    const d = document.documentElement;
    return d.scrollWidth - d.clientWidth;
  });
}

/** Geometry of the header's download button, for the "nothing moved" checks. */
export async function ctaBox(page) {
  return page.evaluate(() => {
    const el = document.querySelector('.nav-item--cta .btn');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const bar = document.querySelector('.masthead__inner').getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), barH: Math.round(bar.height) };
  });
}
