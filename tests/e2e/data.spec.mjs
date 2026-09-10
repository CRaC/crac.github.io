/**
 * The measured figures, and the claim the home page makes with them.
 *
 * These are the project's own numbers and the site's central argument, so a
 * template change that silently mis-scales the bars or drops a row is the
 * worst thing that can go wrong here — and it looks fine.
 */
import { test, expect } from './fixtures.mjs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './site.mjs';

/** data/startup.yaml, read without a YAML dependency. */
function startup() {
  const text = readFileSync(join(ROOT, 'data', 'startup.yaml'), 'utf8');
  return [...text.matchAll(/- name: "([^"]+)"\s*\n\s*cold: (\d+)\s*\n\s*restore: (\d+)/g)]
    .map((m) => ({ name: m[1], cold: Number(m[2]), restore: Number(m[3]) }));
}

test.describe('collapse bars', () => {
  test('every measured framework is shown, with its real figures', async ({ page }) => {
    await page.goto('');
    const rows = startup();
    expect(rows.length).toBeGreaterThan(0);

    const shown = await page.locator('.collapse__row').evaluateAll((els) =>
      els.map((el) => ({
        name: el.querySelector('.collapse__name').firstChild.textContent.trim(),
        figures: el.querySelector('.collapse__figures').textContent.replace(/\s+/g, ' '),
        coldPct: parseFloat(el.querySelector('.collapse__bar').style.width),
      })));

    expect(shown.map((r) => r.name), 'file order, not sorted')
      .toEqual(rows.map((r) => r.name));

    for (const [i, r] of rows.entries()) {
      expect(shown[i].figures, `${r.name} figures`).toContain(`${r.restore} ms`);
      expect(shown[i].figures, `${r.name} figures`).toContain(`${r.cold} ms`);
    }
  });

  test('both bars are on one scale, so the rows are comparable', async ({ page }) => {
    await page.goto('');
    const rows = startup();
    const max = Math.max(...rows.map((r) => r.cold));

    const widths = await page.locator('.collapse__bar').evaluateAll(
      (els) => els.map((el) => parseFloat(el.style.width)));

    // Drawn the wrong way every cold bar was full width, so a 980 ms cold
    // start looked identical to a 4352 ms one. Each bar is its own cold time
    // against the slowest in the set.
    for (const [i, r] of rows.entries()) {
      expect(widths[i], `${r.name} cold bar`).toBeCloseTo((r.cold / max) * 100, 1);
    }

    // And the restore is a small fraction of its own bar — the sliver that is
    // the whole argument. Rendered width, so this catches a CSS floor too.
    const slivers = await page.locator('.collapse__bar i').evaluateAll(
      (els) => els.map((el) => el.getBoundingClientRect().width /
                               el.parentElement.getBoundingClientRect().width));
    for (const [i, r] of rows.entries()) {
      expect(slivers[i], `${r.name} restore sliver`).toBeLessThan(0.2);
    }
  });

  test('the conditions are stated with the numbers, not hidden', async ({ page }) => {
    await page.goto('');
    // The figures are from a jdk14-crac build on 2015 hardware. Quoting them
    // without that is the one way this section could mislead, so the note is
    // asserted rather than trusted to survive an edit.
    const note = page.locator('.collapse__note');
    await expect(note).toBeVisible();
    await expect(note).toContainText(/jdk14-crac/);
    await expect(note).toContainText(/i7-5500U/);
    await expect(note).toContainText(/Linux 5\.7\.4/);
    await expect(note.locator('a')).toHaveAttribute('href', /about\/results/);
  });

  test('the runtimes list marks which one is upstream', async ({ page }) => {
    await page.goto('');
    // This site documents the JDK project, so the upstream build has to be
    // distinguishable from a vendor build rather than sitting in one list.
    const badges = await page.locator('.runtime .badge').allInnerTexts();
    expect(badges.filter((b) => /upstream/i.test(b)).length).toBe(1);
    expect(badges.length).toBeGreaterThan(1);
    await expect(page.locator('.runtime').first()).toContainText('OpenJDK CRaC');
  });
});
