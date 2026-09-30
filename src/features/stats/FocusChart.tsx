import { useState } from 'react'
import { BarElement, CategoryScale, Chart, Legend, LinearScale, Tooltip, type ScriptableContext } from 'chart.js'
import { Bar } from 'react-chartjs-2'
import type { Project } from '../../lib/db'
import { NO_PROJECT, type Buckets } from '../../lib/stats'
import { formatDuration } from '../../lib/time'
import { useSettings } from '../../store/settings'
import { Btn } from '../../components/ui'

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend)

/** Neutral for "Sans matière": never a categorical hue. */
export const NO_PROJECT_COLOR = '#8a8799'

const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

export interface SeriesInfo {
  id: string
  name: string
  color: string
}

/** Series in the projects' fixed order, so a colour always follows its project. */
export function seriesOf(ids: Iterable<string>, projects: Project[]): SeriesInfo[] {
  const present = new Set(ids)
  const out: SeriesInfo[] = projects.filter((p) => present.has(p.id)).map((p) => ({ id: p.id, name: p.name, color: p.color }))
  if (present.has(NO_PROJECT)) out.push({ id: NO_PROJECT, name: 'Sans matière', color: NO_PROJECT_COLOR })
  return out
}

/** Stacked bars of focused time per bucket, one segment per project. */
export function FocusChart({ buckets, projects, hourly }: { buckets: Buckets; projects: Project[]; hourly: boolean }) {
  useSettings((s) => s.colorMode) // re-read theme tokens on mode change
  const [table, setTable] = useState(false)
  const series = seriesOf(buckets.series.keys(), projects)
  const unit = hourly ? 60_000 : 3_600_000
  const muted = cssVar('--muted')
  const line = cssVar('--line')
  const surface = cssVar('--panel-strong')
  const totals = buckets.labels.map((_, i) => series.reduce((n, s) => n + buckets.series.get(s.id)![i], 0))

  // Round only the top segment of each stack (4 px data-end), square elsewhere.
  const radius = (ctx: ScriptableContext<'bar'>) => {
    const i = ctx.dataIndex
    for (let d = series.length - 1; d >= 0; d--) {
      if (buckets.series.get(series[d].id)![i] > 0) return d === ctx.datasetIndex ? { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 } : 0
    }
    return 0
  }

  if (!series.length) return <p className="py-16 text-center text-sm text-muted">Aucune session sur cette période.</p>

  return (
    <div>
      <div className="h-64">
        <Bar
          aria-label="Temps de focus par matière"
          role="img"
          data={{
            labels: buckets.labels,
            datasets: series.map((s) => ({
              label: s.name,
              data: buckets.series.get(s.id)!.map((ms) => ms / unit),
              backgroundColor: s.color,
              borderColor: surface,
              borderWidth: { top: series.length > 1 ? 2 : 0 },
              borderSkipped: 'start',
              borderRadius: radius,
              maxBarThickness: 28,
            })),
          }}
          options={{
            maintainAspectRatio: false,
            animation: { duration: 300 },
            interaction: { mode: 'index', intersect: false },
            scales: {
              x: { stacked: true, grid: { display: false }, border: { color: line }, ticks: { color: muted, autoSkip: true, maxRotation: 0 } },
              y: {
                stacked: true,
                beginAtZero: true,
                grid: { color: line },
                border: { display: false },
                ticks: { color: muted, maxTicksLimit: 5, callback: (v) => `${v} ${hourly ? 'min' : 'h'}` },
              },
            },
            plugins: {
              legend: {
                display: series.length > 1,
                position: 'bottom',
                labels: { color: muted, usePointStyle: true, pointStyle: 'rectRounded', boxWidth: 10, padding: 14 },
              },
              tooltip: {
                filter: (item) => (item.raw as number) > 0,
                callbacks: {
                  label: (item) => ` ${item.dataset.label} : ${formatDuration((item.raw as number) * unit)}`,
                  footer: (items) => (items.length > 1 ? `Total : ${formatDuration(totals[items[0].dataIndex])}` : ''),
                },
              },
            },
          }}
        />
      </div>
      <div className="mt-2 text-right">
        <Btn variant="ghost" className="px-2 py-1 text-xs" aria-expanded={table} onClick={() => setTable(!table)}>
          {table ? 'Masquer le tableau' : 'Voir en tableau'}
        </Btn>
      </div>
      {table && (
        <table className="mt-2 w-full text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="py-1 font-normal">{hourly ? 'Heure' : 'Jour'}</th>
              {series.map((s) => (
                <th key={s.id} className="py-1 font-normal">{s.name}</th>
              ))}
              <th className="py-1 text-right font-normal">Total</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {buckets.labels.map((l, i) =>
              totals[i] ? (
                <tr key={i} className="border-t border-line">
                  <td className="py-1">{l}</td>
                  {series.map((s) => (
                    <td key={s.id} className="py-1">{formatDuration(buckets.series.get(s.id)![i])}</td>
                  ))}
                  <td className="py-1 text-right">{formatDuration(totals[i])}</td>
                </tr>
              ) : null,
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}
