import { noiseBuffer, type NoiseKind } from './noise'

/** Starts a sound layer into `out`; returns its stop function. */
export type Layer = (ctx: AudioContext, out: AudioNode) => () => void

const rand = (a: number, b: number) => a + Math.random() * (b - a)

function noiseSource(ctx: BaseAudioContext, kind: NoiseKind, loop = true) {
  const s = ctx.createBufferSource()
  s.buffer = noiseBuffer(ctx, kind)
  s.loop = loop
  return s
}

function filter(ctx: BaseAudioContext, type: BiquadFilterType, freq: number, Q = 0.7) {
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  f.Q.value = Q
  return f
}

function chain(...nodes: AudioNode[]) {
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1])
}

/** Continuous filtered noise, optionally swelling with two slow, detuned LFOs (never repeats exactly). */
function bed(kind: NoiseKind, filters: [BiquadFilterType, number, number?][], level: number, swell = 0, speed = 1): Layer {
  return (ctx, out) => {
    const src = noiseSource(ctx, kind)
    const g = ctx.createGain()
    g.gain.value = level
    chain(src, ...filters.map(([t, f, q]) => filter(ctx, t, f, q)), g, out)
    src.start(0, rand(0, src.buffer!.duration))
    const lfos = swell
      ? [0.047, 0.113].map((f) => {
          const o = ctx.createOscillator()
          const depth = ctx.createGain()
          o.frequency.value = f * speed * rand(0.8, 1.2)
          depth.gain.value = (level * swell) / 2
          chain(o, depth)
          depth.connect(g.gain)
          o.start()
          return o
        })
      : []
    return () => {
      src.stop()
      lfos.forEach((o) => o.stop())
      g.disconnect()
    }
  }
}

/** Short filtered noise burst — droplets, crackles, clicks. */
function burst(ctx: AudioContext, out: AudioNode, when: number, dur: number, gain: number, type: BiquadFilterType, freq: number, Q = 1) {
  const src = noiseSource(ctx, 'white', false)
  const g = ctx.createGain()
  g.gain.setValueAtTime(gain, when)
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur)
  chain(src, filter(ctx, type, freq, Q), g, out)
  src.start(when, rand(0, 10), dur + 0.02)
}

/** Poisson-distributed one-shots (or `gap()` seconds apart), scheduled a little ahead on the audio clock. */
function events(rate: number, fire: (ctx: AudioContext, out: AudioNode, when: number) => void, gap = () => -Math.log(1 - Math.random()) / rate): Layer {
  return (ctx, out) => {
    const g = ctx.createGain()
    g.connect(out)
    let next = ctx.currentTime + rand(0, 1 / rate)
    const id = setInterval(() => {
      const now = ctx.currentTime
      while (next < now + 0.4) {
        if (next >= now) fire(ctx, g, next)
        next += gap()
      }
    }, 150)
    return () => {
      clearInterval(id)
      g.disconnect()
    }
  }
}

const combine = (...layers: Layer[]): Layer => (ctx, out) => {
  const stops = layers.map((l) => l(ctx, out))
  return () => stops.forEach((s) => s())
}

function droplet(ctx: AudioContext, out: AudioNode, when: number) {
  const f = rand(1400, 4000)
  const a = rand(0.015, 0.07)
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.frequency.setValueAtTime(f, when)
  o.frequency.exponentialRampToValueAtTime(f * 0.55, when + 0.06)
  g.gain.setValueAtTime(0.0001, when)
  g.gain.linearRampToValueAtTime(a, when + 0.003)
  g.gain.exponentialRampToValueAtTime(0.0001, when + rand(0.05, 0.12))
  chain(o, g, out)
  o.start(when)
  o.stop(when + 0.15)
  burst(ctx, out, when, 0.012, a * 0.8, 'highpass', 3500)
}

function thunder(ctx: AudioContext, out: AudioNode, when: number) {
  const dur = rand(5, 9)
  const src = noiseSource(ctx, 'brown', false)
  const g = ctx.createGain()
  const peak1 = when + rand(0.3, 1)
  const peak2 = peak1 + rand(0.8, 2)
  g.gain.setValueAtTime(0.0001, when)
  g.gain.exponentialRampToValueAtTime(rand(0.4, 0.7), peak1)
  g.gain.exponentialRampToValueAtTime(0.25, peak1 + 0.6)
  g.gain.exponentialRampToValueAtTime(rand(0.7, 1), peak2)
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur)
  chain(src, filter(ctx, 'lowpass', 140), filter(ctx, 'lowpass', 320), g, out)
  src.start(when, rand(0, 3), dur + 0.1)
}

function crackle(ctx: AudioContext, out: AudioNode, when: number) {
  const count = Math.random() < 0.18 ? Math.floor(rand(2, 6)) : 1 // wood crackles come in clusters
  for (let i = 0; i < count; i++) {
    const t = when + (i ? rand(0, 0.18) : 0)
    if (Math.random() < 0.08) burst(ctx, out, t, rand(0.04, 0.08), rand(0.2, 0.45), 'bandpass', rand(300, 800), 1.5)
    else burst(ctx, out, t, rand(0.004, 0.02), 0.05 + Math.random() ** 2 * 0.5, 'bandpass', rand(900, 5000), 0.8)
  }
}

/** A short sine note gliding from f0 to f1, with a fast attack and exponential decay. */
function tone(ctx: AudioContext, out: AudioNode, when: number, f0: number, f1: number, dur: number, gain: number) {
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.frequency.setValueAtTime(f0, when)
  o.frequency.exponentialRampToValueAtTime(f1, when + dur)
  g.gain.setValueAtTime(0.0001, when)
  g.gain.linearRampToValueAtTime(gain, when + Math.min(0.01, dur / 4))
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur)
  chain(o, g, out)
  o.start(when)
  o.stop(when + dur + 0.02)
}

function panned(ctx: AudioContext, out: AudioNode, pan: number) {
  const p = ctx.createStereoPanner()
  p.pan.value = pan
  p.connect(out)
  return p
}

/** A bird phrase somewhere in the trees: a few whistles, falling chirps or a fast trill. */
function bird(ctx: AudioContext, out: AudioNode, when: number) {
  const p = panned(ctx, out, rand(-0.8, 0.8))
  const base = rand(2200, 4200)
  const vol = rand(0.015, 0.06)
  const kind = Math.floor(rand(0, 3))
  const notes = kind === 2 ? Math.floor(rand(6, 14)) : Math.floor(rand(2, 5))
  const step = kind === 2 ? rand(0.05, 0.07) : rand(0.12, 0.25)
  for (let i = 0; i < notes; i++) {
    const t = when + i * step
    const f = kind === 0 ? base * rand(0.9, 1.15) : base * (1 + i * 0.02)
    if (kind === 1) tone(ctx, p, t, f * 1.25, f * 0.8, rand(0.06, 0.12), vol)
    else tone(ctx, p, t, f * 0.85, f * 1.2, kind === 2 ? 0.035 : rand(0.08, 0.14), vol)
  }
}

/** Water bubbling over stones: tiny rising blips. */
function bubble(ctx: AudioContext, out: AudioNode, when: number) {
  const f = rand(400, 1400)
  tone(ctx, out, when, f, f * rand(1.4, 1.8), rand(0.03, 0.06), rand(0.008, 0.035))
}

/** One wave: a low swell that rises, breaks (the filter opens) and drains back over the sand. */
function wave(ctx: AudioContext, out: AudioNode, when: number) {
  const rise = rand(1.8, 3)
  const wash = rand(3.5, 6)
  const peak = rand(0.5, 1)
  const src = noiseSource(ctx, 'pink', false)
  const f = filter(ctx, 'lowpass', 250, 0.5)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, when)
  g.gain.exponentialRampToValueAtTime(peak * 0.5, when + rise * 0.8)
  g.gain.linearRampToValueAtTime(peak, when + rise)
  g.gain.exponentialRampToValueAtTime(0.0001, when + rise + wash)
  f.frequency.setValueAtTime(250, when)
  f.frequency.exponentialRampToValueAtTime(rand(1800, 3200), when + rise)
  f.frequency.exponentialRampToValueAtTime(500, when + rise + wash)
  chain(src, f, g, panned(ctx, out, rand(-0.4, 0.4)))
  src.start(when, rand(0, 3), rise + wash + 0.1)
}

/** Cup, spoon or plate: a few inharmonic partials with a fast decay. */
function clink(ctx: AudioContext, out: AudioNode, when: number) {
  const p = panned(ctx, out, rand(-0.7, 0.7))
  const hits = Math.random() < 0.25 ? 2 : 1
  for (let h = 0; h < hits; h++) {
    const t = when + h * rand(0.08, 0.2)
    const f = rand(1400, 3000)
    const a = rand(0.015, 0.06)
    const d = rand(0.12, 0.35)
    for (const [ratio, amp] of [[1, 1], [2.76, 0.5], [5.4, 0.25]]) tone(ctx, p, t, f * ratio, f * ratio * 0.998, d / Math.sqrt(ratio), a * amp)
  }
}

/** Espresso machine: a short pump hum, then a burst of steam. */
function espresso(ctx: AudioContext, out: AudioNode, when: number) {
  const hum = rand(1.5, 3)
  const o = ctx.createOscillator()
  const hg = ctx.createGain()
  o.type = 'sawtooth'
  o.frequency.value = rand(48, 52)
  hg.gain.setValueAtTime(0.0001, when)
  hg.gain.linearRampToValueAtTime(0.03, when + 0.2)
  hg.gain.exponentialRampToValueAtTime(0.0001, when + hum)
  chain(o, filter(ctx, 'lowpass', 300), hg, out)
  o.start(when)
  o.stop(when + hum + 0.05)
  const t = when + hum
  const d = rand(2.5, 5)
  const src = noiseSource(ctx, 'white', false)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(rand(0.1, 0.2), t + 0.3)
  g.gain.exponentialRampToValueAtTime(0.0001, t + d)
  chain(src, filter(ctx, 'bandpass', rand(2500, 4500), 1.2), g, out)
  src.start(t, rand(0, 5), d + 0.1)
}

/** A car passing in the wet street below: filtered noise that swells and crosses the stereo field. */
function car(ctx: AudioContext, out: AudioNode, when: number) {
  const d = rand(3, 6)
  const dir = Math.random() < 0.5 ? -1 : 1
  const src = noiseSource(ctx, 'pink', false)
  const f = filter(ctx, 'lowpass', 400)
  const g = ctx.createGain()
  const p = ctx.createStereoPanner()
  p.pan.setValueAtTime(-0.8 * dir, when)
  p.pan.linearRampToValueAtTime(0.8 * dir, when + d)
  g.gain.setValueAtTime(0.0001, when)
  g.gain.exponentialRampToValueAtTime(rand(0.12, 0.3), when + d / 2)
  g.gain.exponentialRampToValueAtTime(0.0001, when + d)
  f.frequency.setValueAtTime(400, when)
  f.frequency.linearRampToValueAtTime(rand(900, 1500), when + d / 2)
  f.frequency.linearRampToValueAtTime(400, when + d)
  chain(src, f, g, p, out)
  src.start(when, rand(0, 5), d + 0.1)
}

// Am9 → Fmaj9 → Cmaj7 → G6, voice-led (MIDI notes).
const CHORDS = [[57, 60, 64, 67, 71], [53, 57, 60, 64, 67], [52, 55, 59, 60, 64], [55, 59, 62, 64, 67]]
const hz = (m: number) => 440 * 2 ** ((m - 69) / 12)

/** Soft synthwave pad: detuned saws behind a breathing low-pass, gliding to the next chord every 12 s. */
const pad: Layer = (ctx, out) => {
  const g = ctx.createGain()
  g.gain.value = 0.04
  const lp = filter(ctx, 'lowpass', 900, 0.8)
  const lfo = ctx.createOscillator()
  const depth = ctx.createGain()
  lfo.frequency.value = 0.05
  depth.gain.value = 400
  chain(lfo, depth)
  depth.connect(lp.frequency)
  chain(lp, g, out)
  lfo.start()
  const voices = CHORDS[0].map((m) =>
    [-7, 7].map((cents) => {
      const o = ctx.createOscillator()
      o.type = 'sawtooth'
      o.frequency.value = hz(m)
      o.detune.value = cents
      o.connect(lp)
      o.start()
      return o
    }),
  )
  let i = 0
  const id = setInterval(() => {
    i = (i + 1) % CHORDS.length
    CHORDS[i].forEach((m, v) => voices[v].forEach((o) => o.frequency.setTargetAtTime(hz(m), ctx.currentTime, 0.8)))
  }, 12000)
  return () => {
    clearInterval(id)
    voices.flat().forEach((o) => o.stop())
    lfo.stop()
    g.disconnect()
  }
}

export const LAYERS = {
  rain: bed('pink', [['highpass', 400], ['lowpass', 7500]], 0.9, 0.25),
  drops: events(4, droplet),
  thunder: events(1 / 70, thunder),
  crackle: events(3.2, crackle),
  roar: bed('brown', [['lowpass', 380], ['highpass', 35]], 1, 0.5, 5),
  rainOut: bed('pink', [['highpass', 200], ['lowpass', 1600]], 0.8, 0.2),
  brown: bed('brown', [['lowpass', 900]], 1),
  rainLight: bed('pink', [['highpass', 1200], ['lowpass', 6000]], 0.55, 0.2),
  wind: bed('pink', [['bandpass', 700, 0.4], ['lowpass', 2600]], 0.8, 0.9, 1.6),
  birds: events(0.35, bird),
  stream: combine(bed('white', [['bandpass', 1500, 0.6], ['lowpass', 4500]], 0.5, 0.5, 8), events(14, bubble)),
  waves: combine(bed('brown', [['lowpass', 420]], 0.5, 0.4, 0.6), events(1 / 7, wave, () => rand(5.5, 9))),
  foam: bed('white', [['highpass', 3000], ['lowpass', 10000]], 0.3, 0.9, 1.3),
  murmur: combine(
    bed('pink', [['bandpass', 400, 1.2], ['lowpass', 2500]], 0.55, 0.8, 35),
    bed('pink', [['bandpass', 1000, 1.5]], 0.35, 0.9, 50),
    bed('pink', [['bandpass', 2400, 2]], 0.12, 0.9, 70),
    bed('brown', [['lowpass', 220]], 0.35, 0.3),
  ),
  clinks: events(0.6, clink),
  espresso: events(1 / 40, espresso, () => rand(25, 60)),
  city: combine(bed('brown', [['lowpass', 300], ['highpass', 30]], 0.7, 0.3, 0.5), events(1 / 9, car)),
  pad,
} satisfies Record<string, Layer>

export type LayerKind = keyof typeof LAYERS
