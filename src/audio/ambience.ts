import { audio, buses } from './engine'
import { LAYERS, type LayerKind } from './layers'
import { THEME_GAIN } from './soundThemes'
import type { ThemeId } from '../store/settings'

interface Running {
  theme: ThemeId
  gain: GainNode
  layers: Map<string, { gain: GainNode; stop: () => void }>
}

let current: Running | null = null
let duck: GainNode | null = null

function duckNode() {
  if (!duck) {
    duck = audio().createGain()
    duck.connect(buses().ambienceBus)
  }
  return duck
}

function fadeOutAndStop(r: Running, seconds: number) {
  const ctx = audio()
  r.gain.gain.cancelScheduledValues(ctx.currentTime)
  r.gain.gain.setTargetAtTime(0, ctx.currentTime, seconds / 4)
  setTimeout(() => {
    r.layers.forEach((l) => l.stop())
    r.gain.disconnect()
  }, seconds * 1000 + 200)
}

function setLayer(r: Running, id: string, v: number) {
  const ctx = audio()
  const vol = v * v
  let layer = r.layers.get(id)
  if (!layer) {
    if (vol <= 0) return // layers are only started once audible
    const gain = ctx.createGain()
    gain.gain.value = 0
    gain.connect(r.gain)
    layer = { gain, stop: LAYERS[id as LayerKind](ctx, gain) }
    r.layers.set(id, layer)
  }
  layer.gain.gain.setTargetAtTime(vol, ctx.currentTime, 0.1)
}

/** Play (or cross-fade to) a sound theme with the given layer volumes. */
export function playAmbience(theme: ThemeId, mix: Record<string, number>, fade = 2.5) {
  const ctx = audio()
  if (current && current.theme !== theme) {
    fadeOutAndStop(current, 1.5)
    current = null
  }
  if (!current) {
    const gain = ctx.createGain()
    gain.gain.value = 0
    gain.connect(duckNode())
    current = { theme, gain, layers: new Map() }
  }
  for (const [id, v] of Object.entries(mix)) setLayer(current, id, v)
  current.gain.gain.cancelScheduledValues(ctx.currentTime)
  current.gain.gain.setTargetAtTime(THEME_GAIN[theme], ctx.currentTime, fade / 4)
}

export function stopAmbience(fade = 1.5) {
  if (!current) return
  fadeOutAndStop(current, fade)
  current = null
}

export function setLayerVolume(id: string, v: number) {
  if (current) setLayer(current, id, v)
}

/** Lower the ambience (e.g. during breaks) without stopping it. */
export function setDuck(factor: number) {
  const ctx = audio()
  duckNode().gain.setTargetAtTime(factor, ctx.currentTime, 0.8)
}

export const playingTheme = () => current?.theme ?? null
