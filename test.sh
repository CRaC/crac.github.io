#!/usr/bin/env bash
#
# The gate. Runs against a build of its own, so it can run while `hugo server`
# is up and you keep reviewing in the browser.
#
# THAT SEPARATION IS THE POINT. `hugo server` continuously rewrites public/
# with livereload-injected copies, so a gate that graded public/ would be
# grading whichever process wrote last. The gate builds into .gate/ and never
# touches public/.
#
#   ./test.sh            build, index, links, browser checks, then the same as
#                        a project site served from a subdirectory
#   ./test.sh --fast     skip the network half of the links check
#
# CI does not need any of this: it has no dev server, and builds public/
# directly with the real Pages base URL.
set -euo pipefail
cd "$(dirname "$0")"

FAST=""
[[ "${1:-}" == "--fast" ]] && FAST=1

GATE_DIR="${GATE_DIR:-.gate}"
# Both the link checker and the Playwright harness read SITE_DIR (see
# tests/e2e/site.mjs), so one variable points all of it at the same build.
export SITE_DIR="$GATE_DIR"

links() {
  if [[ -n "$FAST" ]]; then node tests/links.mjs; else node tests/links.mjs --remote; fi
}

build() {
  rm -rf "$GATE_DIR"
  hugo --gc --minify --destination "$GATE_DIR" ${1:+--baseURL "$1"} >/dev/null
  npx -y pagefind@1 --site "$GATE_DIR" >/dev/null
}

echo "==> Building into $GATE_DIR"
build

echo "==> Checking links"
links

echo "==> Browser checks"
npx playwright test --config tests/e2e/playwright.config.mjs

# The same site as if it were served from a subdirectory, which is what GitHub
# Pages does for a project site. A separate pass because a whole class of bug
# is invisible at the root: `relURL` leaves a LEADING SLASH alone, so a
# hand-written "/use/" link works locally and 404s on the deploy, and
# url("/fonts/…") in the stylesheet would mean no font loaded at all.
echo "==> Again, as a project site under a subdirectory"
build "https://example.github.io/project-path/"
links
SITE_PORT=8132 npx playwright test --config tests/e2e/playwright.config.mjs

# Leave .gate as a normal root build rather than the subdirectory rehearsal.
# Without this the directory is left with its assets under /project-path/, so
# serving it at root 404s its own stylesheet — which looks like a broken site
# to the next person who pokes at it.
echo "==> Rebuilding $GATE_DIR at the root"
build

echo
echo "All checks passed. public/ untouched — your hugo server is fine."
