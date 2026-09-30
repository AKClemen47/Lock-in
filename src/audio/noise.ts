export type NoiseKind = 'white' | 'pink' | 'brown'

const SECONDS = 12
const FADE = 0.5
const cache = new WeakMap<BaseAudioContext, Partial<Record<NoiseKind, AudioBuffer>>>()

function generate(kind: NoiseKind, len: number): Float32Array {
  const out = new Float32Array(len)
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1
    if (kind === 'white') out[i] = w
    else if (kind === 'pink') {
      // Paul Kellet's refined pink filter
      b0 = 0.99886 * b0 + w * 0.0555179
      b1 = 0.99332 * b1 + w * 0.0750759
      b2 = 0.969 * b2 + w * 0.153852
      b3 = 0.8665 * b3 + w * 0.3104856
      b4 = 0.55 * b4 + w * 0.5329522
      b5 = -0.7616 * b5 - w * 0.016898
      out[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362
      b6 = w * 0.115926
    } else {
      last = (last + 0.02 * w) / 1.02
      out[i] = last
    }
  }
  let sum = 0
  for (let i = 0; i < len; i++) sum += out[i] * out[i]
  const gain = 0.2 / Math.sqrt(sum / len) // same loudness for every colour
  for (let i = 0; i < len; i++) out[i] *= gain
  return out
}

/**
 * A loopable noise buffer. The head is cross-faded with extra samples generated past the end,
 * so the loop point is continuous (no click, even for brown noise).
 */
export function noiseBuffer(ctx: BaseAudioContext, kind: NoiseKind): AudioBuffer {
  const hit = cache.get(ctx)?.[kind]
  if (hit) return hit
  const n = Math.floor(ctx.sampleRate * SECONDS)
  const f = Math.floor(ctx.sampleRate * FADE)
  const raw = generate(kind, n + f)
  const buf = ctx.createBuffer(1, n, ctx.sampleRate)
  const data = buf.getChannelData(0)
  data.set(raw.subarray(0, n))
  for (let i = 0; i < f; i++) {
    const t = i / f
    data[i] = raw[i] * Math.sqrt(t) + raw[n + i] * Math.sqrt(1 - t)
  }
  cache.set(ctx, { ...cache.get(ctx), [kind]: buf })
  return buf
}
