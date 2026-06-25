// Model registry — maps each persona to its Live2D model config.
// url: served path under /models/ (gitignored; run scripts/download_models.sh to populate).
// idleMotionGroup: the motion group key used for idle animations (model-specific).
// scale: initial scale heuristic; resize() recomputes dynamically.
// expressionMap: maps TR-34 emotions to this model's expression names (null = graceful no-op).

import type { Emotion, Persona } from '../../types/api'

export interface ModelConfig {
  url: string
  idleMotionGroup: string
  scale: number
  // Vertical anchor passed to model.anchor.set(0.5, anchorY). Defaults to 0 (top-center)
  // when omitted — Haru/Hiyori frame correctly there. VTube-Studio models (LiveroiD) have
  // different drawable bounds and need a per-model override to frame head + upper body.
  anchorY?: number
  expressionMap: Record<Emotion, string | null>
}

export const modelRegistry: Record<Persona, ModelConfig> = {
  // kawan → Haru greeter t03 (pixi-live2d-display@0.4.0 test assets, jsDelivr)
  // Idle group: "Idle" (verified from haru_greeter_t03.model3.json).
  // Expressions f00–f07 map to F01–F08; tone choices are provisional — C4/redesign can refine.
  kawan: {
    url: '/models/haru/haru_greeter_t03.model3.json',
    idleMotionGroup: 'Idle',
    scale: 0.24,
    expressionMap: {
      neutral: 'f00',
      curious: 'f02',
      pleased: 'f04',
      skeptical: 'f01',
      concerned: 'f05',
      proud: 'f06'
    }
  },

  // adik → Hiyori (Live2D/CubismWebSamples develop branch)
  // Idle group: "Idle". Expressions authored in D4 (expressions/ folder, registered in model3.json).
  adik: {
    url: '/models/hiyori/Hiyori.model3.json',
    idleMotionGroup: 'Idle',
    scale: 0.2,
    expressionMap: {
      neutral: 'hiyori_neutral',
      curious: 'hiyori_curious',
      pleased: 'hiyori_pleased',
      skeptical: 'hiyori_skeptical',
      concerned: 'hiyori_concerned',
      proud: 'hiyori_proud'
    }
  },

  // cik_maid → LiveroiD Y01 (local — BOOTH download, gitignored).
  // Y01 expressions reference ../LiveroiD_A-Y02/ — both folders must be present.
  // Expressions: blush / browLink / cool / worried. Idle group guessed "Idle" (no motions in model3.json
  // — pixi-live2d-display falls back to auto-idle; empty string "" also acceptable here).
  cik_maid: {
    url: '/models/liveroid/LiveroiD_A-Y01/LiveroiD_A-Y01.model3.json',
    idleMotionGroup: '',
    scale: 0.11,
    anchorY: 0.24,
    expressionMap: {
      neutral: null,
      curious: 'browLink',
      pleased: 'blush',
      skeptical: 'cool',
      concerned: 'worried',
      proud: 'cool'
    }
  }
}
