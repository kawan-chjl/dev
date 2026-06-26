// useSpeechInput.ts — WebSpeech SpeechRecognition capture hook.
//
// Exposes: { supported, listening, transcript, start, stop }
//
// MOCK_AUTH or unsupported browser (Firefox, Safari < 16.4) → supported=false, mic renders disabled.
// No instantiation under MOCK_AUTH or when the API is absent — headless/CI safe.

import { useCallback, useEffect, useRef, useState } from 'react'

const MOCK_AUTH = import.meta.env.VITE_USE_MOCK_AUTH === 'true'

// SpeechRecognition is not in the TS DOM lib as a global type; use the window-cast pattern.
interface SRConstructor {
  new (): SRInstance
}
interface SRInstance {
  continuous: boolean
  interimResults: boolean
  lang: string
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  onresult: ((event: SREvent) => void) | null
  start(): void
  stop(): void
  abort(): void
}
interface SREvent {
  resultIndex: number
  results: SRResultList
}
interface SRResultList {
  length: number
  [index: number]: SRResult
}
interface SRResult {
  isFinal: boolean
  [index: number]: { transcript: string }
}

function getSpeechRecognition(): SRConstructor | null {
  if (MOCK_AUTH) return null
  if (typeof window === 'undefined') return null
  const w = window as unknown as Record<string, unknown>
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as SRConstructor | null
}

export interface SpeechInputState {
  supported: boolean
  listening: boolean
  transcript: string
  start: () => void
  stop: () => void
  clearTranscript: () => void
}

export function useSpeechInput(): SpeechInputState {
  const SR = getSpeechRecognition()
  const supported = SR != null

  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recRef = useRef<SRInstance | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recRef.current?.abort()
    }
  }, [])

  const start = useCallback(() => {
    if (!SR || listening) return

    const rec = new SR()
    recRef.current = rec
    rec.continuous = false
    rec.interimResults = true
    rec.lang = 'en-US'

    rec.onstart = () => setListening(true)

    rec.onresult = (event: SREvent) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          final += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }
      setTranscript(final || interim)
    }

    rec.onend = () => {
      setListening(false)
      recRef.current = null
    }

    rec.onerror = () => {
      setListening(false)
      recRef.current = null
    }

    try {
      rec.start()
    } catch {
      setListening(false)
      recRef.current = null
    }
  }, [SR, listening])

  const stop = useCallback(() => {
    recRef.current?.stop()
    setListening(false)
    recRef.current = null
  }, [])

  const clearTranscript = useCallback(() => setTranscript(''), [])

  return { supported, listening, transcript, start, stop, clearTranscript }
}
