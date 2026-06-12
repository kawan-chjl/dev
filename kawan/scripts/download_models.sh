#!/usr/bin/env bash
# Downloads the three Live2D mascot models (kawan-spec.md §4.4) into frontend/public/models/.
# Raw model files are .gitignore'd — every dev runs this once after clone.
set -euo pipefail
cd "$(dirname "$0")/.."
DEST=frontend/public/models
mkdir -p "$DEST"

fetch() {
  local name=$1 url=$2
  if [ -d "$DEST/$name" ]; then
    echo "✔ $name already present — skipping"
    return
  fi
  echo "↓ $name ..."
  local tmp
  tmp=$(mktemp --suffix=.zip)
  curl -fL --retry 3 -o "$tmp" "$url"
  unzip -q -o "$tmp" -d "$DEST/$name"
  rm -f "$tmp"
  echo "✔ $name → $DEST/$name"
}

# Official Live2D samples — public unauthenticated URLs (spec §4.4, verified).
# "PRO" labels the data edition, not a paywall.
fetch haru   https://cubism.live2d.com/sample-data/bin/haru/haru_greeter_pro_jp.zip
fetch hiyori https://cubism.live2d.com/sample-data/bin/hiyori_free/hiyori_free_en.zip

# LiveroiD (A-Y01/02 maid) cannot be scripted — BOOTH requires a logged-in account:
if [ ! -d "$DEST/liveroid" ]; then
  cat << 'EOF'
○ liveroid — manual step required:
  1. Log in at https://booth.pm (free pixiv account)
  2. Open https://booth.pm/en/items/2685284 → add the 0-JPY item → checkout
  3. Download LiveroiD_A_1.2.zip from your BOOTH Library
  4. Unzip into frontend/public/models/liveroid/
  Credit required: #LiveroiD + "モデル制作：八城惺架 (@yashiro_seika)" (already in README).
EOF
fi
