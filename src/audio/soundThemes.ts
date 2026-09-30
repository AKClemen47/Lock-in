import type { Settings, ThemeId } from '../store/settings'
import type { LayerKind } from './layers'

export interface LayerDef {
  id: LayerKind
  label: string
  /** Default volume 0..1. */
  def: number
}

export const SOUND_THEMES: Record<ThemeId, LayerDef[]> = {
  zen: [
    { id: 'fountainRec', label: 'Water basin (recorded)', def: 0.55 },
    { id: 'chimesRec', label: 'Wind chimes (recorded)', def: 0.45 },
    { id: 'wind', label: 'Light breeze', def: 0.3 },
    { id: 'drip', label: 'Sparse drops', def: 0.5 },
  ],
  train: [
    { id: 'trainRec', label: 'Train ride (recorded)', def: 0.85 },
    { id: 'rails', label: 'Rails', def: 0.45 },
    { id: 'hum', label: 'Soft hum', def: 0.5 },
    { id: 'rainOut', label: 'Rain outside', def: 0 },
  ],
  ocean: [
    { id: 'deep', label: 'Deep drone', def: 0.7 },
    { id: 'current', label: 'Slow current', def: 0.35 },
    { id: 'bloops', label: 'Rare bubbles', def: 0.5 },
  ],
  cheminee: [
    { id: 'fireRec', label: 'Wood fire (recorded)', def: 0.85 },
    { id: 'crackle', label: 'Crackling', def: 0.7 },
    { id: 'roar', label: 'Roar of the fire', def: 0.5 },
    { id: 'rainOut', label: 'Rain outside', def: 0 },
  ],
  foret: [
    { id: 'forestRec', label: 'Forest (recorded)', def: 0.85 },
    { id: 'wind', label: 'Wind in the leaves', def: 0.5 },
    { id: 'birds', label: 'Birds', def: 0.45 },
    { id: 'stream', label: 'Stream', def: 0.3 },
  ],
  mer: [
    { id: 'wavesRec', label: 'Waves (recorded)', def: 0.85 },
    { id: 'waves', label: 'Waves', def: 0.75 },
    { id: 'foam', label: 'Foam', def: 0.35 },
    { id: 'wind', label: 'Sea breeze', def: 0.2 },
  ],
  cafe: [
    { id: 'cafeRec', label: 'Café room (recorded)', def: 0.85 },
    { id: 'murmur', label: 'Chatter', def: 0.55 },
    { id: 'clinks', label: 'Cups and cutlery', def: 0.4 },
    { id: 'espresso', label: 'Coffee machine', def: 0.3 },
    { id: 'rainOut', label: 'Rain outside', def: 0 },
  ],
  soiree: [
    { id: 'rainRec', label: 'Rain on the window (recorded)', def: 0.6 },
    { id: 'rainLight', label: 'Rain on the window', def: 0.5 },
    { id: 'drops', label: 'Drops', def: 0.3 },
    { id: 'city', label: 'City hum', def: 0.35 },
    { id: 'pad', label: 'Synthwave pad', def: 0.3 },
    { id: 'brown', label: 'Brown noise', def: 0 },
  ],
}

/** Loudness make-up per theme, measured so every default mix plays at about the same level (≈ −12 dB RMS; recordings are levelled at −24 dB). */
export const THEME_GAIN: Record<ThemeId, number> = { zen: 9.5, train: 3.5, ocean: 2.6, cheminee: 3.7, foret: 4.8, mer: 2.3, cafe: 4.8, soiree: 7.5 }

/** Effective layer volumes for a theme: user mix over defaults. */
export function mixFor(theme: ThemeId, mixes: Settings['mixes']): Record<string, number> {
  const user = mixes[theme] ?? {}
  return Object.fromEntries(SOUND_THEMES[theme].map((l) => [l.id, user[l.id] ?? l.def]))
}
