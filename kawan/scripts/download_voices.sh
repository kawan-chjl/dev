#!/usr/bin/env bash
# download_voices.sh — fetch the three Piper persona voice models from Hugging Face.
#
# Voices chosen (backend single source of truth; see app/routes/voice.py):
#   kawan    → en_US-lessac-medium   (warm, measured)
#   adik     → en_US-libritts-high   (lighter, higher pitch)
#   cik_maid → en_GB-alba-medium     (brisker, playful British accent)
#
# Output dir: kawan/backend/voices/  (gitignored)
# Override via: KAWAN_PIPER_VOICES_DIR=/path/to/dir ./download_voices.sh
#
# After downloading, install piper-tts:
#   cd kawan/backend && uv add piper-tts
# Then set KAWAN_PIPER_VOICES_DIR in kawan/.env (or leave blank to use the default).
#
# Source: https://huggingface.co/rhasspy/piper-voices

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
VOICES_DIR="${KAWAN_PIPER_VOICES_DIR:-${REPO_ROOT}/kawan/backend/voices}"
HF_BASE="https://huggingface.co/rhasspy/piper-voices/resolve/main"

mkdir -p "${VOICES_DIR}"

fetch_voice() {
    local voice_name="$1"
    local hf_path="$2"  # path under /resolve/main/ on HF
    local onnx="${VOICES_DIR}/${voice_name}.onnx"
    local conf="${VOICES_DIR}/${voice_name}.onnx.json"

    if [[ -f "${onnx}" && -f "${conf}" ]]; then
        echo "  already present: ${voice_name}"
        return
    fi

    echo "  downloading ${voice_name} ..."
    curl -fL --progress-bar -o "${onnx}" "${HF_BASE}/${hf_path}/${voice_name}.onnx"
    curl -fL --progress-bar -o "${conf}" "${HF_BASE}/${hf_path}/${voice_name}.onnx.json"
    echo "  done: ${voice_name}"
}

echo "Piper voice download → ${VOICES_DIR}"
echo ""

# en_US/lessac/medium/
fetch_voice "en_US-lessac-medium"  "en/en_US/lessac/medium"
# en_US/libritts/high/
fetch_voice "en_US-libritts-high"  "en/en_US/libritts/high"
# en_GB/alba/medium/
fetch_voice "en_GB-alba-medium"    "en/en_GB/alba/medium"

echo ""
echo "All voices ready in ${VOICES_DIR}"
echo ""
echo "Next steps:"
echo "  1. Install piper-tts (optional dep, local only):"
echo "       cd kawan/backend && uv add piper-tts"
echo "  2. Add to kawan/.env:"
echo "       KAWAN_PIPER_VOICES_DIR=${VOICES_DIR}"
echo "  3. Start the backend: cd kawan/backend && uv run uvicorn app.main:app --reload"
