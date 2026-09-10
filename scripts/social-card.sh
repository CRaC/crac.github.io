#!/usr/bin/env bash
#
# Renders assets/images/social-card.svg to the PNG used as the site's
# shared-link image. Hugo's image pipeline cannot rasterise SVG, so this is a
# build step of its own rather than something the templates do.
#
# Run it after changing data/startup.yaml — the card carries those numbers.
set -euo pipefail
cd "$(dirname "$0")/.."

CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
[[ -x "$CHROME" ]] || { echo "Set CHROME to a Chrome/Chromium binary." >&2; exit 1; }

"$CHROME" --headless=new --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=1 --window-size=1200,630 \
  --screenshot="assets/images/social-card.png" --virtual-time-budget=3000 \
  "file://$PWD/assets/images/social-card.svg" 2>/dev/null

echo "wrote assets/images/social-card.png"
