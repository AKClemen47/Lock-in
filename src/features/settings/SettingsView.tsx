import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Download, Upload } from 'lucide-react'
import { DEFAULT_SETTINGS, fixThemes, settingsSnapshot, useSettings, type Settings } from '../../store/settings'
import { downloadJson, exportAll, importAll, resetAll } from '../../lib/repo'
import { notificationsSupported, notify } from '../../lib/notify'
import { toast } from '../../store/ui'
import { Btn, Card, Segmented, Slider, Toggle } from '../../components/ui'

const PRESETS: { label: string; d: Settings['durations'] }[] = [
  { label: 'Classic 25/5', d: { focus: 25, short: 5, long: 15, longEvery: 4 } },
  { label: 'Long 50/10', d: { focus: 50, short: 10, long: 30, longEvery: 2 } },
  { label: 'Short 15/3', d: { focus: 15, short: 3, long: 10, longEvery: 4 } },
]

const SHORTCUTS: [string, string][] = [
  ['Space', 'Start / pause'],
  ['S', 'Skip the phase'],
  ['M', 'Mute'],
  ['F', 'Full-screen focus mode'],
  ['N', 'New task'],
  ['Esc', 'Leave focus mode / close'],
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
    downloadJson(`lock-in-backup-${new Date().toISOString().slice(0, 10)}.json`, await exportAll(settingsSnapshot()))
    set({ lastBackupAt: Date.now() })
  }
  const doImport = async (f: File | undefined) => {
    if (!f) return
    try {
      const b = await importAll(JSON.parse(await f.text()))
      const known = Object.fromEntries(Object.entries((b.settings ?? {}) as object).filter(([k]) => k in DEFAULT_SETTINGS))
      set(fixThemes(known as Partial<Settings>))
      toast(`Backup restored: ${b.tasks.length} tasks, ${b.sessions.length} sessions`)
    } catch (e) {
      toast(e instanceof Error && e.message.includes('Lock-in') ? e.message : 'Unreadable file.')
    }
  }
  const doReset = async () => {
    if (!armed) return setArmed(true)
    await resetAll()
    setArmed(false)
    toast('All tasks, subjects and statistics have been erased.')
  }

  return (
    <Card title="Data">
      <p className="mb-3 text-xs text-muted">
        Everything stays on this device (no account, no server).{' '}
        {lastBackupAt ? `Last backup: ${new Date(lastBackupAt).toLocaleDateString('en-GB')}.` : 'No backup yet.'}
      </p>
      <div className="flex flex-wrap gap-2">
        <Btn onClick={() => void doExport()}>
          <Download size={15} /> Export (JSON)
        </Btn>
        <Btn onClick={() => file.current?.click()}>
          <Upload size={15} /> Import
        </Btn>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => void doImport(e.target.files?.[0]).then(() => (e.target.value = ''))} />
        <Btn variant="danger" onClick={() => void doReset()} onBlur={() => setArmed(false)}>
          {armed ? 'Confirm: erase everything' : 'Reset'}
        </Btn>
      </div>
      {persisted === false && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-hover p-3 text-xs">
          <span>The browser may erase the data when it runs out of space.</span>
          <Btn className="px-2 py-1 text-xs" onClick={() => void navigator.storage.persist().then((ok) => (setPersisted(ok), toast(ok ? 'Storage protected.' : 'Refused by the browser.')))}>
            Protect
          </Btn>
        </div>
      )}
      {persisted && <p className="mt-3 text-xs text-muted">✓ Persistent storage enabled.</p>}
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
      <Toggle label="Notify at the end of a session and for reminders" hint="Only when Lock-in is not in the foreground" checked={on} onChange={(v) => (set({ notify: v }), v && perm === 'default' && void ask())} />
      <div className="mt-2 flex items-center gap-2 text-xs text-muted">
        {perm === 'granted' && (
          <>
            ✓ Allowed
            <Btn variant="ghost" className="px-2 py-1 text-xs" onClick={() => notify('Lock-in', 'Notifications work 🌱', true)}>
              Test
            </Btn>
          </>
        )}
        {perm === 'default' && <Btn className="px-2 py-1 text-xs" onClick={() => void ask()}>Allow</Btn>}
        {perm === 'denied' && 'Blocked in the browser: allow them from the padlock icon.'}
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
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <div className="grid gap-4 @3xl:grid-cols-2">
        <div className="space-y-4">
          <Card title="Timer">
            <div className="mb-3 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <Btn key={p.label} variant={JSON.stringify(p.d) === JSON.stringify(d) ? 'primary' : 'soft'} className="px-2.5 py-1 text-xs" onClick={() => s.set({ durations: p.d })}>
                  {p.label}
                </Btn>
              ))}
            </div>
            <Row label="Focus"><NumberInput value={d.focus} min={1} max={180} unit="min" onChange={(focus) => setD({ focus })} /></Row>
            <Row label="Short break"><NumberInput value={d.short} min={1} max={60} unit="min" onChange={(short) => setD({ short })} /></Row>
            <Row label="Long break"><NumberInput value={d.long} min={1} max={90} unit="min" onChange={(long) => setD({ long })} /></Row>
            <Row label="Long break every"><NumberInput value={d.longEvery} min={2} max={12} unit="🍅" onChange={(longEvery) => setD({ longEvery })} /></Row>
            <Row label="Daily goal"><NumberInput value={s.dailyGoal} min={1} max={30} unit="🍅" onChange={(dailyGoal) => s.set({ dailyGoal })} /></Row>
            <div className="mt-2 border-t border-line pt-2">
              <Toggle label="Start breaks automatically" checked={s.autoStartBreaks} onChange={(autoStartBreaks) => s.set({ autoStartBreaks })} />
              <Toggle label="Start focus sessions automatically" hint="Both on = continuous mode" checked={s.autoStartFocus} onChange={(autoStartFocus) => s.set({ autoStartFocus })} />
            </div>
          </Card>

          <Card title="Focus mode">
            <Toggle label="Keep the screen awake" hint="While a timer is running" checked={s.wakeLock} onChange={(wakeLock) => s.set({ wakeLock })} />
            <Toggle label="Full screen on start" checked={s.autoFullscreen} onChange={(autoFullscreen) => s.set({ autoFullscreen })} />
            <Toggle label="Show the current task" checked={s.showTaskInFocus} onChange={(showTaskInFocus) => s.set({ showTaskInFocus })} />
          </Card>

          <Card title="Motivation">
            <Row label="Minimum to count a day" hint="Counts towards the streak"><NumberInput value={s.streakMinutes} min={5} max={600} unit="min" onChange={(streakMinutes) => s.set({ streakMinutes })} /></Row>
            <Row label="The day starts at" hint="For night owls"><NumberInput value={s.dayStartHour} min={0} max={8} unit="h" onChange={(dayStartHour) => s.set({ dayStartHour })} /></Row>
            <Toggle label="Strict mode" hint="Giving up a session withers the plant" checked={s.strictPlant} onChange={(strictPlant) => s.set({ strictPlant })} />
            <Toggle label="Small celebration at the end of a session" checked={s.celebrate} onChange={(celebrate) => s.set({ celebrate })} />
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Appearance">
            <div className="space-y-3">
              <Segmented<Settings['colorMode']>
                label="Interface theme"
                value={s.colorMode}
                onChange={(colorMode) => s.set({ colorMode })}
                options={[
                  { value: 'dark', label: '🌙 Dark' },
                  { value: 'light', label: '☀️ Light' },
                  { value: 'system', label: '💻 System' },
                ]}
              />
              <Segmented<Settings['bgMode']>
                label="Animated background"
                value={s.bgMode}
                onChange={(bgMode) => s.set({ bgMode })}
                options={[
                  { value: 'always', label: 'Always animated' },
                  { value: 'focus', label: 'Only during focus' },
                ]}
              />
              <Slider label="Readability veil" value={s.scrim} max={0.8} onChange={(scrim) => s.set({ scrim })} />
              <Toggle label="Battery saver" hint="Still background, less battery" checked={s.economy} onChange={(economy) => s.set({ economy })} />
            </div>
          </Card>
          <Notifications />
          <Data />
          <Card title="Keyboard shortcuts">
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
            Replay the introduction
          </Btn>
        </div>
      </div>
    </div>
  )
}
