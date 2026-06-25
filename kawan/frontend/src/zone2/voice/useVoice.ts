// useVoice.ts — single seam for companion voice output.
//
// speakLine(stage, text, persona):
//   1. POST /api/voice/tts {text, persona} (credentials: 'include')
//      On 200 audio/wav → arrayBuffer → stage.speak(arrayBuffer) (locked TR-08 analyser, real lip-sync)
//      On 204 / fetch failure / MOCK_AUTH → fall back to stage.speakText(text, persona) (WebSpeech)
//
// MOCK_AUTH: no-op resolve (no fetch, no audio — headless/CI safe).
// Browser lacks SpeechSynthesis: speakText resolves immediately (no throw).

import type { Persona } from '../../types/api'
import type { Live2DStageHandle } from '../live2d/Live2DStageView'
import { personaVoices } from './personaVoices'

const MOCK_AUTH = import.meta.env.VITE_USE_MOCK_AUTH === 'true'

/** The single call-site for companion voice. Returns a Promise that resolves when done (or on error). */
export async function speakLine(stage: Live2DStageHandle | null, text: string, persona: Persona): Promise<void> {
  if (stage == null || !text.trim()) return

  // No-op in mock/headless mode
  if (MOCK_AUTH) return

  try {
    const res = await fetch('/api/voice/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ text, persona })
    })

    if (res.ok && res.status === 200) {
      // Piper primary path: feed WAV bytes into the locked TR-08 analyser → real amplitude lip-sync
      const arrayBuffer = await res.arrayBuffer()
      if (arrayBuffer.byteLength > 0) {
        await stage.speak(arrayBuffer)
        return
      }
    }
    // 204 or empty body → fall through to WebSpeech fallback
  } catch {
    // Network error / backend down → fall through to WebSpeech fallback
  }

  // WebSpeech fallback (no-infra, browser-native)
  await stage.speakText(text, personaVoices[persona])
}
