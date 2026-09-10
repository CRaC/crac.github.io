// Where the built site is and how it is addressed. Shared by the server, the
// Playwright config and page discovery, so all three agree by construction.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The repo root, worked out from THIS FILE rather than from the working
 * directory. Playwright runs `webServer.command` with a cwd of its own
 * choosing — the config's directory, not the repo root — so a relative
 * "public" or "tests/e2e/server.mjs" resolves somewhere different depending on
 * who started the process. Nothing here is cwd-relative for that reason.
 */
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SERVER = join(ROOT, 'tests', 'e2e', 'server.mjs');

export const PUBLIC_DIR = process.env.SITE_DIR
  ? resolve(process.env.SITE_DIR)
  : join(ROOT, 'public');

export const PORT = Number(process.env.SITE_PORT || 8131);

/**
 * The path the site is served at, read from the home page's own canonical.
 * A GitHub Pages project build lives under /<repo>/ and a production one under
 * /, and the workflow passes whichever through --baseURL — so this follows it
 * with nothing to configure and nothing to remember at cutover.
 */
export function basePath() {
  const home = join(PUBLIC_DIR, 'index.html');
  if (existsSync(home)) {
    const html = readFileSync(home, 'utf8');
    const tag = html.match(/<link[^>]+rel=["']?canonical["']?[^>]*>/i);
    const href = tag && tag[0].match(/href=["']?([^"'\s>]+)/i);
    if (href) {
      try {
        const p = new URL(href[1]).pathname;
        return p.endsWith('/') ? p : `${p}/`;
      } catch { /* a relative canonical: fall through */ }
    }
  }
  return '/';
}

export const BASE_URL = () => `http://127.0.0.1:${PORT}${basePath()}`;
