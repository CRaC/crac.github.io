/**
 * Which pages the browser checks run against, discovered from the build rather
 * than kept as a list. A list is the wrong shape here: the whole point of the
 * gate is to catch a page that broke, and a page nobody remembered to add to
 * the list is exactly the one that breaks unnoticed.
 *
 * Pager URLs are left out — /blog/page/2/ renders the same listing with a
 * different slice below it, so it tells the checks nothing the first page has
 * not already told them. Aliases are left out of the page list too and checked
 * separately, since they are redirects rather than pages.
 */
import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { PUBLIC_DIR } from './site.mjs';

export const PAGES_FILE = new URL('./.pages.json', import.meta.url).pathname;

/** Every index.html under public/, as a site-relative URL path. */
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name === 'index.html') {
      const rel = relative(PUBLIC_DIR, p).split(sep).slice(0, -1).join('/');
      out.push(rel ? `${rel}/` : '');
    }
  }
  return out;
}

/** A one-line meta-refresh page is an alias, not a page. */
function isAlias(urlPath) {
  const file = join(PUBLIC_DIR, urlPath, 'index.html');
  if (!existsSync(file)) return false;
  const html = readFileSync(file, 'utf8');
  return /http-equiv=["']?refresh/i.test(html) && !/<main/i.test(html);
}

export function discover() {
  const all = walk(PUBLIC_DIR).sort();
  const pages = [];
  const aliases = [];
  for (const p of all) {
    if (/(^|\/)page\/\d+\/$/.test(p)) continue;   // a pager
    (isAlias(p) ? aliases : pages).push(p);
  }
  return { pages, aliases };
}
