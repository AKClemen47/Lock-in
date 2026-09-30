import type { ThemeId } from '../store/settings'

export interface ThemeDef {
  id: ThemeId
  name: string
  emoji: string
  blurb: string
  /** Accent colour for buttons and progress, readable with dark text. */
  accent: string
  /** Looping muted video in public/ambiences/. */
  video: string
  /** First frame: shown while loading, when paused (economy, reduced motion) and offline. */
  poster: string
  credit: string
}

const media = (id: ThemeId) => `${import.meta.env.BASE_URL}ambiences/${id}`

const theme = (id: ThemeId, def: Omit<ThemeDef, 'id' | 'video' | 'poster'>): ThemeDef => ({
  id,
  video: `${media(id)}.mp4`,
  poster: `${media(id)}.jpg`,
  ...def,
})

// Videos: Pexels and Pixabay free licences (attribution not required, given anyway).
export const THEMES: ThemeDef[] = [
  theme('pluie', { name: 'Pluie sur la fenêtre', emoji: '🌧️', blurb: 'Gouttes qui glissent sur la vitre, lumières floues.', accent: '#8cc8ff', credit: 'Phil Desforges · Pexels' }),
  theme('cheminee', { name: 'Feu de cheminée', emoji: '🔥', blurb: 'Flammes vives et braises qui rougeoient.', accent: '#ffab66', credit: 'IslandHopper X · Pexels' }),
  theme('foret', { name: 'Forêt ensoleillée', emoji: '🌲', blurb: 'Rayons de soleil entre les grands arbres.', accent: '#a8e6a1', credit: 'Saulo Nulo · Pexels' }),
  theme('mer', { name: 'Mer au coucher du soleil', emoji: '🌊', blurb: 'Vagues lentes sous un ciel orangé.', accent: '#ffb4a2', credit: 'John Biondo · Pexels' }),
  theme('cafe', { name: 'Café cosy', emoji: '☕', blurb: 'Petite salle verte, lampes chaudes.', accent: '#e8c48f', credit: 'Oleksandr Plakhota · Pexels' }),
  theme('soiree', { name: 'Soirée studieuse', emoji: '🌃', blurb: 'Pluie sur la vitre, ville néon la nuit.', accent: '#ff9ad5', credit: 'Turning_Pages · Pixabay' }),
]

export const themeById = (id: ThemeId) => THEMES.find((t) => t.id === id) ?? THEMES[0]
