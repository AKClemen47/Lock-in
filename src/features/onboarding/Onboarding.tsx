import { useRef, useState } from 'react'
import { X } from 'lucide-react'
import { THEMES } from '../../scenes/themes'
import { SceneVideo } from '../../scenes/SceneVideo'
import { addProject } from '../../lib/repo'
import { useSettings, type Settings } from '../../store/settings'
import { Btn, Modal, cx, inputClass } from '../../components/ui'

const RHYTHMS: { label: string; hint: string; d: Settings['durations'] }[] = [
  { label: '25 / 5', hint: 'Classic, ideal to get started', d: { focus: 25, short: 5, long: 15, longEvery: 4 } },
  { label: '50 / 10', hint: 'Long sessions, revision', d: { focus: 50, short: 10, long: 30, longEvery: 2 } },
  { label: '15 / 3', hint: 'Small bites, gentle restart', d: { focus: 15, short: 3, long: 10, longEvery: 4 } },
]

/** Three steps: ambience, rhythm, subjects. Skippable at any point. */
export function Onboarding() {
  const s = useSettings()
  const [step, setStep] = useState(0)
  const [subjects, setSubjects] = useState<string[]>([])
  const [draft, setDraft] = useState('')
  const finished = useRef(false)

  const addSubject = () => {
    const name = draft.trim()
    if (name && !subjects.includes(name)) setSubjects([...subjects, name])
    setDraft('')
  }
  // Closing the dialog fires onClose too: run once.
  const finish = async () => {
    if (finished.current) return
    finished.current = true
    const pending = draft.trim() ? [...subjects, draft.trim()] : subjects
    for (const name of pending) await addProject({ name })
    s.set({ onboarded: true })
  }

  return (
    <Modal open={!s.onboarded} onClose={() => void finish()} title={['Welcome to Cocon 🌱', 'Your rhythm', 'Your subjects'][step]} wide>
      {step === 0 && (
        <div className="space-y-4">
          <p className="text-sm text-muted">A calm corner to study: a Pomodoro timer, your tasks by subject, and an ambience that wraps around you. Pick your scene:</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => s.set({ visualTheme: t.id, soundTheme: t.id })}
                aria-pressed={s.visualTheme === t.id}
                className={cx('overflow-hidden rounded-xl border-2 text-left transition', s.visualTheme === t.id ? 'border-accent' : 'border-transparent hover:border-line')}
              >
                <SceneVideo theme={t.id} animate={s.visualTheme === t.id} className="block aspect-video w-full" />
                <div className="p-2 text-sm font-medium">
                  {t.emoji} {t.name}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <p className="text-sm text-muted">Focus, then a break, on repeat. You can adjust everything in the settings.</p>
          {RHYTHMS.map((r) => {
            const on = JSON.stringify(r.d) === JSON.stringify(s.durations)
            return (
              <button
                key={r.label}
                type="button"
                aria-pressed={on}
                onClick={() => s.set({ durations: r.d })}
                className={cx('flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition', on ? 'border-accent bg-hover' : 'border-line hover:bg-hover')}
              >
                <span className="text-lg font-semibold tabular-nums">{r.label}</span>
                <span className="text-sm text-muted">{r.hint}</span>
              </button>
            )
          })}
          <label className="flex items-center justify-between pt-2 text-sm">
            Daily goal
            <span className="flex items-center gap-2">
              <input type="range" min={1} max={16} value={s.dailyGoal} onChange={(e) => s.set({ dailyGoal: Number(e.target.value) })} />
              <span className="w-12 tabular-nums">{s.dailyGoal} 🍅</span>
            </span>
          </label>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <p className="text-sm text-muted">Add your subjects to sort your tasks and track your time per subject (optional).</p>
          <div className="flex gap-2">
            <input
              autoFocus
              className={inputClass}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSubject()}
              placeholder="e.g. Mathematics, History, French…"
              aria-label="Subject name"
            />
            <Btn onClick={addSubject}>Add</Btn>
          </div>
          <ul className="flex flex-wrap gap-2">
            {subjects.map((n) => (
              <li key={n} className="inline-flex items-center gap-1 rounded-full bg-hover py-1 pl-3 pr-1 text-sm">
                {n}
                <button type="button" aria-label={`Remove ${n}`} className="rounded-full p-0.5 hover:bg-line" onClick={() => setSubjects(subjects.filter((x) => x !== n))}>
                  <X size={12} />
                </button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">Tip: in a task, type "#Maths tomorrow 6pm ~2" to set everything at once.</p>
        </div>
      )}

      <footer className="mt-6 flex items-center gap-2">
        <div className="flex gap-1.5" aria-label={`Step ${step + 1} of 3`}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={cx('h-1.5 rounded-full transition-all', i === step ? 'w-5 bg-accent' : 'w-1.5 bg-line')} />
          ))}
        </div>
        <Btn variant="ghost" className="ml-auto" onClick={() => void finish()}>
          Skip
        </Btn>
        {step > 0 && <Btn onClick={() => setStep(step - 1)}>Back</Btn>}
        <Btn variant="primary" onClick={() => (step < 2 ? setStep(step + 1) : void finish())}>
          {step < 2 ? 'Next' : 'Get started'}
        </Btn>
      </footer>
    </Modal>
  )
}
