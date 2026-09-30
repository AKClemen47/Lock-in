import { useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from 'lucide-react'
import { useAllSessions, useProjects, useTasks, useToday } from '../../lib/hooks'
import { bucketize, byProject, streaks, totalsByDay, type SessionLike } from '../../lib/stats'
import { addDays, dayKeyOf, formatDay, formatDuration, formatPeriod, MIN, periodRange, shiftPeriod, weekStartKey, type Period } from '../../lib/time'
import { useSettings } from '../../store/settings'
import { Card, IconBtn, Segmented, cx } from '../../components/ui'
import { FocusChart, seriesOf } from './FocusChart'

const PREV: Record<Period, string> = { day: 'the day before', week: 'last week', month: 'last month' }

function inRange<T extends SessionLike>(sessions: T[], period: Period, anchor: string, startHour: number): T[] {
  const { from, days } = periodRange(period, anchor)
  const to = addDays(from, days)
  return sessions.filter((s) => {
    const k = dayKeyOf(s.start, startHour)
    return k >= from && k < to
  })
}

function Delta({ now, before, period }: { now: number; before: number; period: Period }) {
  if (!before) return <span className="text-xs text-muted">—</span>
  const pct = Math.round(((now - before) / before) * 100)
  const up = pct >= 0
  const Icon = up ? TrendingUp : TrendingDown
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted">
      <Icon size={13} aria-hidden="true" />
      {up ? '+' : '−'}
      {Math.abs(pct)}% vs {PREV[period]}
    </span>
  )
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: ReactNode }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
      {sub && <div className="mt-1">{sub}</div>}
    </div>
  )
}

/** Last 5 weeks, Monday-aligned; one hue, five lightness levels. */
function StreakCalendar({ totals, today, threshold }: { totals: Map<string, number>; today: string; threshold: number }) {
  const start = addDays(weekStartKey(today), -28)
  const level = (ms: number) => (ms <= 0 ? 0 : ms < 25 * MIN ? 1 : ms < 60 * MIN ? 2 : ms < 120 * MIN ? 3 : 4)
  const alpha = [0, 0.25, 0.5, 0.75, 1]
  return (
    <div className="max-w-sm">
      <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] text-muted" aria-hidden="true">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1.5" role="list" aria-label="Focus time over the last 5 weeks">
        {Array.from({ length: 35 }, (_, i) => {
          const k = addDays(start, i)
          const future = k > today
          const ms = totals.get(k) ?? 0
          const lv = level(ms)
          const label = `${formatDay(k)}: ${future ? 'upcoming' : formatDuration(ms)}${ms >= threshold ? ' · streak day' : ''}`
          return (
            <div
              key={k}
              role="listitem"
              title={label}
              aria-label={label}
              className={cx('relative aspect-square rounded-md', future ? 'border border-dashed border-line' : 'bg-line', k === today && 'ring-1 ring-fg/60')}
            >
              {lv > 0 && <span className="absolute inset-0 rounded-md bg-accent" style={{ opacity: alpha[lv] }} />}
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-muted">
        Less
        {alpha.map((a, i) => (
          <span key={i} className="relative size-3 rounded-sm bg-line">
            {a > 0 && <span className="absolute inset-0 rounded-sm bg-accent" style={{ opacity: a }} />}
          </span>
        ))}
        More
      </div>
    </div>
  )
}

export function StatsView() {
  const today = useToday()
  const { dayStartHour: sh, streakMinutes, dailyGoal } = useSettings()
  const [period, setPeriod] = useState<Period>('week')
  const [anchor, setAnchor] = useState(today)
  const all = useAllSessions()
  const tasks = useTasks()
  const projects = useProjects()

  const cur = inRange(all, period, anchor, sh)
  const prev = inRange(all, period, shiftPeriod(period, anchor, -1), sh)
  const focus = cur.reduce((n, s) => n + s.durationMs, 0)
  const focusPrev = prev.reduce((n, s) => n + s.durationMs, 0)
  const pomos = cur.filter((s) => s.completed).length
  const pomosPrev = prev.filter((s) => s.completed).length
  const { from, days } = periodRange(period, anchor)
  const to = addDays(from, days)
  const inPeriod = (k: string | null) => k !== null && k >= from && k < to
  const doneTasks = tasks.filter((t) => t.done && t.doneAt !== null && inPeriod(dayKeyOf(t.doneAt, sh)))
  const due = tasks.filter((t) => inPeriod(t.dueDate))
  const dueDone = due.filter((t) => t.done).length
  const estimated = doneTasks.filter((t) => t.estimate > 0)
  const ratio = estimated.length ? estimated.reduce((n, t) => n + t.spent, 0) / estimated.reduce((n, t) => n + t.estimate, 0) : 0
  const totals = totalsByDay(all, sh)
  const streak = streaks(totals, streakMinutes * MIN, today)
  const perProject = byProject(cur)
  const perProjectPrev = byProject(prev)
  const rows = seriesOf(perProject.keys(), projects).sort((a, b) => perProject.get(b.id)! - perProject.get(a.id)!)
  const max = Math.max(...rows.map((r) => perProject.get(r.id)!), 1)

  return (
    <div className="@container h-full space-y-4 overflow-y-auto p-4 md:p-6">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-semibold tracking-tight">Statistics</h1>
        <div className="w-56">
          <Segmented<Period>
            label="Period"
            value={period}
            onChange={setPeriod}
            options={[
              { value: 'day', label: 'Day' },
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
            ]}
          />
        </div>
        <div className="flex items-center gap-1">
          <IconBtn label="Previous period" onClick={() => setAnchor(shiftPeriod(period, anchor, -1))}>
            <ChevronLeft size={18} />
          </IconBtn>
          <button type="button" className="min-w-40 text-center text-sm capitalize" onClick={() => setAnchor(today)} title="Back to today">
            {formatPeriod(period, anchor)}
          </button>
          <IconBtn label="Next period" onClick={() => setAnchor(shiftPeriod(period, anchor, 1))} disabled={to > today && from <= today}>
            <ChevronRight size={18} />
          </IconBtn>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 @2xl:grid-cols-4">
        <Tile label="Focus time" value={formatDuration(focus)} sub={<Delta now={focus} before={focusPrev} period={period} />} />
        <Tile
          label="Pomodoros completed"
          value={period === 'day' ? `${pomos} / ${dailyGoal}` : String(pomos)}
          sub={<Delta now={pomos} before={pomosPrev} period={period} />}
        />
        <Tile label="Tasks completed" value={String(doneTasks.length)} sub={<span className="text-xs text-muted">in this period</span>} />
        <Tile
          label="Current streak"
          value={`${streak.current} day${streak.current === 1 ? '' : 's'}`}
          sub={<span className="text-xs text-muted">Best: {streak.best} · threshold {streakMinutes} min/day</span>}
        />
      </div>

      <Card title={period === 'day' ? 'Focus by hour' : 'Focus by day'}>
        <FocusChart buckets={bucketize(cur, period, anchor, sh)} projects={projects} hourly={period === 'day'} />
      </Card>

      <div className="grid gap-4 @3xl:grid-cols-2">
        <Card title="By subject">
          {rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No sessions in this period.</p>
          ) : (
            <table className="w-full text-sm">
              <caption className="sr-only">Focus time by subject and change from the previous period</caption>
              <thead className="text-left text-xs text-muted">
                <tr>
                  <th className="pb-2 font-normal">Subject</th>
                  <th className="pb-2 text-right font-normal">Time</th>
                  <th className="pb-2 text-right font-normal">Share</th>
                  <th className="pb-2 text-right font-normal">Change</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {rows.map((r) => {
                  const ms = perProject.get(r.id)!
                  const before = perProjectPrev.get(r.id) ?? 0
                  return (
                    <tr key={r.id} className="border-t border-line">
                      <td className="py-2 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="size-2.5 shrink-0 rounded-sm" style={{ background: r.color }} />
                          <span className="truncate">{r.name}</span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-line">
                          <div className="h-full rounded-full" style={{ width: `${(ms / max) * 100}%`, background: r.color }} />
                        </div>
                      </td>
                      <td className="py-2 text-right">{formatDuration(ms)}</td>
                      <td className="py-2 text-right text-muted">{Math.round((ms / focus) * 100)}%</td>
                      <td className="py-2 text-right text-xs text-muted">
                        {before ? `${ms >= before ? '▲ +' : '▼ −'}${formatDuration(Math.abs(ms - before))}` : 'new'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Card>

        <div className="space-y-4">
          <Card title="Completion & estimates">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted">Tasks due in this period</dt>
                <dd>
                  {due.length ? (
                    <>
                      <span className="text-lg font-semibold tabular-nums">{Math.round((dueDone / due.length) * 100)}%</span>{' '}
                      <span className="text-muted">completed ({dueDone} / {due.length})</span>
                    </>
                  ) : (
                    <span className="text-muted">No due dates.</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Actual / estimated pomodoros (completed tasks)</dt>
                <dd>
                  {estimated.length ? (
                    <>
                      <span className="text-lg font-semibold tabular-nums">{Math.round(ratio * 100)}%</span>{' '}
                      <span className="text-muted">
                        {ratio > 1.15 ? '— you underestimate a little' : ratio < 0.85 ? '— you overestimate a little' : '— spot-on estimates 👌'}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted">Estimate your tasks (~3) to track your accuracy.</span>
                  )}
                </dd>
              </div>
            </dl>
          </Card>
          <Card title="Consistency — last 5 weeks">
            <StreakCalendar totals={totals} today={today} threshold={streakMinutes * MIN} />
          </Card>
        </div>
      </div>
    </div>
  )
}
