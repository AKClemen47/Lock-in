import type { Layer } from './layers'

/** Real field recordings in public/sounds/, looped without a seam and normalised to the same loudness. */

const XFADE = 2.5 // seconds of the tail cross-faded into the head
const TARGET_RMS = 10 ** (-24 / 20)

const cache = new Map<string, Promise<AudioBuffer>>()

/** Cross-fades the tail into the head once, so `loop = true` never clicks, and levels the result. */
function seamless(ctx: BaseAudioContext, src: AudioBuffer): AudioBuffer {
  const fade = Math.min(Math.floor(XFADE * src.sampleRate), Math.floor(src.length / 3))
  const len = src.length - fade
  const out = ctx.createBuffer(src.numberOfChannels, len, src.sampleRate)
  let sum = 0
  for (let c = 0; c < src.numberOfChannels; c++) {
    const a = src.getChannelData(c)
    const b = out.getChannelData(c)
    b.set(a.subarray(0, len))
    for (let i = 0; i < fade; i++) {
      const t = ((i / fade) * Math.PI) / 2 // equal-power
      b[i] = a[i] * Math.sin(t) + a[len + i] * Math.cos(t)
    }
    for (let i = 0; i < len; i++) sum += b[i] * b[i]
  }
  const k = Math.min(20, TARGET_RMS / (Math.sqrt(sum / (len * src.numberOfChannels)) || 1))
  for (let c = 0; c < out.numberOfChannels; c++) {
    const b = out.getChannelData(c)
    for (let i = 0; i < len; i++) b[i] *= k
  }
  return out
}

/** Keeps only [from, to] seconds, e.g. the steady part of a recording that starts and ends differently. */
function slice(ctx: BaseAudioContext, src: AudioBuffer, from: number, to: number): AudioBuffer {
  const a = Math.floor(from * src.sampleRate)
  const b = Math.min(src.length, Math.floor(to * src.sampleRate))
  if (a <= 0 && b >= src.length) return src
  const out = ctx.createBuffer(src.numberOfChannels, b - a, src.sampleRate)
  for (let c = 0; c < src.numberOfChannels; c++) out.copyToChannel(src.getChannelData(c).subarray(a, b), c)
  return out
}

function load(ctx: BaseAudioContext, name: string, from: number, to: number) {
  const key = `${name}:${from}:${to}`
  let p = cache.get(key)
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}sounds/${name}.ogg`)
      .then((r) => r.arrayBuffer())
      .then((data) => ctx.decodeAudioData(data))
      .then((buf) => seamless(ctx, slice(ctx, buf, from, to)))
    p.catch(() => cache.delete(key)) // offline or unsupported: retry next time, the synthesised layers still play
    cache.set(key, p)
  }
  return p
}

/** A looping recording (optionally only seconds `from`..`to`), starting at a random point and fading in once decoded. */
export const recording =
  (name: string, from = 0, to = Infinity): Layer =>
  (ctx, out) => {
    const g = ctx.createGain()
    g.gain.value = 0
    g.connect(out)
    let src: AudioBufferSourceNode | null = null
    let stopped = false
    load(ctx, name, from, to).then(
      (buf) => {
        if (stopped) return
        src = ctx.createBufferSource()
        src.buffer = buf
        src.loop = true
        src.connect(g)
        src.start(0, Math.random() * buf.duration)
        g.gain.setTargetAtTime(1, ctx.currentTime, 0.4)
      },
      () => {},
    )
    return () => {
      stopped = true
      src?.stop()
      g.disconnect()
    }
  }
