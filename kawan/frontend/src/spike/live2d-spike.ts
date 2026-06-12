/**
 * S3 Spike — Live2D render + WAV lip-sync proof of concept.
 *
 * Approach: hand-rolled WebAudio AnalyserNode → ParamMouthOpenY
 * (TR-08 canonical pattern, ~60 lines, no extra patch package).
 *
 * live2dcubismcore.min.js MUST be loaded via <script> tag before this module runs.
 */

import * as PIXI from 'pixi.js'
import { Live2DModel } from 'pixi-live2d-display/cubism4'

// Expose PIXI globally so pixi-live2d-display can find it
;(window as unknown as Record<string, unknown>).PIXI = PIXI

const MODEL_URL = '/models/haru/haru_greeter_pro_jp/runtime/haru_greeter_t05.model3.json'
const WAV_URL = '/spike/test.wav'
const STATUS_EL = document.getElementById('status') as HTMLElement
const PLAY_BTN = document.getElementById('play-btn') as HTMLButtonElement

function setStatus(msg: string): void {
  STATUS_EL.textContent = msg
  console.log('[spike]', msg)
}

async function init(): Promise<void> {
  setStatus('Initialising PixiJS…')

  const app = new PIXI.Application({
    view: document.getElementById('live2d-canvas') as HTMLCanvasElement,
    width: 600,
    height: 700,
    backgroundColor: 0x1a1a2e,
    antialias: true
  })

  setStatus('Loading model…')

  const model = await Live2DModel.from(MODEL_URL, {
    // idle group in this model is the "" (empty string) group
    idleMotionGroup: ''
  })

  app.stage.addChild(model as unknown as PIXI.DisplayObject)

  // Position model so the face is visible (anchor at top-centre of model bounds)
  model.x = app.screen.width / 2
  model.y = 60
  model.scale.set(0.24)
  model.anchor.set(0.5, 0)

  setStatus('Model loaded — idle playing. Click Play WAV to lip-sync.')
  PLAY_BTN.disabled = false

  // --- WebAudio analyser → ParamMouthOpenY ---
  PLAY_BTN.addEventListener('click', async () => {
    PLAY_BTN.disabled = true
    setStatus('Loading WAV…')

    const audioCtx = new AudioContext()
    const response = await fetch(WAV_URL)
    const arrayBuffer = await response.arrayBuffer()
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)

    const source = audioCtx.createBufferSource()
    source.buffer = audioBuffer

    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 512 // TR-08 spec
    source.connect(analyser)
    analyser.connect(audioCtx.destination)

    const freqData = new Uint8Array(analyser.frequencyBinCount)

    source.start()
    setStatus('Playing WAV — watch the mouth!')

    source.onended = () => {
      setStatus('Playback done. Model still rendering.')
      PLAY_BTN.disabled = false
    }

    // Drive ParamMouthOpenY from 85–255 Hz band peak energy (TR-08)
    const binHz = audioCtx.sampleRate / analyser.fftSize
    const lowBin = Math.floor(85 / binHz)
    const highBin = Math.ceil(255 / binHz)

    function driveMouth(): void {
      analyser.getByteFrequencyData(freqData)
      let peak = 0
      for (let i = lowBin; i <= highBin; i++) {
        if (freqData[i] > peak) peak = freqData[i]
      }
      // normalise 0..255 → 0..1, apply pow(x, 1.2) per TR-08
      const v = (peak / 255) ** 1.2
      model.internalModel.coreModel.setParameterValueById('ParamMouthOpenY', v)
      requestAnimationFrame(driveMouth)
    }
    driveMouth()
  })
}

init().catch((err) => {
  setStatus(`ERROR: ${err}`)
  console.error(err)
})
