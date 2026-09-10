/**
 * The page list is worked out ONCE, here, and shared with every worker.
 *
 * It cannot live in the config's module body: Playwright loads
 * playwright.config.mjs in the main process and again in each worker, so a
 * top-level write runs several times over and one worker truncating the file
 * while another reads it is a red run caused by nothing on the site. The write
 * is staged and renamed so no reader can observe a half-written file.
 */
import { renameSync, writeFileSync } from 'node:fs';
import { discover, PAGES_FILE } from './discover.mjs';

export default function globalSetup() {
  const staging = `${PAGES_FILE}.tmp`;
  writeFileSync(staging, JSON.stringify(discover(), null, 2));
  renameSync(staging, PAGES_FILE);
}
