import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Durations } from '../lib/timerMachine'

export const THEME_IDS = ['pluie', 'cheminee', 'foret', 'mer', 'cafe', 'soiree'] as const
export type ThemeId = (typeof THEME_IDS)[number]
export type ChimeStyle = 'cloche' | 'carillon' | 'bol'
export type BreakBehavior = 'continue' | 'lower' | 'stop'

export interface Settings {
  durations: Durations
  /** Continuous mode: chain phases automatically. */
  autoStartBreaks: boolean
  autoStartFocus: boolean
  dailyGoal: number
  visualTheme: ThemeId
  soundTheme: ThemeId
  /** Picking a background also picks its matching sound. */
  linkSound: boolean
  favorites: ThemeId[]
  /** themeId → layerId → volume 0..1 (missing = theme default). */
  mixes: Partial<Record<ThemeId, Record<string, number>>>
  volumes: { master: number; ambience: number; music: number; notif: number }
  muted: boolean
  alertsThroughMute: boolean
  autoAmbience: boolean
  breakBehavior: BreakBehavior
  chime: ChimeStyle
  tick: boolean
  musicEnabled: boolean
  /** Readability veil behind the UI, 0..0.8. */
  scrim: number
  economy: boolean
  bgMode: 'always' | 'focus'
  colorMode: 'dark' | 'light' | 'system'
  wakeLock: boolean
  autoFullscreen: boolean
  showTaskInFocus: boolean
  strictPlant: boolean
  celebrate: boolean
  notify: boolean
  streakMinutes: number
  dayStartHour: number
  onboarded: boolean
  lastBackupAt: number | null
}

export const DEFAULT_SETTINGS: Settings = {
  durations: { focus: 25, short: 5, long: 15, longEvery: 4 },
  autoStartBreaks: false,
  autoStartFocus: false,
  dailyGoal: 8,
  visualTheme: 'pluie',
  soundTheme: 'pluie',
  linkSound: true,
  favorites: [],
  mixes: {},
  volumes: { master: 0.8, ambience: 0.7, music: 0.5, notif: 0.8 },
  muted: false,
  alertsThroughMute: true,
  autoAmbience: true,
  breakBehavior: 'continue',
  chime: 'cloche',
  tick: false,
  musicEnabled: false,
  scrim: 0.3,
  economy: false,
  bgMode: 'always',
  colorMode: 'dark',
  wakeLock: true,
  autoFullscreen: false,
  showTaskInFocus: true,
  strictPlant: false,
  celebrate: true,
  notify: true,
  streakMinutes: 25,
  dayStartHour: 4,
  onboarded: false,
  lastBackupAt: null,
}

interface SettingsStore extends Settings {
  set: (patch: Partial<Settings>) => void
  setMix: (theme: ThemeId, layer: string, v: number) => void
  setVolume: (bus: keyof Settings['volumes'], v: number) => void
}

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      set: (patch) => set(patch),
      setMix: (theme, layer, v) => set((s) => ({ mixes: { ...s.mixes, [theme]: { ...s.mixes[theme], [layer]: v } } })),
      setVolume: (bus, v) => set((s) => ({ volumes: { ...s.volumes, [bus]: v } })),
    }),
    { name: 'cocon-settings', version: 2, migrate: (old) => ({ ...(old as Settings), ...fixThemes(old as Partial<Settings>) }) },
  ),
)

/** Plain settings object (no actions), e.g. for backups. */
export function settingsSnapshot(): Settings {
  const s = useSettings.getState()
  return Object.fromEntries(Object.keys(DEFAULT_SETTINGS).map((k) => [k, s[k as keyof Settings]])) as unknown as Settings
}

/** Maps theme ids from older versions and backups ('lofi' became 'soiree'); unknown ids fall back to the default. */
export function fixThemes(s: Partial<Settings>): Partial<Settings> {
  const fix = (t: unknown): ThemeId | null => {
    const id = t === 'lofi' ? 'soiree' : t
    return THEME_IDS.includes(id as ThemeId) ? (id as ThemeId) : null
  }
  const out = { ...s }
  if ('visualTheme' in s) out.visualTheme = fix(s.visualTheme) ?? DEFAULT_SETTINGS.visualTheme
  if ('soundTheme' in s) out.soundTheme = fix(s.soundTheme) ?? DEFAULT_SETTINGS.soundTheme
  if (Array.isArray(s.favorites)) out.favorites = s.favorites.map(fix).filter((t): t is ThemeId => t !== null)
  if (s.mixes) out.mixes = Object.fromEntries(Object.entries(s.mixes).filter(([k]) => THEME_IDS.includes(k as ThemeId)))
  return out
}
