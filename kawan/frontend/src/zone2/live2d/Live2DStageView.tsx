// Live2DStageView — React host for the vanilla Live2DStage controller (TR-07).
// Owns mount/unmount lifecycle, ResizeObserver for responsive canvas, and imperative handle.
//
// Canvas-ownership strategy: Pixi creates and owns the <canvas> (no `view` option in Live2DStage).
// React owns only a persistent container <div>. On every effect run, mount() appends a fresh
// Pixi-owned <canvas> into the container; destroy() removes it. This guarantees a virgin WebGL
// context on each mount — surviving React StrictMode's double-mount and persona switches — because
// a new canvas element is created every time, never reusing a context-poisoned one.

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Emotion, Persona } from '../../types/api'
import { CharacterStagePlaceholder } from '../CharacterStagePlaceholder'
import type { WebSpeechPrefs } from '../voice/personaVoices'
import { Live2DStage } from './Live2DStage'
import { modelRegistry } from './modelRegistry'

export interface Live2DStageHandle {
  setExpression: (emotion: Emotion) => void
  speak: (source: ArrayBuffer | AudioBuffer) => Promise<void>
  speakText: (text: string, prefs: WebSpeechPrefs) => Promise<void>
  stopSpeaking: () => void
  playMotion: (group: string, index?: number) => void
}

interface Props {
  persona: Persona
  // Fires once the model has settled (loaded or failed) so a host can drop a loading overlay.
  onReady?: () => void
}

export const Live2DStageView = forwardRef<Live2DStageHandle, Props>(function Live2DStageView(
  { persona, onReady },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Live2DStage | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  // Keep the latest onReady in a ref so the mount effect (keyed on persona only) never re-runs
  // when the parent passes a fresh callback identity, which would needlessly remount the stage.
  const onReadyRef = useRef(onReady)
  useEffect(() => {
    onReadyRef.current = onReady
  }, [onReady])

  // Expose the imperative handle so WorkspaceLayout/StageMode can call expression/speak/motion.
  useImperativeHandle(
    ref,
    () => ({
      setExpression(emotion: Emotion) {
        const config = modelRegistry[persona]
        const exprName = config.expressionMap[emotion]
        stageRef.current?.setExpression(exprName)
      },
      speak(source: ArrayBuffer | AudioBuffer) {
        return stageRef.current?.speak(source) ?? Promise.resolve()
      },
      speakText(text: string, prefs: WebSpeechPrefs) {
        return stageRef.current?.speakText(text, prefs) ?? Promise.resolve()
      },
      stopSpeaking() {
        stageRef.current?.stopSpeaking()
      },
      playMotion(group: string, index?: number) {
        stageRef.current?.playMotion(group, index)
      }
    }),
    [persona]
  )

  // Mount/unmount the Live2DStage whenever persona changes (or on first mount).
  useEffect(() => {
    // Reset load-failed state so a persona change always re-attempts the load.
    setLoadFailed(false)

    const container = containerRef.current
    if (container == null) return

    let cancelled = false

    const stage = new Live2DStage()
    stageRef.current = stage
    const config = modelRegistry[persona]

    stage
      .mount(container, {
        url: config.url,
        idleMotionGroup: config.idleMotionGroup,
        scale: config.scale,
        anchorY: config.anchorY
      })
      .then(() => {
        if (cancelled) return
        onReadyRef.current?.()
      })
      .catch((err: unknown) => {
        // Stale promise from a torn-down effect (StrictMode discard) — do not update state.
        if (cancelled) return
        // Model missing on disk or renderer init failed — show the placeholder fallback (Q2).
        console.warn('[Live2DStageView] model load failed for persona', persona, err)
        setLoadFailed(true)
        // Still settle the host loader so it doesn't spin forever; the placeholder takes over.
        onReadyRef.current?.()
      })

    // ResizeObserver keeps the canvas fitted to its container (responsive, TR-06).
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry == null) return
      const { width, height } = entry.contentRect
      stage.resize(Math.max(width, 1), Math.max(height, 1))
    })
    observer.observe(container)

    return () => {
      cancelled = true
      observer.disconnect()
      stage.destroy()
      stageRef.current = null
    }
  }, [persona])

  // Render a persistent container <div>. Pixi appends/removes its own <canvas> inside it on
  // each mount/destroy cycle — React never touches the canvas element directly.
  // The placeholder is an overlay sibling; the container stays mounted so the ResizeObserver
  // target always exists.
  return (
    <>
      <div ref={containerRef} className="live2d-stage-container" aria-hidden="true" />
      {loadFailed && (
        // Graceful fallback overlay: keeps the labeled placeholder visible on load failure (Q8).
        <CharacterStagePlaceholder />
      )}
    </>
  )
})
