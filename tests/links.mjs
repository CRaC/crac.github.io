/**
 * The link gate. Two halves, run over the built site in public/.
 *
 *   1. Internal links resolve to a file that exists. Static, offline, fast.
 *   2. Every URL in data/release.yaml and data/docs.yaml answers. This one
 *      goes out to the network.
 *
 * Half two exists because of a specific escape: `payara-ml-web` was
 * extrapolated from `payara-ml` and shipped as a download button that 404'd.
 * The real artifact is `payara-web-ml`. No amount of internal checking could
 * have caught that — only asking nexus could.
 *
 * A third check rides along: every `## ` heading in a content file has to
 * appear as a heading in the built page. That is not busywork — a shortcode
 * whose block-level output landed inside a paragraph silently swallowed a
 * whole section of /get-started/payara-server/, and the page still built,
 * still returned 200, and still looked complete. Nothing else here could see
 * it.
 *
 * Usage:
 *   node tests/links.mjs            internal only, no network
 *   node tests/links.mjs --remote   internal plus the data-file URLs
 */
import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { PUBLIC_DIR, ROOT, basePath } from './e2e/site.mjs';

const remote = process.argv.includes('--remote');
const failures = [];

/* ---------------------------------------------------------------- internal */

function htmlFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) htmlFiles(p, out);
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

// Where the site is addressed from, read from the home page's own canonical.
// "/" for a production build, "/Payara-Org-Website/" for a GitHub Pages project
// build — the workflow passes whichever through --baseURL.
const base = basePath();

/**
 * Does a site-relative href resolve to something on disk?
 *
 * The base path has to come off first. public/ IS the base-path root, so a
 * project build's "/Payara-Org-Website/downloads/" lives at
 * public/downloads/ — resolving it verbatim looks for
 * public/Payara-Org-Website/downloads/ and reports every internal link on the
 * site as dead. That is precisely what it did on the first push to the payara
 * org repo: 340 "dead" links, all of them fine.
 */
function resolves(href) {
  let clean = href.split('#')[0].split('?')[0];
  if (!clean) return true;

  if (clean.startsWith('/')) {
    if (base === '/') {
      clean = clean.slice(1);
    } else if (clean === base || clean === base.slice(0, -1)) {
      clean = '';
    } else if (clean.startsWith(base)) {
      clean = clean.slice(base.length);
    } else {
      // A site-absolute link that escapes the base path can never resolve on
      // Pages, and is worth reporting rather than quietly stripping.
      return false;
    }
  }

  const p = join(PUBLIC_DIR, clean);
  return existsSync(p) || existsSync(join(p, 'index.html')) || existsSync(`${p}.html`);
}

const files = htmlFiles(PUBLIC_DIR);
let internal = 0;
let external = 0;
let missingTarget = 0;

for (const file of files) {
  const html = readFileSync(file, 'utf8');
  const where = relative(PUBLIC_DIR, file).split(sep).join('/');

  // The search page carries a minified script whose strings look like hrefs.
  const isSearch = where.startsWith('search/');

  for (const m of html.matchAll(/<a\b[^>]*>/g)) {
    const tag = m[0];
    const hm = tag.match(/href=(?:"([^"]+)"|([^ >]+))/);
    if (!hm) continue;
    const href = (hm[1] ?? hm[2]).replace(/>$/, '');

    if (/^https?:/.test(href)) {
      external += 1;
      // Every off-site link opens in a new tab, and does so in the HTML rather
      // than only after nav.js runs.
      if (!/\btarget=/.test(tag)) {
        missingTarget += 1;
        failures.push(`${where}: external link without target — ${href}`);
      }
      continue;
    }
    if (/^(mailto:|tel:|\/\/|#)/.test(href)) continue;
    if (isSearch && /[{}'"+]/.test(href)) continue;   // a JS string, not a link

    internal += 1;
    if (!resolves(href)) failures.push(`${where}: dead internal link — ${href}`);
  }
}

console.log(`internal links: ${internal}`);
console.log(`external links: ${external} (${missingTarget} without target)`);

/* ------------------------------------------------- build not contaminated */

// `hugo server` writes its own livereload-injected copies into public/ — all
// 27 pages, within seconds of starting — so a gate run with a dev server open
// grades the server's output instead of the build. That is not theoretical: it
// produced a page with a half-rendered shortcode and a whole section missing,
// which cost an hour of debugging a shortcode that was fine.
const contaminated = files.filter((f) => readFileSync(f, 'utf8').includes('livereload'));
if (contaminated.length) {
  failures.push(
    `${contaminated.length} built page(s) carry a livereload script — a \`hugo server\` ` +
    `is writing into public/. Stop it and rebuild; the checks below would be ` +
    `grading its output, not the build.`);
}

/* ----------------------------------------------------------- edit links */

// "Edit it on GitHub" points at a file in this repository, so the path it
// names has to exist. A wrong prefix or a page whose source moved gives a
// link that looks fine and lands on GitHub's 404 — and nobody clicks their own
// edit link often enough to notice.
//
// The branch cannot be checked from here; the path can, and the path is what
// changes when content is reorganised.
let editLinks = 0;
for (const file of files) {
  const html = readFileSync(file, 'utf8');
  const where = relative(PUBLIC_DIR, file).split(sep).join('/');
  const m = html.match(/class="?edit-page"?[\s\S]{0,400}?href="?([^"\s>]+)/);
  if (!m) continue;
  editLinks += 1;

  const path = m[1].split('/edit/').slice(1).join('/edit/').split('/').slice(1).join('/');
  if (!path) {
    failures.push(`${where}: edit link has no file path — ${m[1]}`);
  } else if (!existsSync(join(ROOT, decodeURIComponent(path)))) {
    failures.push(`${where}: edit link points at a file that does not exist — ${path}`);
  }
}
console.log(`edit links: ${editLinks} all point at real files`);

/* ---------------------------------------------------- content not truncated */

/** The built page for a content file, or null when it is not published. */
function builtPage(md) {
  const rel = relative(join(ROOT, 'content'), md).split(sep).join('/');
  const slug = rel.replace(/(^|\/)_index\.md$/, '$1').replace(/\.md$/, '/');
  for (const candidate of [join(PUBLIC_DIR, slug, 'index.html'),
                           join(PUBLIC_DIR, slug.replace(/\/$/, '') + '.html')]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function contentFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) contentFiles(p, out);
    else if (name.endsWith('.md')) out.push(p);
  }
  return out;
}

let checkedHeadings = 0;
for (const md of contentFiles(join(ROOT, 'content'))) {
  const page = builtPage(md);
  if (!page) continue;                       // a filing directory, or unrendered

  const source = readFileSync(md, 'utf8');
  // Front matter can hold a line starting with '## ' inside a string; headings
  // are only counted in the body.
  const body = source.slice(source.indexOf('\n---', 3) + 4);
  const headings = [...body.matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => m[1]);
  if (!headings.length) continue;

  const html = readFileSync(page, 'utf8');

  // Goldmark applies smart punctuation, so a source heading written
  // "Programmer's flow" renders as "Programmer&rsquo;s flow" — and as an HTML
  // ENTITY, not a literal curly character, which is why normalising unicode
  // alone still reported it as missing content. Entities are decoded first,
  // then both sides are normalised back to straight punctuation.
  const plainly = (t) => t
    .replace(/&(?:rsquo|lsquo|apos|#39);/g, "'")
    .replace(/&(?:ldquo|rdquo|quot);/g, '"')
    .replace(/&mdash;/g, '---').replace(/&ndash;/g, '--')
    .replace(/&hellip;/g, '...')
    .replace(/&nbsp;/g, ' ')
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2014/g, '---').replace(/\u2013/g, '--')
    .replace(/\u2026/g, '...')
    .replace(/\s+/g, ' ')
    .trim();

  // Compare on the heading's plain text: Hugo renders inline markdown inside a
  // heading, so `## Using \`asadmin\`` becomes markup rather than a literal.
  const rendered = [...html.matchAll(/<h2\b[^>]*>(.*?)<\/h2>/gs)]
    .map((m) => plainly(m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&')));

  for (const h of headings) {
    checkedHeadings += 1;
    const plain = plainly(h.replace(/[*`_]/g, '').replace(/\[(.+?)\]\(.+?\)/g, '$1'));
    if (!rendered.some((r) => r === plain || r.includes(plain))) {
      failures.push(`${relative(ROOT, md)}: heading "${h}" is missing from the built page ` +
                    `— content dropped between the source and ${relative(PUBLIC_DIR, page)}`);
    }
  }
}
console.log(`content headings: ${checkedHeadings} all present`);

/* ------------------------------------------------------------------ remote */

/** The URLs the data files promise, so a dead upstream link is a build failure. */
function dataUrls() {
  const urls = [];
  // Every http(s) URL in data/, with the key it sits under, for the report.
  for (const file of ['project.yaml', 'runtimes.yaml', 'frameworks.yaml', 'startup.yaml']) {
    const text = readFileSync(join(ROOT, 'data', file), 'utf8');
    for (const m of text.matchAll(/^\s*(?:- )?([a-zA-Z]+):\s*"?(https?:\/\/[^"\s]+)"?/gm)) {
      urls.push({ what: `${file} ${m[1]}`, url: m[2] });
    }
  }
  return urls;
}

if (remote) {
  const targets = dataUrls();
  console.log(`\nchecking ${targets.length} URLs from data/…`);

  // A HEAD first, because an artifact is a 150 MB zip and nothing here wants
  // to download one. Some servers answer HEAD with 405, so fall back to a GET
  // that is abandoned as soon as the status is known.
  async function status(url) {
    for (const method of ['HEAD', 'GET']) {
      const stop = AbortSignal.timeout(30_000);
      try {
        const r = await fetch(url, { method, redirect: 'follow', signal: stop });
        if (method === 'GET') await r.body?.cancel();
        if (r.status !== 405) return r.status;
      } catch (e) {
        if (method === 'GET') return `error: ${e.message}`;
      }
    }
    return 'error: both methods failed';
  }

  const results = await Promise.all(
    targets.map(async (t) => ({ ...t, code: await status(t.url) })));

  for (const r of results) {
    const ok = r.code === 200;
    console.log(`${String(r.code).padStart(6)}  ${r.what}: ${r.url}`);
    if (!ok) failures.push(`${r.what} does not resolve (${r.code}) — ${r.url}`);
  }
}

/* ------------------------------------------------------------------ verdict */

if (failures.length) {
  console.error(`\n${failures.length} problem${failures.length === 1 ? '' : 's'}:`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log('\nall links resolve');
