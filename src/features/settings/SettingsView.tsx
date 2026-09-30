import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Download, Upload } from 'lucide-react'
import { DEFAULT_SETTINGS, fixThemes, settingsSnapshot, useSettings, type Settings } from '../../store/settings'
import { downloadJson, exportAll, importAll, resetAll } from '../../lib/repo'
import { notificationsSupported, notify } from '../../lib/notify'
import { toast } from '../../store/ui'
import { Btn, Card, Segmented, Slider, Toggle } from '../../components/ui'

const PRESETS: { label: string; d: Settings['durations'] }[] = [
  { label: 'Classique 25/5', d: { focus: 25, short: 5, long: 15, longEvery: 4 } },
  { label: 'Long 50/10', d: { focus: 50, short: 10, long: 30, longEvery: 2 } },
  { label: 'Court 15/3', d: { focus: 15, short: 3, long: 10, longEvery: 4 } },
]

const SHORTCUTS: [string, string][] = [
  ['Espace', 'Démarrer / mettre en pause'],
  ['S', 'Passer la phase'],
  ['M', 'Muet'],
  ['F', 'Mode focus plein écran'],
  ['N', 'Nouvelle tâche'],
  ['Échap', 'Quitter le mode focus / fermer'],
]

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-4 py-1.5">
      <span>
        <span className="text-sm">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

function NumberInput({ value, onChange, min, max, unit }: { value: number; onChange: (v: number) => void; min: number; max: number; unit?: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value)
          if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, Math.round(v))))
        }}
        className="w-16 rounded-lg border border-line bg-field px-2 py-1 text-right text-sm tabular-nums"
      />
      {unit && <span className="w-7 text-xs text-muted">{unit}</span>}
    </span>
  )
}

function Data() {
  const { lastBackupAt, set } = useSettings()
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [armed, setArmed] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  useEffect(() => void navigator.storage?.persisted?.().then(setPersisted), [])

  const doExport = async () => {
    downloadJson(`cocon-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`, await exportAll(settingsSnapshot()))
    set({ lastBackupAt: Date.now() })
  }
  const doImport = async (f: File | undefined) => {
    if (!f) return
    try {
      const b = await importAll(JSON.parse(await f.text()))
      const known = Object.fromEntries(Object.entries((b.settings ?? {}) as object).filter(([k]) => k in DEFAULT_SETTINGS))
      set(fixThemes(known as Partial<Settings>))
      toast(`Sauvegarde restaurée : ${b.tasks.length} tâches, ${b.sessions.length} sessions`)
    } catch (e) {
      toast(e instanceof Error && e.message.includes('Cocon') ? e.message : 'Fichier illisible.')
    }
  }
  const doReset = async () => {
    if (!armed) return setArmed(true)
    await resetAll()
    setArmed(false)
    toast('Toutes les tâches, matières et statistiques ont été effacées.')
  }

  return (
    <Card title="Données">
      <p className="mb-3 text-xs text-muted">
        Tout reste sur cet appareil (aucun compte, aucun serveur).{' '}
        {lastBackupAt ? `Dernière sauvegarde : ${new Date(lastBackupAt).toLocaleDateString('fr-FR')}.` : 'Aucune sauvegarde pour l’instant.'}
      </p>
      <div className="flex flex-wrap gap-2">
        <Btn onClick={() => void doExport()}>
          <Download size={15} /> Exporter (JSON)
        </Btn>
        <Btn onClick={() => file.current?.click()}>
          <Upload size={15} /> Importer
        </Btn>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => void doImport(e.target.files?.[0]).then(() => (e.target.value = ''))} />
        <Btn variant="danger" onClick={() => void doReset()} onBlur={() => setArmed(false)}>
          {armed ? 'Confirmer : tout effacer' : 'Réinitialiser'}
        </Btn>
      </div>
      {persisted === false && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-hover p-3 text-xs">
          <span>Le navigateur peut effacer les données en cas de manque de place.</span>
          <Btn className="px-2 py-1 text-xs" onClick={() => void navigator.storage.persist().then((ok) => (setPersisted(ok), toast(ok ? 'Stockage protégé.' : 'Refusé par le navigateur.')))}>
            Protéger
          </Btn>
        </div>
      )}
      {persisted && <p className="mt-3 text-xs text-muted">✓ Stockage persistant activé.</p>}
    </Card>
  )
}

function Notifications() {
  const { notify: on, set } = useSettings()
  const [perm, setPerm] = useState(notificationsSupported() ? Notification.permission : 'denied')
  if (!notificationsSupported()) return null
  const ask = async () => setPerm(await Notification.requestPermission())
  return (
    <Card title="Notifications">
      <Toggle label="Prévenir en fin de session et pour les rappels" hint="Seulement quand Cocon n’est pas au premier plan" checked={on} onChange={(v) => (set({ notify: v }), v && perm === 'default' && void ask())} />
      <div className="mt-2 flex items-center gap-2 text-xs text-muted">
        {perm === 'granted' && (
          <>
            ✓ Autorisées
            <Btn variant="ghost" className="px-2 py-1 text-xs" onClick={() => notify('Cocon', 'Les notifications fonctionnent 🌱', true)}>
              Tester
            </Btn>
          </>
        )}
        {perm === 'default' && <Btn className="px-2 py-1 text-xs" onClick={() => void ask()}>Autoriser</Btn>}
        {perm === 'denied' && 'Bloquées dans le navigateur : autorise-les depuis l’icône du cadenas.'}
      </div>
    </Card>
  )
}

export function SettingsView() {
  const s = useSettings()
  const d = s.durations
  const setD = (patch: Partial<Settings['durations']>) => s.set({ durations: { ...d, ...patch } })

  return (
    <div className="@container h-full space-y-4 overflow-y-auto p-4 md:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Réglages</h1>
      <div className="grid gap-4 @3xl:grid-cols-2">
        <div className="space-y-4">
          <Card title="Minuteur">
            <div className="mb-3 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <Btn key={p.label} variant={JSON.stringify(p.d) === JSON.stringify(d) ? 'primary' : 'soft'} className="px-2.5 py-1 text-xs" onClick={() => s.set({ durations: p.d })}>
                  {p.label}
                </Btn>
              ))}
            </div>
            <Row label="Focus"><NumberInput value={d.focus} min={1} max={180} unit="min" onChange={(focus) => setD({ focus })} /></Row>
            <Row label="Pause courte"><NumberInput value={d.short} min={1} max={60} unit="min" onChange={(short) => setD({ short })} /></Row>
            <Row label="Pause longue"><NumberInput value={d.long} min={1} max={90} unit="min" onChange={(long) => setD({ long })} /></Row>
            <Row label="Pause longue toutes les"><NumberInput value={d.longEvery} min={2} max={12} unit="🍅" onChange={(longEvery) => setD({ longEvery })} /></Row>
            <Row label="Objectif quotidien"><NumberInput value={s.dailyGoal} min={1} max={30} unit="🍅" onChange={(dailyGoal) => s.set({ dailyGoal })} /></Row>
            <div className="mt-2 border-t border-line pt-2">
              <Toggle label="Enchaîner automatiquement les pauses" checked={s.autoStartBreaks} onChange={(autoStartBreaks) => s.set({ autoStartBreaks })} />
              <Toggle label="Enchaîner automatiquement les focus" hint="Les deux activés = mode continu" checked={s.autoStartFocus} onChange={(autoStartFocus) => s.set({ autoStartFocus })} />
            </div>
          </Card>

          <Card title="Mode focus">
            <Toggle label="Empêcher la mise en veille de l’écran" hint="Pendant qu’un minuteur tourne" checked={s.wakeLock} onChange={(wakeLock) => s.set({ wakeLock })} />
            <Toggle label="Plein écran au démarrage" checked={s.autoFullscreen} onChange={(autoFullscreen) => s.set({ autoFullscreen })} />
            <Toggle label="Afficher la tâche en cours" checked={s.showTaskInFocus} onChange={(showTaskInFocus) => s.set({ showTaskInFocus })} />
          </Card>

          <Card title="Motivation">
            <Row label="Minimum pour valider une journée" hint="Compte pour la série"><NumberInput value={s.streakMinutes} min={5} max={600} unit="min" onChange={(streakMinutes) => s.set({ streakMinutes })} /></Row>
            <Row label="La journée commence à" hint="Pour les couche-tard"><NumberInput value={s.dayStartHour} min={0} max={8} unit="h" onChange={(dayStartHour) => s.set({ dayStartHour })} /></Row>
            <Toggle label="Mode strict" hint="Abandonner une session fait faner la plante" checked={s.strictPlant} onChange={(strictPlant) => s.set({ strictPlant })} />
            <Toggle label="Petite célébration en fin de session" checked={s.celebrate} onChange={(celebrate) => s.set({ celebrate })} />
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Apparence">
            <div className="space-y-3">
              <Segmented<Settings['colorMode']>
                label="Thème de l’interface"
                value={s.colorMode}
                onChange={(colorMode) => s.set({ colorMode })}
                options={[
                  { value: 'dark', label: '🌙 Sombre' },
                  { value: 'light', label: '☀️ Clair' },
                  { value: 'system', label: '💻 Système' },
                ]}
              />
              <Segmented<Settings['bgMode']>
                label="Fond animé"
                value={s.bgMode}
                onChange={(bgMode) => s.set({ bgMode })}
                options={[
                  { value: 'always', label: 'Toujours animé' },
                  { value: 'focus', label: 'Seulement en focus' },
                ]}
              />
              <Slider label="Voile de lisibilité" value={s.scrim} max={0.8} onChange={(scrim) => s.set({ scrim })} />
              <Toggle label="Mode économie" hint="Fond fixe, moins de batterie" checked={s.economy} onChange={(economy) => s.set({ economy })} />
            </div>
          </Card>
          <Notifications />
          <Data />
          <Card title="Raccourcis clavier">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              {SHORTCUTS.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt>
                    <kbd className="rounded-md border border-line bg-hover px-1.5 py-0.5 text-xs">{k}</kbd>
                  </dt>
                  <dd className="text-muted">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Btn variant="ghost" className="text-xs" onClick={() => s.set({ onboarded: false })}>
            Revoir l’introduction
          </Btn>
        </div>
      </div>
    </div>
  )
}
