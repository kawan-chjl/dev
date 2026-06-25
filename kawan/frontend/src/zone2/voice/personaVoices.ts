// personaVoices.ts — WebSpeech fallback voice preferences per persona.
// The Piper voice id is chosen server-side (app/routes/voice.py is the single source of truth).
// This file holds only the browser SpeechSynthesis prefs used when Piper is unavailable.

import type { Persona } from '../../types/api'

export interface WebSpeechPrefs {
  lang: string
  /** Preferred SpeechSynthesisVoice names, tried in order (first match wins). */
  voiceNamePref: string[]
  pitch: number
  rate: number
}

export const personaVoices: Record<Persona, WebSpeechPrefs> = {
  // Kawan: warm, measured — en-US, slightly lower pitch, moderate rate
  kawan: {
    lang: 'en-US',
    voiceNamePref: ['Google US English', 'Microsoft David', 'Alex', 'en-US'],
    pitch: 0.9,
    rate: 0.95
  },
  // Adik: gentle, higher-pitched — en-US, softer
  adik: {
    lang: 'en-US',
    voiceNamePref: ['Google US English Female', 'Microsoft Zira', 'Samantha', 'en-US'],
    pitch: 1.15,
    rate: 0.9
  },
  // Cik Maid: brisk, playful — en-GB preferred
  cik_maid: {
    lang: 'en-GB',
    voiceNamePref: ['Google UK English Female', 'Microsoft Hazel', 'Daniel', 'en-GB'],
    pitch: 1.05,
    rate: 1.1
  }
}
