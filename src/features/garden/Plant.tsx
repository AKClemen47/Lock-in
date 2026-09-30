import type { PlantOutcome } from '../../store/ui'

const ease = (x: number) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 3

/**
 * A plant that grows with the focus session: seed → sprout → young plant → flower.
 * `progress` 0..1; `outcome` overrides with a grown or wilted plant.
 */
export function Plant({ progress, outcome, size = 96 }: { progress: number; outcome: PlantOutcome; size?: number }) {
  const wilted = outcome === 'wilted'
  const p = outcome === 'grown' ? 1 : wilted ? 0.6 : progress
  const stem = 6 + 44 * ease(p)
  const top = 92 - stem
  const leaf = (at: number) => ease((p - at) / 0.2)
  const green = wilted ? '#9c8a5c' : '#6fcf8e'
  const dark = wilted ? '#7d6a45' : '#45a86a'
  const bend = wilted ? 18 : 0
  const label = wilted
    ? 'Plante fanée : session abandonnée'
    : outcome === 'grown'
      ? 'Plante en fleur : session réussie'
      : `Plante en croissance, ${Math.round(p * 100)} %`

  return (
    <svg viewBox="0 0 100 130" width={size} height={size * 1.3} role="img" aria-label={label}>
      <ellipse cx="50" cy="126" rx="30" ry="3" fill="black" opacity="0.15" />
      <path d="M26 96 h48 l-6 30 h-36 z" fill="#c98b6b" />
      <rect x="23" y="92" width="54" height="8" rx="3" fill="#b97a5b" />
      <ellipse cx="50" cy="93" rx="22" ry="3" fill="#5b3a2a" />
      {p < 0.06 ? (
        <ellipse cx="50" cy="91" rx="4" ry="3" fill="#a07850" />
      ) : (
        <g style={{ transition: 'all 1s ease' }}>
          <path d={`M50 92 Q${50 + bend / 2} ${92 - stem / 2} ${50 + bend} ${top}`} stroke={dark} strokeWidth="3" fill="none" strokeLinecap="round" />
          {[
            { at: 0.05, y: 0.25, dir: -1 },
            { at: 0.25, y: 0.45, dir: 1 },
            { at: 0.45, y: 0.65, dir: -1 },
            { at: 0.65, y: 0.82, dir: 1 },
          ].map(({ at, y, dir }, i) => {
            const s = leaf(at)
            if (s <= 0) return null
            const ly = 92 - stem * y
            const lx = 50 + bend * y
            return (
              <path
                key={i}
                d={`M${lx} ${ly} q${dir * 8 * s} ${-10 * s} ${dir * 18 * s} ${(wilted ? 6 : -4) * s} q${-dir * 8 * s} ${6 * s} ${-dir * 18 * s} ${(wilted ? -6 : 4) * s}`}
                fill={i % 2 ? green : dark}
              />
            )
          })}
          {p >= 0.95 && !wilted && (
            <g transform={`translate(${50 + bend} ${top})`}>
              {[0, 72, 144, 216, 288].map((a) => (
                <ellipse key={a} cx="0" cy="-7" rx="4.5" ry="7" fill="var(--accent)" transform={`rotate(${a})`} />
              ))}
              <circle r="4" fill="#ffd66b" />
            </g>
          )}
        </g>
      )}
    </svg>
  )
}
