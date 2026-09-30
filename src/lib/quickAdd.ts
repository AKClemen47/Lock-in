import { addDays, fromKey, toKey } from './time'

export type Priority = 1 | 2 | 3 | 4

export interface ParsedTask {
  title: string
  projectName: string | null
  priority: Priority | null
  dueDate: string | null
  dueTime: string | null
  estimate: number | null
}

/** Lowercase, no accents, typographic apostrophes folded — for matching words and names. */
export const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/’/g, "'").toLowerCase().trim()

const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

function parseDateWord(word: string, today: string): string | null {
  if (word === "aujourd'hui" || word === 'auj') return today
  if (word === 'demain') return addDays(today, 1)
  if (word === 'apres-demain') return addDays(today, 2)
  const wd = WEEKDAYS.indexOf(word)
  if (wd >= 0) {
    // Next occurrence strictly after today: typing "lundi" on a Monday means next week.
    const diff = (wd - fromKey(today).getDay() + 7) % 7 || 7
    return addDays(today, diff)
  }
  const m = word.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?$/)
  if (!m) return null
  const [day, month] = [Number(m[1]), Number(m[2])]
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const t = fromKey(today)
  let year = m[3] ? Number(m[3].length === 2 ? `20${m[3]}` : m[3]) : t.getFullYear()
  let d = new Date(year, month - 1, day)
  if (d.getMonth() !== month - 1) return null
  if (!m[3] && d < t) d = new Date(++year, month - 1, day)
  return toKey(d)
}

/**
 * Quick-add syntax: `Réviser ch.3 #Maths !1 demain 18h ~3`
 * `#matière` (underscores = spaces), `!1`–`!4` priority, a date word or jj/mm[/aaaa],
 * `18h` / `18h30` time, `~3` estimated pomodoros. Everything else is the title.
 */
export function parseQuickAdd(input: string, today: string): ParsedTask {
  const out: ParsedTask = { title: '', projectName: null, priority: null, dueDate: null, dueTime: null, estimate: null }
  const rest: string[] = []
  for (const token of input.trim().split(/\s+/)) {
    const word = normalize(token)
    let m: RegExpMatchArray | null
    if ((m = token.match(/^#([\p{L}\p{N}_\-.]+)$/u))) out.projectName = m[1].replace(/_/g, ' ')
    else if ((m = word.match(/^!([1-4])$/))) out.priority = Number(m[1]) as Priority
    else if ((m = word.match(/^~(\d{1,2})$/))) out.estimate = Number(m[1])
    else if ((m = word.match(/^([01]?\d|2[0-3])h([0-5]\d)?$/)))
      out.dueTime = `${m[1].padStart(2, '0')}:${m[2] ?? '00'}`
    else {
      const date = parseDateWord(word, today)
      if (date) out.dueDate = date
      else rest.push(token)
    }
  }
  out.title = rest.join(' ')
  if (out.dueTime && !out.dueDate) out.dueDate = today
  return out
}

/** Find a project by name: exact match first, then prefix, singular included (`#maths` → « Mathématiques »). */
export function matchProject<T extends { name: string; archived?: boolean }>(name: string, projects: T[]): T | null {
  const n = normalize(name)
  const stem = n.length > 3 ? n.replace(/s$/, '') : n
  const live = projects.filter((p) => !p.archived)
  return (
    live.find((p) => normalize(p.name) === n) ??
    live.find((p) => normalize(p.name).startsWith(n)) ??
    live.find((p) => normalize(p.name).startsWith(stem)) ??
    null
  )
}
