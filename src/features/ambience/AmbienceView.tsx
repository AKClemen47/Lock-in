import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, Headphones, Music, Pause, Play, RotateCcw, SkipForward, Square, Star, Trash2, Upload } from 'lucide-react'
import { THEMES, type ThemeDef } from '../../scenes/themes'
import { SceneVideo } from '../../scenes/SceneVideo'
import { SOUND_THEMES, mixFor } from '../../audio/soundThemes'
import { playAmbience } from '../../audio/ambience'
import { playChime } from '../../audio/chimes'
import { currentTrack, nextTrack, onTrackChange } from '../../audio/music'
import { db, uid } from '../../lib/db'
import { useSettings, type BreakBehavior, type ChimeStyle, type ThemeId } from '../../store/settings'
import { toast, useUi } from '../../store/ui'
import { Btn, Card, IconBtn, Segmented, Slider, Toggle, cx } from '../../components/ui'
import { startAmbience, stopAmbienceNow, toggleAmbience } from '../timer/controller'

function ThemeCard({ t, previewing, onPreview }: { t: ThemeDef; previewing: boolean; onPreview: () => void }) {
  const { visualTheme, favorites, linkSound, set } = useSettings()
  const [hover, setHover] = useState(false)
  const selected = visualTheme === t.id
  const fav = favorites.includes(t.id)
  const choose = () => {
    set(linkSound ? { visualTheme: t.id, soundTheme: t.id } : { visualTheme: t.id })
    if (!useUi.getState().ambiencePlaying) startAmbience()
  }

  return (
    <article
      className={cx('glass overflow-hidden rounded-2xl transition', selected && 'ring-2 ring-accent')}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      <button type="button" className="relative block aspect-video w-full" onClick={choose} aria-label={`Choose ${t.name}`}>
        <SceneVideo theme={t.id} animate={hover || previewing} className="absolute inset-0 size-full" />
        {selected && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white backdrop-blur">
            <Check size={12} /> Active
          </span>
        )}
      </button>
      <div className="flex items-start gap-2 p-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">
            {t.emoji} {t.name}
          </h3>
          <p className="mt-0.5 text-xs text-muted">{t.blurb}</p>
          <p className="mt-1 text-[11px] text-muted/70">Video: {t.credit}</p>
        </div>
        <IconBtn
          label={fav ? 'Remove from favourites' : 'Add to favourites'}
          aria-pressed={fav}
          onClick={() => set({ favorites: fav ? favorites.filter((f) => f !== t.id) : [...favorites, t.id] })}
        >
          <Star size={16} fill={fav ? 'currentColor' : 'none'} className={fav ? 'text-accent' : ''} />
        </IconBtn>
        <IconBtn label={previewing ? 'Stop preview' : 'Preview sound'} variant={previewing ? 'primary' : 'ghost'} onClick={onPreview}>
          {previewing ? <Square size={14} /> : <Headphones size={16} />}
        </IconBtn>
      </div>
    </article>
  )
}

function Gallery() {
  const favorites = useSettings((s) => s.favorites)
  const [previewing, setPreviewing] = useState<ThemeId | null>(null)
  const wasPlaying = useRef(false)
  const sorted = [...THEMES].sort((a, b) => Number(favorites.includes(b.id)) - Number(favorites.includes(a.id)))

  const preview = (id: ThemeId) => {
    if (previewing === id) {
      setPreviewing(null)
      if (wasPlaying.current) startAmbience()
      else stopAmbienceNow()
      return
    }
    if (!previewing) wasPlaying.current = useUi.getState().ambiencePlaying
    setPreviewing(id)
    playAmbience(id, mixFor(id, useSettings.getState().mixes), 1)
    useUi.getState().set({ ambiencePlaying: true })
  }

  return (
    <div className="grid gap-4 @md:grid-cols-2 @3xl:grid-cols-3">
      {sorted.map((t) => (
        <ThemeCard key={t.id} t={t} previewing={previewing === t.id} onPreview={() => preview(t.id)} />
      ))}
    </div>
  )
}

function Mixer() {
  const s = useSettings()
  const playing = useUi((u) => u.ambiencePlaying)
  const mix = mixFor(s.soundTheme, s.mixes)
  return (
    <Card
      title="Mixer"
      action={
        <Btn variant={playing ? 'primary' : 'soft'} className="px-3 py-1.5" onClick={toggleAmbience}>
          {playing ? <Pause size={15} /> : <Play size={15} />} {playing ? 'Pause' : 'Play'}
        </Btn>
      }
    >
      <div className="space-y-4">
        <Toggle label="Link the sound to the background" checked={s.linkSound} onChange={(v) => s.set(v ? { linkSound: v, soundTheme: s.visualTheme } : { linkSound: v })} />
        {!s.linkSound && (
          <Segmented<ThemeId> label="Sound ambience" size="sm" value={s.soundTheme} onChange={(soundTheme) => s.set({ soundTheme })} options={THEMES.map((t) => ({ value: t.id, label: `${t.emoji} ${t.short}` }))} />
        )}
        <div className="space-y-3 rounded-xl bg-hover p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Layers</span>
            <IconBtn label="Reset the mix" className="size-7" onClick={() => s.set({ mixes: { ...s.mixes, [s.soundTheme]: undefined } })}>
              <RotateCcw size={13} />
            </IconBtn>
          </div>
          {SOUND_THEMES[s.soundTheme].map((l) => (
            <Slider key={l.id} label={l.label} value={mix[l.id]} onChange={(v) => s.setMix(s.soundTheme, l.id, v)} />
          ))}
        </div>
        <Slider label="Master volume" value={s.volumes.master} onChange={(v) => s.setVolume('master', v)} />
        <Slider label="Ambience" value={s.volumes.ambience} onChange={(v) => s.setVolume('ambience', v)} />
        <Slider label="Music" value={s.volumes.music} onChange={(v) => s.setVolume('music', v)} />
        <Slider label="Notifications" value={s.volumes.notif} onChange={(v) => s.setVolume('notif', v)} />
        <Toggle label="Mute" hint="Shortcut: M" checked={s.muted} onChange={(muted) => s.set({ muted })} />
        <Toggle label="Keep alerts when muted" checked={s.alertsThroughMute} onChange={(alertsThroughMute) => s.set({ alertsThroughMute })} />
      </div>
    </Card>
  )
}

function MusicCard() {
  const { musicEnabled, set } = useSettings()
  const tracks = useLiveQuery(() => db.tracks.orderBy('order').toArray(), []) ?? []
  const [now, setNow] = useState(currentTrack())
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => onTrackChange(() => setNow(currentTrack())), [])

  const importFiles = async (files: FileList | null) => {
    if (!files?.length) return
    const base = tracks.length
    const list = [...files].filter((f) => f.type.startsWith('audio/'))
    await db.tracks.bulkAdd(list.map((f, i) => ({ id: uid(), name: f.name.replace(/\.[^.]+$/, ''), blob: f, order: base + i })))
    toast(`${list.length} track${list.length === 1 ? '' : 's'} added`)
  }

  return (
    <Card title="My music">
      <div className="space-y-3">
        <Toggle label="Play my music with the ambience" hint="Files are stored on this device only" checked={musicEnabled} onChange={(v) => set({ musicEnabled: v })} />
        <div className="flex items-center gap-2">
          <Btn onClick={() => input.current?.click()}>
            <Upload size={15} /> Import audio files
          </Btn>
          {tracks.length > 1 && (
            <IconBtn label="Next track" onClick={nextTrack}>
              <SkipForward size={16} />
            </IconBtn>
          )}
          <input ref={input} type="file" accept="audio/*" multiple hidden onChange={(e) => void importFiles(e.target.files).then(() => (e.target.value = ''))} />
        </div>
        {tracks.length === 0 ? (
          <p className="text-xs text-muted">MP3, OGG, M4A… The playlist loops during your sessions.</p>
        ) : (
          <ul className="space-y-1">
            {tracks.map((t) => (
              <li key={t.id} className="group flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-hover">
                <Music size={14} className={now === t.name ? 'text-accent' : 'text-muted'} />
                <span className={cx('flex-1 truncate', now === t.name && 'font-medium')}>{t.name}</span>
                <IconBtn label={`Remove ${t.name}`} className="size-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100" onClick={() => void db.tracks.delete(t.id)}>
                  <Trash2 size={13} />
                </IconBtn>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}

function TimerSounds() {
  const s = useSettings()
  return (
    <Card title="Timer sounds">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Segmented<ChimeStyle>
              label="Alert style"
              size="sm"
              value={s.chime}
              onChange={(chime) => (s.set({ chime }), playChime('focusEnd', chime))}
              options={[
                { value: 'cloche', label: '🔔 Bell' },
                { value: 'carillon', label: '🎐 Chime' },
                { value: 'bol', label: '🥣 Singing bowl' },
              ]}
            />
          </div>
          <IconBtn label="Play the alert" onClick={() => playChime('focusEnd', s.chime)}>
            <Play size={15} />
          </IconBtn>
        </div>
        <Toggle label="Ticking during focus" checked={s.tick} onChange={(tick) => s.set({ tick })} />
        <Toggle label="Start the ambience sound automatically" checked={s.autoAmbience} onChange={(autoAmbience) => s.set({ autoAmbience })} />
        <div>
          <span className="mb-1 block text-sm">During breaks</span>
          <Segmented<BreakBehavior>
            label="Ambience during breaks"
            size="sm"
            value={s.breakBehavior}
            onChange={(breakBehavior) => s.set({ breakBehavior })}
            options={[
              { value: 'continue', label: 'Keep playing' },
              { value: 'lower', label: 'Lower' },
              { value: 'stop', label: 'Stop' },
            ]}
          />
        </div>
      </div>
    </Card>
  )
}

export function AmbienceView() {
  return (
    <div className="@container h-full space-y-5 overflow-y-auto p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Ambiences</h1>
        <p className="mt-1 text-sm text-muted">Hover over a card to animate it, click to choose it.</p>
      </header>
      <Gallery />
      <div className="grid gap-4 @3xl:grid-cols-2">
        <Mixer />
        <div className="space-y-4">
          <MusicCard />
          <TimerSounds />
        </div>
      </div>
    </div>
  )
}
