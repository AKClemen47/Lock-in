import { audio, buses } from './engine'

interface TrackRef {
  id: string
  name: string
  blob: Blob
}

let el: HTMLAudioElement | null = null
let tracks: TrackRef[] = []
let index = 0
let url: string | null = null
let wanted = false
const listeners = new Set<() => void>()

function ensureElement(): HTMLAudioElement {
  if (!el) {
    el = new Audio()
    el.addEventListener('ended', () => nextTrack())
    audio().createMediaElementSource(el).connect(buses().musicBus)
  }
  return el
}

function load(i: number) {
  const player = ensureElement()
  if (url) URL.revokeObjectURL(url)
  url = URL.createObjectURL(tracks[i].blob)
  player.src = url
  listeners.forEach((l) => l())
}

/** Imported tracks, in playlist order. */
export function setTracks(list: TrackRef[]) {
  const currentId = tracks[index]?.id
  tracks = list
  const keep = list.findIndex((t) => t.id === currentId)
  if (keep >= 0) {
    index = keep
    return
  }
  index = 0
  if (el) {
    el.pause()
    el.removeAttribute('src')
  }
  if (wanted) playMusic()
}

export function playMusic() {
  wanted = true
  if (!tracks.length) return
  const player = ensureElement()
  if (!player.src) load(index)
  void player.play().catch(() => {})
}

export function pauseMusic() {
  wanted = false
  el?.pause()
}

export function nextTrack() {
  if (!tracks.length) return
  index = (index + 1) % tracks.length
  load(index)
  if (wanted) void el!.play().catch(() => {})
}

export const currentTrack = () => (tracks.length ? tracks[index].name : null)

export function onTrackChange(fn: () => void) {
  listeners.add(fn)
  return () => void listeners.delete(fn)
}
