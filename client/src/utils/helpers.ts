export function randomName(): string {
  const adjectives = [
    'brave',
    'clever',
    'fierce',
    'gentle',
    'happy',
    'mighty',
    'quick',
    'silent',
    'sneaky',
    'wild',
    'bright',
    'cool',
    'fuzzy',
    'glowing',
    'icy',
    'jolly',
    'lazy',
    'lucky',
    'noble',
    'proud',
    'quiet',
    'rapid',
    'shiny',
    'sleepy',
    'smoky',
    'stormy',
    'sunny',
    'swift',
    'tiny',
    'witty',
    'zany',
    'angry',
    'bold',
    'calm',
    'dark',
    'dusty',
    'eager',
    'fancy',
    'frozen',
    'grumpy',
    'honest',
    'kind',
    'loud',
    'magic',
    'nifty',
    'peppy',
    'quirky',
    'rough',
    'sharp',
    'tough',
    'vivid',
  ]
  const nouns = [
    'fox',
    'tiger',
    'panda',
    'eagle',
    'shark',
    'lion',
    'dragon',
    'wolf',
    'bear',
    'otter',
    'owl',
    'hawk',
    'panther',
    'rabbit',
    'cheetah',
    'koala',
    'zebra',
    'rhino',
    'swan',
    'penguin',
    'moon',
    'star',
    'cloud',
    'river',
    'mountain',
    'ocean',
    'forest',
    'desert',
    'storm',
    'thunder',
    'flame',
    'shadow',
    'blade',
    'arrow',
    'shield',
    'spear',
    'hammer',
    'stone',
    'sky',
    'tree',
    'flower',
    'leaf',
    'fire',
    'wind',
    'ice',
    'crystal',
    'comet',
    'nova',
    'orbit',
    'planet',
    'galaxy',
  ]
  return (
    adjectives[Math.floor(Math.random() * adjectives.length)] +
    ' ' +
    nouns[Math.floor(Math.random() * nouns.length)]
  )
}

export function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return '0.0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  const value = (bytes / Math.pow(k, i)).toFixed(decimals)
  return `${value} ${sizes[i]}`
}

export function formatTime(seconds: number) {
  const hh = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, '0')
  const mm = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, '0')
  const ss = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0')

  return `${hh}:${mm}:${ss}`
}

export function formatVideoTime(seconds: number): string {
  if (seconds < 0) seconds = 0
  const hours = Math.floor(seconds / 3600)
  const remainingAfterHours = seconds % 3600
  const minutes = Math.floor(remainingAfterHours / 60)
  const secs = Math.floor(remainingAfterHours % 60)

  const pad = (num: number): string => num.toString().padStart(2, '0')

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`
  } else {
    return `${pad(minutes)}:${pad(secs)}`
  }
}

export function hasAudio(video?: HTMLVideoElement) {
  // console.log(video?)
  return (
    // @ts-expect-error ts doenst have those properties for whatever reason
    video?.mozHasAudio ||
    // @ts-expect-error ts doenst have those properties for whatever reason
    Boolean(video?.webkitAudioDecodedByteCount) ||
    // @ts-expect-error ts doenst have those properties for whatever reason
    Boolean(video?.audioTracks && video?.audioTracks?.length)
  )
}
