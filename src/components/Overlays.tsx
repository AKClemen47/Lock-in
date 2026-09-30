import { useEffect, useState, type CSSProperties } from 'react'
import { X } from 'lucide-react'
import { useUi } from '../store/ui'
import { useSettings } from '../store/settings'

export function Toasts() {
  const { toasts, dismiss } = useUi()
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="slide-in pointer-events-auto flex max-w-md items-center gap-3 rounded-xl border border-line bg-panel-strong py-2 pl-4 pr-2 text-sm shadow-xl">
          <span className="min-w-0 flex-1">{t.text}</span>
          {t.action && (
            <button
              type="button"
              className="rounded-lg px-2 py-1 font-semibold text-accent hover:bg-hover"
              onClick={() => {
                t.action!.run()
                dismiss(t.id)
              }}
            >
              {t.action.label}
            </button>
          )}
          <button type="button" aria-label="Fermer" className="rounded-full p-1 text-muted hover:bg-hover" onClick={() => dismiss(t.id)}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

const BITS = ['🌱', '✨', '🍃', '🌸', '⭐']

/** A short burst of rising leaves and sparkles when a focus session completes. */
export function Celebration() {
  const at = useUi((u) => u.celebrateAt)
  const enabled = useSettings((s) => s.celebrate)
  const [shown, setShown] = useState(0)
  useEffect(() => {
    if (!at || !enabled || Date.now() - at > 5000) return
    setShown(at)
    const id = setTimeout(() => setShown(0), 2600)
    return () => clearTimeout(id)
  }, [at, enabled])
  if (!shown) return null
  return (
    <div key={shown} className="pointer-events-none fixed inset-x-0 bottom-1/3 z-50 flex justify-center" aria-hidden="true">
      {Array.from({ length: 18 }, (_, i) => (
        <span
          key={i}
          className="absolute text-2xl"
          style={
            {
              '--dx': `${(Math.random() - 0.5) * 360}px`,
              '--rot': `${(Math.random() - 0.5) * 120}deg`,
              animation: `rise ${1.6 + Math.random() * 0.9}s ease-out ${Math.random() * 0.3}s both`,
            } as CSSProperties
          }
        >
          {BITS[i % BITS.length]}
        </span>
      ))}
    </div>
  )
}

/** Screen-reader announcements for phase changes. */
export function Announcer() {
  const text = useUi((u) => u.announcement)
  return (
    <div className="sr-only" aria-live="polite">
      {text}
    </div>
  )
}
