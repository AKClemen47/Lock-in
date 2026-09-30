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
  const choose = () => set(linkSound ? { visualTheme: t.id, soundTheme: t.id } : { visualTheme: t.id })

  return (
    <article
      className={cx('glass overflow-hidden rounded-2xl transition', selected && 'ring-2 ring-accent')}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      <button type="button" className="relative block aspect-video w-full" onClick={choose} aria-label={`Choisir ${t.name}`}>
        <SceneVideo theme={t.id} animate={hover || previewing} className="absolute inset-0 size-full" />
        {selected && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white backdrop-blur">
            <Check size={12} /> Actif
          </span>
        )}
      </button>
      <div className="flex items-start gap-2 p-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">
            {t.emoji} {t.name}
          </h3>
          <p className="mt-0.5 text-xs text-muted">{t.blurb}</p>
          <p className="mt-1 text-[11px] text-muted/70">Vidéo : {t.credit}</p>
        </div>
        <IconBtn
          label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          aria-pressed={fav}
          onClick={() => set({ favorites: fav ? favorites.filter((f) => f !== t.id) : [...favorites, t.id] })}
        >
          <Star size={16} fill={fav ? 'currentColor' : 'none'} className={fav ? 'text-accent' : ''} />
        </IconBtn>
        <IconBtn label={previewing ? 'Arrêter la pré-écoute' : 'Pré-écouter'} variant={previewing ? 'primary' : 'ghost'} onClick={onPreview}>
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
      title="Mixeur"
      action={
        <Btn variant={playing ? 'primary' : 'soft'} className="px-3 py-1.5" onClick={toggleAmbience}>
          {playing ? <Pause size={15} /> : <Play size={15} />} {playing ? 'Pause' : 'Lancer'}
        </Btn>
      }
    >
      <div className="space-y-4">
        <Toggle label="Lier le son au fond d’écran" checked={s.linkSound} onChange={(v) => s.set(v ? { linkSound: v, soundTheme: s.visualTheme } : { linkSound: v })} />
        {!s.linkSound && (
          <Segmented<ThemeId> label="Ambiance sonore" size="sm" value={s.soundTheme} onChange={(soundTheme) => s.set({ soundTheme })} options={THEMES.map((t) => ({ value: t.id, label: `${t.emoji} ${t.name.split(' ')[0]}` }))} />
        )}
        <div className="space-y-3 rounded-xl bg-hover p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Couches</span>
            <IconBtn label="Réinitialiser le mix" className="size-7" onClick={() => s.set({ mixes: { ...s.mixes, [s.soundTheme]: undefined } })}>
              <RotateCcw size={13} />
            </IconBtn>
          </div>
          {SOUND_THEMES[s.soundTheme].map((l) => (
            <Slider key={l.id} label={l.label} value={mix[l.id]} onChange={(v) => s.setMix(s.soundTheme, l.id, v)} />
          ))}
        </div>
        <Slider label="Volume général" value={s.volumes.master} onChange={(v) => s.setVolume('master', v)} />
        <Slider label="Ambiance" value={s.volumes.ambience} onChange={(v) => s.setVolume('ambience', v)} />
        <Slider label="Musique" value={s.volumes.music} onChange={(v) => s.setVolume('music', v)} />
        <Slider label="Notifications" value={s.volumes.notif} onChange={(v) => s.setVolume('notif', v)} />
        <Toggle label="Muet" hint="Raccourci : M" checked={s.muted} onChange={(muted) => s.set({ muted })} />
        <Toggle label="Garder les alertes en mode muet" checked={s.alertsThroughMute} onChange={(alertsThroughMute) => s.set({ alertsThroughMute })} />
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
    toast(`${list.length} morceau${list.length > 1 ? 'x' : ''} ajouté${list.length > 1 ? 's' : ''}`)
  }

  return (
    <Card title="Ma musique">
      <div className="space-y-3">
        <Toggle label="Jouer ma musique avec l’ambiance" hint="Fichiers stockés uniquement sur cet appareil" checked={musicEnabled} onChange={(v) => set({ musicEnabled: v })} />
        <div className="flex items-center gap-2">
          <Btn onClick={() => input.current?.click()}>
            <Upload size={15} /> Importer des fichiers audio
          </Btn>
          {tracks.length > 1 && (
            <IconBtn label="Morceau suivant" onClick={nextTrack}>
              <SkipForward size={16} />
            </IconBtn>
          )}
          <input ref={input} type="file" accept="audio/*" multiple hidden onChange={(e) => void importFiles(e.target.files).then(() => (e.target.value = ''))} />
        </div>
        {tracks.length === 0 ? (
          <p className="text-xs text-muted">MP3, OGG, M4A… La liste boucle pendant tes sessions.</p>
        ) : (
          <ul className="space-y-1">
            {tracks.map((t) => (
              <li key={t.id} className="group flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-hover">
                <Music size={14} className={now === t.name ? 'text-accent' : 'text-muted'} />
                <span className={cx('flex-1 truncate', now === t.name && 'font-medium')}>{t.name}</span>
                <IconBtn label={`Retirer ${t.name}`} className="size-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100" onClick={() => void db.tracks.delete(t.id)}>
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
    <Card title="Sons du minuteur">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Segmented<ChimeStyle>
              label="Style d’alerte"
              size="sm"
              value={s.chime}
              onChange={(chime) => (s.set({ chime }), playChime('focusEnd', chime))}
              options={[
                { value: 'cloche', label: '🔔 Cloche' },
                { value: 'carillon', label: '🎐 Carillon' },
                { value: 'bol', label: '🥣 Bol tibétain' },
              ]}
            />
          </div>
          <IconBtn label="Écouter l’alerte" onClick={() => playChime('focusEnd', s.chime)}>
            <Play size={15} />
          </IconBtn>
        </div>
        <Toggle label="Tic-tac pendant le focus" checked={s.tick} onChange={(tick) => s.set({ tick })} />
        <Toggle label="Lancer l’ambiance au début d’un focus" checked={s.autoAmbience} onChange={(autoAmbience) => s.set({ autoAmbience })} />
        <div>
          <span className="mb-1 block text-sm">Pendant les pauses</span>
          <Segmented<BreakBehavior>
            label="Ambiance pendant les pauses"
            size="sm"
            value={s.breakBehavior}
            onChange={(breakBehavior) => s.set({ breakBehavior })}
            options={[
              { value: 'continue', label: 'Continuer' },
              { value: 'lower', label: 'Baisser' },
              { value: 'stop', label: 'Couper' },
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
        <h1 className="text-2xl font-semibold tracking-tight">Ambiances</h1>
        <p className="mt-1 text-sm text-muted">Survole une carte pour l’animer, clique pour l’adopter.</p>
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
