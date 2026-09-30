import type { ThemeId } from '../store/settings'

export interface ThemeDef {
  id: ThemeId
  name: string
  /** One word, for tight spaces (sound picker). */
  short: string
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
  theme('zen', { name: 'Misty zen garden', short: 'Zen', emoji: '🎋', blurb: 'Bamboo, stone lanterns and slow mist.', accent: '#9fe0c8', credit: 'kanenori · Pixabay' }),
  theme('train', { name: 'Train at dusk', short: 'Train', emoji: '🚆', blurb: 'Countryside drifting past the window.', accent: '#c7b8ff', credit: 'variousphotography · Pixabay' }),
  theme('ocean', { name: 'Kelp forest', short: 'Ocean', emoji: '🫧', blurb: 'Deep blue water, swaying kelp and rays of light.', accent: '#8cc8ff', credit: 'Jackdrafahl · Pixabay' }),
  theme('cheminee', { name: 'Fireplace', short: 'Fire', emoji: '🔥', blurb: 'Bright flames and glowing embers.', accent: '#ffab66', credit: 'IslandHopper X · Pexels' }),
  theme('foret', { name: 'Sunlit forest', short: 'Forest', emoji: '🌲', blurb: 'Sunbeams between tall trees.', accent: '#a8e6a1', credit: 'Saulo Nulo · Pexels' }),
  theme('mer', { name: 'Sunset sea', short: 'Sea', emoji: '🌊', blurb: 'Slow waves under an orange sky.', accent: '#ffb4a2', credit: 'John Biondo · Pexels' }),
  theme('cafe', { name: 'Cosy café', short: 'Café', emoji: '☕', blurb: 'Small green room, warm lamps.', accent: '#e8c48f', credit: 'Oleksandr Plakhota · Pexels' }),
  theme('soiree', { name: 'Late-night study', short: 'Night', emoji: '🌃', blurb: 'Rain on the window, neon city at night.', accent: '#ff9ad5', credit: 'Turning_Pages · Pixabay' }),
]

export const themeById = (id: ThemeId) => THEMES.find((t) => t.id === id) ?? THEMES[0]
