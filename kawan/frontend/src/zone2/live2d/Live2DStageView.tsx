// Live2DStageView — React host for the vanilla Live2DStage controller (TR-07).
// Owns mount/unmount lifecycle, ResizeObserver for responsive canvas, and imperative handle.

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Emotion, Persona } from '../../types/api'
import { CharacterStagePlaceholder } from '../CharacterStagePlaceholder'
import { Live2DStage } from './Live2DStage'
import { modelRegistry } from './modelRegistry'

export interface Live2DStageHandle {
  setExpression: (emotion: Emotion) => void
  speak: (source: ArrayBuffer | AudioBuffer) => Promise<void>
  stopSpeaking: () => void
  playMotion: (group: string, index?: number) => void
}

interface Props {
  persona: Persona
}

export const Live2DStageView = forwardRef<Live2DStageHandle, Props>(function Live2DStageView({ persona }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<Live2DStage | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

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
    // Reset load-failed state at the top so a persona change always re-attempts the load
    // (if left set, a previously failed load would strand the stage on the placeholder forever).
    setLoadFailed(false)

    const canvas = canvasRef.current
    if (canvas == null) return

    const stage = new Live2DStage()
    stageRef.current = stage
    const config = modelRegistry[persona]

    stage
      .mount(canvas, {
        url: config.url,
        idleMotionGroup: config.idleMotionGroup,
        scale: config.scale
      })
      .catch((err: unknown) => {
        // Model missing on disk or network error — show the placeholder fallback (Q2).
        console.warn('[Live2DStageView] model load failed for persona', persona, err)
        setLoadFailed(true)
      })

    // ResizeObserver keeps the canvas fitted to its container (responsive, TR-06).
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry == null) return
      const { width, height } = entry.contentRect
      stage.resize(Math.max(width, 1), Math.max(height, 1))
    })
    if (canvas.parentElement != null) {
      observer.observe(canvas.parentElement)
    }

    return () => {
      observer.disconnect()
      stage.destroy()
      stageRef.current = null
    }
  }, [persona])

  // Always render the canvas so React never unmounts it across persona changes — unmounting
  // the canvas element destroys the WebGL context and strands the stage permanently on the
  // placeholder if a load fails. The placeholder is rendered as an overlay on top when needed.
  return (
    <>
      <canvas ref={canvasRef} className="live2d-canvas" aria-label={`${persona} Live2D character stage`} />
      {loadFailed && (
        // Graceful fallback overlay: keeps the labeled placeholder visible on load failure (Q8).
        <CharacterStagePlaceholder />
      )}
    </>
  )
})
