/**
 * Live2DStage — vanilla TS controller (TR-07).
 * No React dependency. Owns the PixiJS Application + Live2D model lifecycle.
 * React host (Live2DStageView.tsx) calls mount(), exposes the handle, and calls destroy() on unmount.
 *
 * Spike gotcha 2: window.PIXI MUST be assigned before importing pixi-live2d-display.
 * The import is top-level here, so the assignment must also be top-level, before the import.
 * We achieve this by putting the assignment in the same module and relying on the fact that
 * TS top-level statements execute in order before any exports are consumed.
 */

import * as PIXI from 'pixi.js'

// Expose PIXI globally before pixi-live2d-display resolves (spike gotcha 2).
// pixi-live2d-display reads window.PIXI at import time to patch the display object prototype.
;(window as unknown as Record<string, unknown>).PIXI = PIXI

// Import AFTER the global assignment — import order matters here.
import { Live2DModel } from 'pixi-live2d-display/cubism4'

/** Minimal interface into CubismModel that we use for lip-sync (TR-08). */
interface CubismCoreModel {
  setParameterValueById(id: string, value: number, weight?: number): void
}

export interface MountOptions {
  url: string
  idleMotionGroup: string
  scale: number
}

export class Live2DStage {
  private app: PIXI.Application | null = null
  private model: Live2DModel | null = null
  private rafId: number | null = null
  private audioCtx: AudioContext | null = null
  private audioSource: AudioBufferSourceNode | null = null

  /**
   * Mount: create a PixiJS v6 Application on the given canvas, load the Live2D model, and start idle.
   * Throws if the model fails to load — caller should catch and fall back to the placeholder.
   */
  async mount(canvas: HTMLCanvasElement, opts: MountOptions): Promise<void> {
    const { width, height } = canvas.getBoundingClientRect()
    const w = Math.max(width, 1)
    const h = Math.max(height, 1)

    // PixiJS v6 Application constructor (not async; v7/v8 pattern would be app.init() — do NOT use).
    this.app = new PIXI.Application({
      view: canvas,
      width: w,
      height: h,
      backgroundColor: 0x00000000,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1
    })

    const model = await Live2DModel.from(opts.url, {
      idleMotionGroup: opts.idleMotionGroup,
      // Silence the ticker auto-registration warning when no global PIXI.Ticker is registered;
      // we drive updates via the Pixi app's own ticker.
      autoUpdate: true
    })

    this.model = model
    // Add model to stage — cast required: pixi-live2d-display's Container is not identical to
    // PIXI.DisplayObject at the type level in this TS config (spike pattern).
    this.app.stage.addChild(model as unknown as PIXI.DisplayObject)

    model.anchor.set(0.5, 0)
    this._baseScale = opts.scale
    this._fit(w, h, opts.scale)
  }

  /** Set an expression by name. null or missing → graceful no-op. */
  setExpression(name: string | null): void {
    if (this.model == null || name == null) return
    // model.expression() returns a Promise<boolean>; we void it — no throw on failure.
    void this.model.expression(name).catch(() => {
      // expression not found on this model — no-op per TR-09 graceful degradation
    })
  }

  /** Play a named motion group (event triggers: greeting, celebration). */
  playMotion(group: string, index?: number): void {
    if (this.model == null) return
    void this.model.motion(group, index).catch(() => {
      // unknown group — no-op
    })
  }

  /**
   * Speak: play an AudioBuffer or ArrayBuffer through WebAudio, driving lip-sync via
   * an AnalyserNode → ParamMouthOpenY (TR-08).
   *
   * LANE D SEAM: real TTS audio (Piper WAV / WS audio chunks) plugs in here.
   * Pass ArrayBuffer (raw WAV bytes from fetch / WS) or pre-decoded AudioBuffer.
   * No other change is required when Lane D TTS arrives — this is the exact swap point (TR-56).
   */
  async speak(source: ArrayBuffer | AudioBuffer): Promise<void> {
    // Clean up any previous playback
    this.stopSpeaking()

    const audioCtx = new AudioContext()
    this.audioCtx = audioCtx

    const audioBuffer = source instanceof AudioBuffer ? source : await audioCtx.decodeAudioData(source)

    const bufferSource = audioCtx.createBufferSource()
    bufferSource.buffer = audioBuffer
    this.audioSource = bufferSource

    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 512 // TR-08 spec

    bufferSource.connect(analyser)
    analyser.connect(audioCtx.destination)

    // TR-08: peak energy in 85–255 Hz band drives ParamMouthOpenY
    const binHz = audioCtx.sampleRate / analyser.fftSize
    const lowBin = Math.floor(85 / binHz)
    const highBin = Math.ceil(255 / binHz)
    const freqData = new Uint8Array(analyser.frequencyBinCount)

    const driveMouth = () => {
      if (this.rafId == null) return // stopped
      analyser.getByteFrequencyData(freqData)
      let peak = 0
      for (let i = lowBin; i <= highBin; i++) {
        if (freqData[i] > peak) peak = freqData[i]
      }
      // normalise 0..255 → 0..1, apply pow(x, 1.2) per TR-08
      const v = (peak / 255) ** 1.2
      this._setMouthParam(v)
      this.rafId = requestAnimationFrame(driveMouth)
    }

    bufferSource.start()

    return new Promise<void>((resolve) => {
      bufferSource.onended = () => {
        this._clearMouthRaf()
        this._setMouthParam(0)
        resolve()
      }
      this.rafId = requestAnimationFrame(driveMouth)
    })
  }

  /** Stop any in-progress speak() and reset the mouth. */
  stopSpeaking(): void {
    this._clearMouthRaf()
    if (this.audioSource != null) {
      try {
        this.audioSource.stop()
      } catch {
        // already ended
      }
      this.audioSource = null
    }
    if (this.audioCtx != null) {
      void this.audioCtx.close()
      this.audioCtx = null
    }
    this._setMouthParam(0)
  }

  /**
   * Resize: called by the React host via ResizeObserver when the container box changes.
   * Recenters the model and recomputes a scale so the face/upper body stays visible.
   */
  resize(w: number, h: number): void {
    if (this.app == null || this.model == null) return
    this.app.renderer.resize(w, h)
    // Use the per-persona base scale captured at mount via _fit; fall back to _lastScale only
    // if mount hasn't run yet (should not happen in practice — resize follows mount).
    const config = this._baseScale ?? this._lastScale ?? 0.24
    this._fit(w, h, config)
  }

  /** Destroy: cancel lip-sync rAF, close AudioContext, destroy PixiJS app + WebGL context. */
  destroy(): void {
    this.stopSpeaking()
    if (this.app != null) {
      // app.destroy(removeView, stageOptions) — true removes the canvas; children destroyed too.
      this.app.destroy(false, { children: true })
      this.app = null
    }
    this.model = null
    this._baseScale = null
    this._lastScale = null
  }

  // ── private helpers ──────────────────────────────────────────────────────────

  private _lastScale: number | null = null
  // Per-persona base scale from mount options — sourced from modelRegistry so resize()
  // never falls back to a hardcoded Haru-specific literal (QA fix).
  private _baseScale: number | null = null

  private _fit(w: number, h: number, baseScale: number): void {
    if (this.model == null) return
    this._lastScale = baseScale
    // Scale model to container height: a heuristic so the face/upper body fills the area.
    // containerHeight * baseScale keeps proportions when the window resizes.
    const scale = (h * baseScale) / 600 // 600 is the reference height from the spike
    this.model.scale.set(scale)
    this.model.x = w / 2
    this.model.y = h * 0.05 // small top padding so the top of the head isn't clipped
    this.model.anchor.set(0.5, 0)
  }

  private _setMouthParam(v: number): void {
    if (this.model == null) return
    // coreModel is typed as `object` on InternalModel; cast to the Cubism4 shape we know.
    // This mirrors the spike's as-unknown-as pattern and is safe for all three of our models
    // (all expose ParamMouthOpenY in their LipSync group per model3.json inspection).
    const core = this.model.internalModel.coreModel as unknown as CubismCoreModel
    try {
      core.setParameterValueById('ParamMouthOpenY', v)
    } catch {
      // model not ready yet — ignore
    }
  }

  private _clearMouthRaf(): void {
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }
}
