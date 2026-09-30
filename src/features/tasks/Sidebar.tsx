import { useState, type ReactNode } from 'react'
import { create } from 'zustand'
import { BarChart3, CheckSquare, Pencil, Plus, Settings, Waves } from 'lucide-react'
import type { Project } from '../../lib/db'
import { useProjects, useTasks, useToday } from '../../lib/hooks'
import { useUi, type ListSel, type View } from '../../store/ui'
import { IconBtn, cx } from '../../components/ui'
import { ProjectEditor } from './ProjectEditor'
import { SMART_LISTS, inList } from './lists'

/** Project editor dialog, openable from the sidebar and the mobile chips. */
export const useProjectEditor = create<{ editing: Project | null | undefined }>()(() => ({ editing: undefined }))
export const editProject = (p: Project | null) => useProjectEditor.setState({ editing: p })

export function ProjectEditorHost() {
  const editing = useProjectEditor((s) => s.editing)
  return <ProjectEditor project={editing} onClose={() => useProjectEditor.setState({ editing: undefined })} />
}

const NAV: { view: View; label: string; icon: typeof CheckSquare }[] = [
  { view: 'tasks', label: 'Tâches', icon: CheckSquare },
  { view: 'stats', label: 'Statistiques', icon: BarChart3 },
  { view: 'ambience', label: 'Ambiances', icon: Waves },
  { view: 'settings', label: 'Réglages', icon: Settings },
]

const same = (a: ListSel, b: ListSel) => a.kind === b.kind && a.id === b.id

function useCounts() {
  const tasks = useTasks()
  const today = useToday()
  return (sel: ListSel) => tasks.filter((t) => inList(t, sel, today)).length
}

function Item({ active, onClick, children, count, late }: { active: boolean; onClick: () => void; children: ReactNode; count?: number; late?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cx('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm transition', active ? 'bg-line font-medium' : 'text-fg/85 hover:bg-hover')}
    >
      {children}
      {count ? <span className={cx('ml-auto text-xs tabular-nums', late ? 'text-red-400' : 'text-muted')}>{count}</span> : null}
    </button>
  )
}

export function Sidebar() {
  const { view, list, set } = useUi()
  const projects = useProjects()
  const count = useCounts()
  const [showArchived, setShowArchived] = useState(false)
  const pick = (sel: ListSel) => set({ list: sel, view: 'tasks' })
  const visible = projects.filter((p) => !p.archived)
  const archived = projects.filter((p) => p.archived)

  return (
    <aside className="glass flex h-full w-64 shrink-0 flex-col gap-4 overflow-y-auto rounded-2xl p-3">
      <div className="flex items-center gap-2 px-2 pt-1">
        <img src="/icon.svg" alt="" className="size-7" />
        <span className="text-lg font-semibold tracking-tight">Cocon</span>
      </div>

      <nav aria-label="Navigation principale" className="space-y-0.5">
        {NAV.map(({ view: v, label, icon: Icon }) => (
          <Item key={v} active={view === v} onClick={() => set({ view: v })}>
            <Icon size={16} className="text-muted" /> {label}
          </Item>
        ))}
      </nav>

      <section aria-label="Listes intelligentes" className="space-y-0.5 border-t border-line pt-3">
        {SMART_LISTS.filter((l) => l.id !== 'done').map((l) => {
          const sel: ListSel = { kind: 'smart', id: l.id }
          return (
            <Item key={l.id} active={view === 'tasks' && same(list, sel)} onClick={() => pick(sel)} count={count(sel)} late={l.id === 'overdue'}>
              <span className="w-4 text-center">{l.icon}</span> {l.label}
            </Item>
          )
        })}
      </section>

      <section aria-labelledby="projects-title" className="space-y-0.5 border-t border-line pt-3">
        <header className="flex items-center justify-between px-2.5 pb-1">
          <h2 id="projects-title" className="text-xs font-semibold uppercase tracking-wider text-muted">Matières</h2>
          <IconBtn label="Nouvelle matière" className="size-7" onClick={() => editProject(null)}>
            <Plus size={15} />
          </IconBtn>
        </header>
        {visible.length === 0 && <p className="px-2.5 text-xs text-muted">Crée une matière ou tape #Maths dans une tâche.</p>}
        {[...visible, ...(showArchived ? archived : [])].map((p) => {
          const sel: ListSel = { kind: 'project', id: p.id }
          return (
            <div key={p.id} className="group relative">
              <Item active={view === 'tasks' && same(list, sel)} onClick={() => pick(sel)} count={count(sel)}>
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: p.color }} />
                <span className={cx('truncate', p.archived && 'text-muted italic')}>
                  {p.icon} {p.name}
                </span>
              </Item>
              <IconBtn
                label={`Modifier ${p.name}`}
                className="absolute right-7 top-0.5 size-7 bg-panel-strong opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                onClick={() => editProject(p)}
              >
                <Pencil size={12} />
              </IconBtn>
            </div>
          )
        })}
        {archived.length > 0 && (
          <button type="button" className="px-2.5 pt-1 text-xs text-muted hover:text-fg" onClick={() => setShowArchived(!showArchived)}>
            {showArchived ? 'Masquer les archivées' : `Archivées (${archived.length})`}
          </button>
        )}
      </section>

      <div className="mt-auto border-t border-line pt-3">
        <Item active={view === 'tasks' && same(list, { kind: 'smart', id: 'done' })} onClick={() => pick({ kind: 'smart', id: 'done' })}>
          <span className="w-4 text-center">✅</span> Terminées
        </Item>
      </div>
    </aside>
  )
}

/** Mobile: horizontal list picker above the task list. */
export function ListChips() {
  const { list, set } = useUi()
  const projects = useProjects().filter((p) => !p.archived)
  const count = useCounts()
  const chips: { sel: ListSel; label: string; color?: string }[] = [
    ...SMART_LISTS.map((l) => ({ sel: { kind: 'smart', id: l.id } as ListSel, label: `${l.icon} ${l.label}` })),
    ...projects.map((p) => ({ sel: { kind: 'project', id: p.id } as ListSel, label: `${p.icon} ${p.name}`, color: p.color })),
  ]
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Listes">
      {chips.map(({ sel, label, color }) => {
        const n = sel.kind === 'smart' && sel.id === 'done' ? 0 : count(sel)
        return (
          <button
            key={sel.id}
            type="button"
            role="tab"
            aria-selected={same(list, sel)}
            onClick={() => set({ list: sel })}
            className={cx('shrink-0 rounded-full border px-3 py-1.5 text-xs whitespace-nowrap', same(list, sel) ? 'border-accent bg-accent/15' : 'border-line bg-panel')}
            style={color && same(list, sel) ? { borderColor: color } : undefined}
          >
            {label}
            {n > 0 && <span className="ml-1.5 text-muted">{n}</span>}
          </button>
        )
      })}
      <button type="button" onClick={() => editProject(null)} className="shrink-0 rounded-full border border-dashed border-line px-3 py-1.5 text-xs">
        + Matière
      </button>
    </div>
  )
}
