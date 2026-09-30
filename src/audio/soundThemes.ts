import type { Settings, ThemeId } from '../store/settings'
import type { LayerKind } from './layers'

export interface LayerDef {
  id: LayerKind
  label: string
  /** Default volume 0..1. */
  def: number
}

export const SOUND_THEMES: Record<ThemeId, LayerDef[]> = {
  pluie: [
    { id: 'rain', label: 'Pluie fine', def: 0.7 },
    { id: 'drops', label: 'Gouttes sur la vitre', def: 0.45 },
    { id: 'thunder', label: 'Tonnerre lointain', def: 0 },
  ],
  cheminee: [
    { id: 'crackle', label: 'Crépitement', def: 0.7 },
    { id: 'roar', label: 'Souffle du feu', def: 0.5 },
    { id: 'rainOut', label: 'Pluie dehors', def: 0 },
  ],
  foret: [
    { id: 'wind', label: 'Vent dans les feuilles', def: 0.5 },
    { id: 'birds', label: 'Oiseaux', def: 0.45 },
    { id: 'stream', label: 'Ruisseau', def: 0.3 },
  ],
  mer: [
    { id: 'waves', label: 'Vagues', def: 0.75 },
    { id: 'foam', label: 'Écume', def: 0.35 },
    { id: 'wind', label: 'Vent du large', def: 0.2 },
  ],
  cafe: [
    { id: 'murmur', label: 'Brouhaha', def: 0.55 },
    { id: 'clinks', label: 'Tasses et couverts', def: 0.4 },
    { id: 'espresso', label: 'Machine à café', def: 0.3 },
    { id: 'rainOut', label: 'Pluie dehors', def: 0 },
  ],
  soiree: [
    { id: 'rainLight', label: 'Pluie sur la vitre', def: 0.5 },
    { id: 'drops', label: 'Gouttes', def: 0.3 },
    { id: 'city', label: 'Rumeur de la ville', def: 0.35 },
    { id: 'pad', label: 'Nappe synthwave', def: 0.3 },
    { id: 'brown', label: 'Bruit brun', def: 0 },
  ],
}

/** Effective layer volumes for a theme: user mix over defaults. */
export function mixFor(theme: ThemeId, mixes: Settings['mixes']): Record<string, number> {
  const user = mixes[theme] ?? {}
  return Object.fromEntries(SOUND_THEMES[theme].map((l) => [l.id, user[l.id] ?? l.def]))
}
