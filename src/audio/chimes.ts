import { audio, buses } from './engine'
import type { ChimeStyle } from '../store/settings'

export type ChimeKind = 'focusEnd' | 'breakEnd'

function tone(f: number, when: number, amp: number, decay: number, type: OscillatorType = 'sine') {
  const ctx = audio()
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.value = f
  g.gain.setValueAtTime(0.0001, when)
  g.gain.linearRampToValueAtTime(amp, when + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, when + decay)
  o.connect(g).connect(buses().notifBus)
  o.start(when)
  o.stop(when + decay + 0.05)
}

/** Inharmonic partials of a small bell. */
function bell(f: number, when: number, amp = 0.25) {
  const partials: [number, number, number][] = [[1, 1, 2.2], [2.01, 0.45, 1.4], [2.76, 0.3, 1], [4.07, 0.15, 0.6], [5.4, 0.08, 0.4]]
  for (const [ratio, a, d] of partials) tone(f * ratio, when, amp * a, d)
}

/** Singing bowl: two close tones beating slowly, long decay. */
function bowl(f: number, when: number) {
  tone(f, when, 0.22, 5.5)
  tone(f * 1.008, when, 0.18, 5)
  tone(f * 2.71, when, 0.05, 2.5)
}

export function playChime(kind: ChimeKind, style: ChimeStyle) {
  const t = audio().currentTime + 0.05
  const up = kind === 'focusEnd'
  if (style === 'cloche') {
    if (up) {
      bell(1046.5, t)
      bell(1318.5, t + 0.35)
    } else bell(880, t, 0.2)
  } else if (style === 'carillon') {
    const notes = up ? [523.3, 659.3, 784, 1046.5] : [784, 659.3, 523.3]
    notes.forEach((f, i) => tone(f, t + i * 0.17, 0.18, 1.2, 'triangle'))
  } else {
    bowl(up ? 330 : 440, t)
  }
}

/** Soft clock tick. */
export function playTick() {
  const ctx = audio()
  const t = ctx.currentTime + 0.01
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.frequency.value = 1900
  g.gain.setValueAtTime(0.04, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.012)
  o.connect(g).connect(buses().notifBus)
  o.start(t)
  o.stop(t + 0.02)
}
