import { defineConfig, devices } from '@playwright/test';
import { PORT, basePath, ROOT, SERVER } from './site.mjs';

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.mjs',

  // Which pages to check is worked out once from the build — see
  // global-setup.mjs for why the write cannot live in this file's body, and
  // discover.mjs for why they are a discovery rather than a list.
  globalSetup: new URL('./global-setup.mjs', import.meta.url).pathname,

  fullyParallel: true,
  forbidOnly: !!process.env.CI,

  // No retries, deliberately. The site makes no third-party request at all —
  // fonts, icons and Chart-less charts are all local — so nothing here depends
  // on the network and a failure that comes and goes is a real bug in the page
  // rather than weather. A retry would hide exactly the flake worth knowing
  // about.
  retries: 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],

  use: {
    baseURL: `http://127.0.0.1:${PORT}${basePath()}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',

    // Nothing may leave the runner. The site should make no outbound request,
    // and this is how that stops being a claim: DNS is switched off for
    // everything but localhost, below the level any page script could reach.
    // A page that starts hotlinking a font or an analytics beacon then fails
    // here rather than quietly working.
    launchOptions: {
      args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'],
    },
  },

  webServer: {
    // An absolute command plus an explicit cwd: webServer.cwd defaults to the
    // config's own directory, so a relative command resolves to
    // tests/e2e/tests/e2e/server.mjs and the server never starts.
    cwd: ROOT,
    command: `node ${JSON.stringify(SERVER)} ${PORT}`,
    url: `http://127.0.0.1:${PORT}${basePath()}`,
    // Always launch it, locally too. Reusing a server left running from an
    // earlier session means the launch path — the thing CI actually does — is
    // never exercised, so the first real run of it is the one that fails.
    reuseExistingServer: false,
    timeout: 30_000,
  },

  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    // Chromium rather than the descriptor's WebKit: what this project checks
    // is the layout and the drawer at a phone viewport with touch, and
    // Chromium emulates both. Pulling in a second browser engine would double
    // the install for no finding it could make.
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'], browserName: 'chromium', defaultBrowserType: 'chromium' },
    },
  ],
});
