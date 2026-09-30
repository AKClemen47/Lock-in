import { useEffect, useState } from 'react'
import { PROJECT_COLORS, PROJECT_ICONS, type Project } from '../../lib/db'
import { addProject, deleteProject, updateProject } from '../../lib/repo'
import { toast, useUi } from '../../store/ui'
import { Btn, Modal, Toggle, cx, inputClass } from '../../components/ui'

/** `project` undefined = closed, null = new project. */
export function ProjectEditor({ project, onClose }: { project: Project | null | undefined; onClose: () => void }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(PROJECT_COLORS[0])
  const [icon, setIcon] = useState(PROJECT_ICONS[0])
  const [goal, setGoal] = useState('')
  const [archived, setArchived] = useState(false)
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (project === undefined) return
    setName(project?.name ?? '')
    setColor(project?.color ?? PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)])
    setIcon(project?.icon ?? PROJECT_ICONS[0])
    setGoal(project?.weeklyGoal ? String(project.weeklyGoal) : '')
    setArchived(project?.archived ?? false)
    setArmed(false)
  }, [project])

  const save = async () => {
    if (!name.trim()) return
    const data = { name: name.trim(), color, icon, archived, weeklyGoal: Number(goal) > 0 ? Number(goal) : null }
    if (project) await updateProject(project.id, data)
    else {
      const p = await addProject(data)
      useUi.getState().set({ list: { kind: 'project', id: p.id }, view: 'tasks' })
    }
    onClose()
  }

  const remove = async () => {
    if (!project) return
    if (!armed) return setArmed(true)
    await deleteProject(project.id)
    const ui = useUi.getState()
    if (ui.list.kind === 'project' && ui.list.id === project.id) ui.set({ list: { kind: 'smart', id: 'today' } })
    toast(`Subject "${project.name}" deleted — its tasks are now in "No subject"`)
    onClose()
  }

  return (
    <Modal open={project !== undefined} onClose={onClose} title={project ? 'Edit subject' : 'New subject'}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <label className="block">
          <span className="mb-1 block text-xs text-muted">Name</span>
          <input autoFocus className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mathematics" />
        </label>
        <fieldset>
          <legend className="mb-1 text-xs text-muted">Colour</legend>
          <div className="flex flex-wrap gap-2">
            {PROJECT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Colour ${c}`}
                aria-pressed={c === color}
                onClick={() => setColor(c)}
                className={cx('size-8 rounded-full transition', c === color ? 'ring-2 ring-fg ring-offset-2 ring-offset-panel-strong' : 'hover:scale-110')}
                style={{ background: c }}
              />
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-1 text-xs text-muted">Icon</legend>
          <div className="flex flex-wrap gap-1">
            {PROJECT_ICONS.map((i) => (
              <button
                key={i}
                type="button"
                aria-label={`Icon ${i}`}
                aria-pressed={i === icon}
                onClick={() => setIcon(i)}
                className={cx('grid size-9 place-items-center rounded-lg text-lg transition', i === icon ? 'bg-line' : 'hover:bg-hover')}
              >
                {i}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="block">
          <span className="mb-1 block text-xs text-muted">Weekly goal (hours, optional)</span>
          <input type="number" min={0} step={0.5} className={inputClass} value={goal} onChange={(e) => setGoal(e.target.value)} />
        </label>
        {project && <Toggle label="Archive" hint="Hidden from lists, history kept" checked={archived} onChange={setArchived} />}
        <footer className="flex items-center gap-2 pt-2">
          {project && (
            <Btn variant="danger" onClick={() => void remove()}>
              {armed ? 'Confirm deletion' : 'Delete'}
            </Btn>
          )}
          <Btn variant="ghost" className="ml-auto" onClick={onClose}>Cancel</Btn>
          <button type="submit" disabled={!name.trim()} className="rounded-xl bg-accent px-3.5 py-2 text-sm font-semibold text-on-accent disabled:opacity-40">
            Save
          </button>
        </footer>
      </form>
    </Modal>
  )
}
