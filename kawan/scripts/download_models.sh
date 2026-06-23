#!/usr/bin/env bash
# Downloads the three Live2D mascot models (kawan-spec.md §4.4) into frontend/public/models/.
# Raw model files are .gitignore'd — every dev runs this once after clone.
#
# Sources (verified HTTP 200 as of 2026-06-23):
#   Haru  — cdn.jsdelivr.net/gh/guansss/pixi-live2d-display@0.4.0/test/assets/haru/ (greeter t03)
#   Hiyori — raw.githubusercontent.com/Live2D/CubismWebSamples/develop/Samples/Resources/Hiyori/
#   LiveroiD — BOOTH (manual step, cannot be scripted)
set -euo pipefail
cd "$(dirname "$0")/.."
DEST=frontend/public/models
mkdir -p "$DEST"

# fetch_file <dest_path> <url>
fetch_file() {
  local dest=$1 url=$2
  mkdir -p "$(dirname "$dest")"
  if [ -f "$dest" ]; then
    return
  fi
  curl -fL --retry 3 -s -o "$dest" "$url"
}

# fetch_file_optional <dest_path> <url> — like fetch_file but silently skips if the server 404s.
fetch_file_optional() {
  local dest=$1 url=$2
  mkdir -p "$(dirname "$dest")"
  if [ -f "$dest" ]; then
    return
  fi
  curl -L --retry 3 -s --fail-with-body -o "$dest" "$url" || rm -f "$dest"
}

# fetch_tree <model_name> <base_url> <file_list...>
# Downloads a list of files (relative paths) from base_url into $DEST/<model_name>/
fetch_tree() {
  local name=$1 base=$2
  shift 2
  if [ -d "$DEST/$name" ] && [ -f "$DEST/$name/"*.model3.json ] 2>/dev/null; then
    echo "✔ $name already present — skipping"
    return
  fi
  echo "↓ $name ..."
  mkdir -p "$DEST/$name"
  for rel in "$@"; do
    fetch_file "$DEST/$name/$rel" "$base/$rel"
  done
  echo "✔ $name → $DEST/$name"
}

# ── Haru greeter t03 (kawan persona) ─────────────────────────────────────────
# Source: pixi-live2d-display@0.4.0 test assets on jsDelivr (pinned tag = same
# lib version we use). Idle motion group: "Idle". Expressions: f00–f07.
HARU_BASE="https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display@0.4.0/test/assets/haru"
fetch_tree haru "$HARU_BASE" \
  "haru_greeter_t03.model3.json" \
  "haru_greeter_t03.moc3" \
  "haru_greeter_t03.physics3.json" \
  "haru_greeter_t03.pose3.json" \
  "haru_greeter_t03.2048/texture_00.png" \
  "haru_greeter_t03.2048/texture_01.png" \
  "expressions/F01.exp3.json" \
  "expressions/F02.exp3.json" \
  "expressions/F03.exp3.json" \
  "expressions/F04.exp3.json" \
  "expressions/F05.exp3.json" \
  "expressions/F06.exp3.json" \
  "expressions/F07.exp3.json" \
  "expressions/F08.exp3.json" \
  "motion/haru_g_idle.motion3.json" \
  "motion/haru_g_m07.motion3.json" \
  "motion/haru_g_m15.motion3.json" \
  "motion/haru_g_m14.motion3.json" \
  "motion/haru_g_m05.motion3.json"
# cdi3.json (DisplayInfo) is referenced in the model3.json but absent from the jsDelivr tree;
# fetch optionally so the local model dir is complete when/if the file becomes available.
fetch_file_optional "$DEST/haru/haru_greeter_t03.cdi3.json" "$HARU_BASE/haru_greeter_t03.cdi3.json"

# ── Hiyori (adik persona) ─────────────────────────────────────────────────────
# Source: Live2D/CubismWebSamples develop branch on GitHub raw.
# Idle motion group: "Idle". No expressions folder (gracefully no-ops in registry).
HIYORI_BASE="https://raw.githubusercontent.com/Live2D/CubismWebSamples/develop/Samples/Resources/Hiyori"
fetch_tree hiyori "$HIYORI_BASE" \
  "Hiyori.model3.json" \
  "Hiyori.moc3" \
  "Hiyori.physics3.json" \
  "Hiyori.pose3.json" \
  "Hiyori.userdata3.json" \
  "Hiyori.cdi3.json" \
  "Hiyori.2048/texture_00.png" \
  "Hiyori.2048/texture_01.png" \
  "motions/Hiyori_m01.motion3.json" \
  "motions/Hiyori_m02.motion3.json" \
  "motions/Hiyori_m03.motion3.json" \
  "motions/Hiyori_m04.motion3.json" \
  "motions/Hiyori_m05.motion3.json" \
  "motions/Hiyori_m06.motion3.json" \
  "motions/Hiyori_m07.motion3.json" \
  "motions/Hiyori_m08.motion3.json" \
  "motions/Hiyori_m09.motion3.json" \
  "motions/Hiyori_m10.motion3.json"

# ── LiveroiD (cik_maid persona) ───────────────────────────────────────────────
# Cannot be scripted — BOOTH requires a logged-in account.
# Both A-Y01 and A-Y02 folders are required: Y01's expressions reference ../LiveroiD_A-Y02/*.
if [ ! -d "$DEST/liveroid" ] || [ -z "$(ls -A "$DEST/liveroid" 2>/dev/null)" ]; then
  cat << 'EOF'
○ liveroid — manual step required:
  1. Log in at https://booth.pm (free pixiv account)
  2. Open https://booth.pm/en/items/2685284 → add the 0-JPY item → checkout
  3. Download LiveroiD_A_1.2.zip from your BOOTH Library
  4. Unzip so that both LiveroiD_A-Y01/ and LiveroiD_A-Y02/ appear under frontend/public/models/liveroid/
  Credit required: #LiveroiD + "モデル制作：八城惺架 (@yashiro_seika)" (already in README).
EOF
else
  echo "✔ liveroid already present — skipping"
fi
