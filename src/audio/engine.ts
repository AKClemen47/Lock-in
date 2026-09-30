/** Audio graph: sources → bus (ambience | music | notif) → master → speakers. */

export interface MixerLevels {
  master: number
  ambience: number
  music: number
  notif: number
  muted: boolean
  alertsThroughMute: boolean
}

let ctx: AudioContext | null = null
let master: GainNode
let ambienceBus: GainNode
let musicBus: GainNode
let notifBus: GainNode
let levels: MixerLevels = { master: 0.8, ambience: 0.7, music: 0.5, notif: 0.8, muted: false, alertsThroughMute: true }

/** Sliders are linear; ears are not. */
const curve = (v: number) => v * v

export function audio(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext({ latencyHint: 'playback' })
    const bus = () => {
      const g = ctx!.createGain()
      g.gain.value = 0
      return g
    }
    master = bus()
    ambienceBus = bus()
    musicBus = bus()
    notifBus = bus()
    // Brick-wall limiter: louder ambiences and stacked sounds never clip.
    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = -3
    limiter.knee.value = 0
    limiter.ratio.value = 20
    limiter.attack.value = 0.003
    limiter.release.value = 0.25
    master.connect(limiter)
    limiter.connect(ctx.destination)
    for (const b of [ambienceBus, musicBus, notifBus]) b.connect(master)
    setLevels(levels)
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
  return ctx
}

export function buses() {
  audio()
  return { ambienceBus, musicBus, notifBus }
}

function ramp(p: AudioParam, v: number, seconds = 0.12) {
  const t = ctx!.currentTime
  p.cancelScheduledValues(t)
  p.setTargetAtTime(v, t, seconds / 3)
}

export function setLevels(l: MixerLevels) {
  levels = l
  if (!ctx) return
  const mute = l.muted
  ramp(master.gain, curve(l.master))
  ramp(ambienceBus.gain, mute ? 0 : curve(l.ambience))
  ramp(musicBus.gain, mute ? 0 : curve(l.music))
  ramp(notifBus.gain, mute && !l.alertsThroughMute ? 0 : curve(l.notif))
}

/** Browsers start audio suspended until a user gesture; resume on the first one. */
export function unlockOnGesture() {
  const unlock = () => {
    if (ctx?.state === 'suspended') void ctx.resume().catch(() => {})
  }
  window.addEventListener('pointerdown', unlock, { capture: true })
  window.addEventListener('keydown', unlock, { capture: true })
}

export const audioReady = () => ctx !== null
