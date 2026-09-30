import type { ReactNode } from 'react'

const PETALS = 25
// A drop on the ring with its tip pointing outwards (viewBox centred on 0,0).
const PETAL = 'M0,-89 C3.2,-84 5,-80.5 5,-78 A5,5 0 0 1 -5,-78 C-5,-80.5 -3.2,-84 0,-89Z'

/** Focus To-Do style dial: a crown of petals that fill with the accent colour as the session goes by. */
export function PetalDial({ progress, running, size, children }: { progress: number; running: boolean; size: number | string; children?: ReactNode }) {
  const filled = Math.floor(Math.min(1, Math.max(0, progress)) * PETALS)
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="-100 -100 200 200" className="absolute inset-0 size-full overflow-visible drop-shadow-[0_0_5px_rgb(0_0_0/0.45)]" aria-hidden="true">
        {Array.from({ length: PETALS }, (_, i) => (
          <path
            key={i}
            d={PETAL}
            transform={`rotate(${(360 / PETALS) * i})`}
            className={i < filled ? 'petal on' : running && i === filled ? 'petal now' : 'petal'}
          />
        ))}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  )
}
