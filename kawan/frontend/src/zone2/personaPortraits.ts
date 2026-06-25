// personaPortraits.ts — single source of persona portrait paths.
// Haru/Hiyori use the prepared head-to-torso JPEGs (Vite-fingerprinted imports).
// LiveroiD keeps its bundled icon from the public models directory.

import adikPortrait from '../assets/personas/adik.jpg'
import kawanPortrait from '../assets/personas/kawan.jpg'
import type { Persona } from '../types/api'

export const PERSONA_PORTRAITS: Record<Persona, string> = {
  kawan: kawanPortrait,
  adik: adikPortrait,
  cik_maid: '/models/liveroid/LiveroiD_A-Y01/ico_LiveroiD_A-Y01.png'
}
