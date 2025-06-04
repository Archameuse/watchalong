<template>
  <div
    tabindex="0"
    class="flex-grow w-full overflow-hidden relative focus-visible:outline-none"
    :class="controlsActive || !playing ? 'cursor-auto' : 'cursor-none'"
    ref="videoWrapperRef"
    @keydown="videoKey"
    @wheel="videoWheel"
    @mousemove="controlsUpdate"
  >
    <video
      @click="() => (playing ? pause(true) : unpause(true))"
      @dblclick="fullscreen"
      @waiting="videoBuffering"
      @progress="videoDownloading"
      muted
      loop
      @loadeddata="videoInit"
      @pause="videoPause"
      draggable="false"
      @playing="videoPlay"
      preload="auto"
      ref="videoRef"
      class="h-full w-full relative"
      :class="theatre || isFullscreen ? 'object-contain' : 'object-cover'"
      @ended="$emit('next')"
    >
      <source :src="url" ref="srcRef" />
    </video>
    <div
      :class="
        controlsActive || !playing
          ? 'opacity-100 pointer-events-auto'
          : 'opacity-0 pointer-events-none'
      "
      class="absolute top-0 left-0 w-full h-full bg-black mask-t-from-0% pointer-events-none transition-opacity"
    ></div>
    <div
      v-if="buffering"
      class="absolute pointer-events-none w-full h-full top-0 left-0 flex items-center justify-center backdrop-blur-sm"
    >
      <div class="h-32 aspect-square animate-spin text-extra2">
        <LoadingIcon />
      </div>
    </div>
    <div class="absolute top-0 left-0 bg-black" v-if="downloadspeed">
      {{ formatBytes(downloadspeed) }}ps
    </div>
    <div
      @click.stop.prevent
      :class="
        controlsActive || !playing
          ? 'opacity-100 pointer-events-auto'
          : 'opacity-0 pointer-events-none'
      "
      class="flex flex-col p-4 absolute bottom-0 w-full gap-4 transition-opacity"
    >
      <div
        class="w-full bg-extra2 rounded-full h-1.5 relative cursor-pointer group"
        ref="progressRef"
        @mousedown="seekProgress"
        @touchstart="seekProgress"
      >
        <div
          v-for="bar of downloading"
          v-bind:key="bar.left"
          class="bg-secondary h-full rounded-full absolute left-0 top-0 pointer-events-none"
          :style="{ left: bar.left, width: bar.width }"
        ></div>
        <div
          class="bg-thirdary h-full rounded-full absolute left-0 top-0 pointer-events-none"
          :style="{ width: (current / length) * 100 + '%' }"
        ></div>
        <aside
          class="absolute hidden group-hover:flex group-active:flex w-12 items-center justify-center bg-black pointer-events-none -top-12 left-0 z-50"
          ref="tooltipRef"
        >
          {{ formatVideoTime(tooltipTime) }}
        </aside>
      </div>
      <div class="flex flex-col md:flex-row gap-2 justify-between items-center text-thirdary">
        <div class="flex gap-4 items-center">
          <VideoButton @click="$emit('prev')"><PreviousIcon /></VideoButton>
          <VideoButton
            ><PlayIcon v-if="!playing" @click="() => unpause(true)" /><PauseIcon
              v-else
              @click="() => pause(true)"
          /></VideoButton>
          <VideoButton @click="$emit('next')"><NextIcon /></VideoButton>
          <div class="group flex h-8 gap-2" v-if="volume >= 0">
            <VideoButton class="group" @click="mute">
              <VolumeIcon :stage="volume > 60 ? 1 : volume > 0 ? 2 : 3" />
            </VideoButton>
            <input
              type="range"
              v-model="volume"
              class="cursor-pointer overflow-hidden transition-all w-0 group-hover:w-32"
            />
          </div>
          <span class="select-none text-nowrap"
            >{{ formatVideoTime(current) }} / {{ formatVideoTime(length) }}</span
          >
        </div>
        <div class="flex flex-row-reverse gap-4">
          <VideoButton @click="fullscreen"><FullscreenIcon /></VideoButton>
          <VideoButton :class="theatre && 'text-primary'" @click="$emit('theatre')"
            ><TheaterIcon
          /></VideoButton>
          <VideoButton :class="!loop && 'text-primary'" class="scale-90 pt-px" @click="loopToggle"
            ><LoopIcon />
          </VideoButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import FullscreenIcon from '@/components/icons/FullscreenIcon.vue'
import NextIcon from '@/components/icons/NextIcon.vue'
import PauseIcon from '@/components/icons/PauseIcon.vue'
import PlayIcon from '@/components/icons/PlayIcon.vue'
import PreviousIcon from '@/components/icons/PreviousIcon.vue'
import TheaterIcon from '@/components/icons/TheaterIcon.vue'
import VolumeIcon from '@/components/icons/VolumeIcon.vue'
import LoopIcon from './icons/LoopIcon.vue'
import { formatBytes, formatVideoTime } from '@/utils/helpers'
import VideoButton from './VideoButton.vue'
import LoadingIcon from './icons/LoadingIcon.vue'

interface Downloading {
  left: string
  width: string
}

const props = defineProps({
  theatre: Boolean,
  random: Boolean,
  // data: Object as PropType<VideoData>,
  url: String,
  downloadspeed: Number,
})
const emits = defineEmits(['theatre', 'prev', 'next', 'sync', 'urlSwap'])
defineExpose({ syncVideo, getState })
const videoRef = ref<HTMLVideoElement>()
const videoWrapperRef = ref<HTMLDivElement>()
const srcRef = ref<HTMLSourceElement>()
const tooltipRef = ref<HTMLDivElement>()
const progressRef = ref<HTMLDivElement>()
const playing = ref<boolean>(false)
const volume = ref<number>(0)
const preVolume = ref<number>(100)
const length = ref<number>(0) // length in s
const current = ref<number>(0)
const loop = ref<boolean>(false)
const buffering = ref<boolean>(true)
const isFullscreen = ref<boolean>(false)
const tooltipTime = ref<number>(0)
const controlsTimeout = ref<ReturnType<typeof setTimeout>>()
const controlsActive = ref<boolean>(false)
const downloading = ref<Downloading[]>([])
let animationFrame: number | undefined

const videoInit = () => {
  const video = videoRef.value
  if (!video) return
  if (!hasAudio(video)) {
    volume.value = -1
  } else if (video.muted) {
    volume.value = 0
  } else volume.value = video.volume * 100
  length.value = video.duration
  loop.value = video.loop
  if (animationFrame) cancelAnimationFrame(animationFrame)
  animationFrame = requestAnimationFrame(videoPlaying)
}

const videoPlay = () => {
  playing.value = true
  animationFrame = requestAnimationFrame(videoPlaying)
  // syncSend()
}

const videoPause = () => {
  playing.value = false
  if (animationFrame) cancelAnimationFrame(animationFrame)
}

const pause = (priority?: boolean) => {
  const video = videoRef.value
  if (!video) return
  video.pause()
  playing.value = false
  syncSend(priority)
}

const unpause = (priority?: boolean) => {
  const source = srcRef.value
  const video = videoRef.value
  if (!video || !source?.src) return
  video.play().then(() => {
    playing.value = true
    syncSend(priority)
  })
}

const videoPlaying = () => {
  const video = videoRef.value
  if (!video) return
  buffering.value = false
  current.value = video.currentTime
  if (playing.value) animationFrame = requestAnimationFrame(videoPlaying)
}

const videoDownloading = () => {
  const video = videoRef.value
  if (!video) return
  const newDownloading: Downloading[] = []
  for (let i = 0; i < video.buffered.length; i++) {
    const start = video.buffered.start(i)
    const end = video.buffered.end(i)
    const left = (start / video.duration) * 100 + '%'
    const width = ((end - start) / video.duration) * 100 + '%'
    newDownloading.push({
      left,
      width,
    })
  }
  downloading.value = newDownloading
  // console.log('buffer start', video.buffered.start(0))
  // console.log('buffer end', video.buffered.end(video.buffered.length - 1))
}

const videoBuffering = () => {
  const video = videoRef.value
  if (!video) return
  buffering.value = !video.paused && video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA
}

const seekProgress = (e: MouseEvent | TouchEvent) => {
  const video = videoRef.value
  if (!video) return
  e.stopPropagation()
  e.preventDefault()
  const target = e.target as HTMLDivElement
  let percentage: number
  const moveProgressWraper = (e: MouseEvent | TouchEvent) => {
    moveProgress(e, target)
  }
  const wasPlaying = playing.value

  const cleanUp = () => {
    // if (wasPlaying) video.play().then(() => syncSend(true))
    if (wasPlaying) unpause(true)
    else syncSend(true)
    document.removeEventListener('mousemove', moveProgressWraper)
    document.removeEventListener('mouseup', cleanUp)
    document.removeEventListener('touchmove', moveProgressWraper)
    document.removeEventListener('touchend', cleanUp)
  }

  if (e instanceof MouseEvent) {
    percentage = e.offsetX / target.clientWidth
    document.addEventListener('mousemove', moveProgressWraper)
    document.addEventListener('mouseup', cleanUp)
  } else {
    const rect = target.getBoundingClientRect()
    percentage = (e.targetTouches[0].pageX - rect.left) / target.clientWidth

    document.addEventListener('touchmove', moveProgressWraper)
    document.addEventListener('touchend', cleanUp)
  }
  // video.pause()
  pause()
  video.currentTime = video.duration * percentage
  current.value = video.currentTime
  // console.log(target)
}

const moveProgress = (e: MouseEvent | TouchEvent, bar: HTMLDivElement) => {
  const video = videoRef.value
  if (!video) return
  let position: number
  if (e instanceof MouseEvent) {
    position = Math.min(Math.max(0, e.clientX - bar.offsetLeft), bar.clientWidth)
  } else {
    position = Math.min(Math.max(0, e.targetTouches[0].pageX - bar.offsetLeft), bar.offsetWidth)
  }
  const percentage = position / bar.clientWidth
  video.currentTime = video.duration * percentage
  current.value = video.currentTime
}

const mute = () => {
  const video = videoRef.value
  if (!video || volume.value < 0) return
  if (volume.value > 0) {
    preVolume.value = volume.value
    volume.value = 0
  } else {
    volume.value = preVolume.value
  }
}

const fullscreen = () => {
  const videoWrapper = videoWrapperRef.value
  const video = videoRef.value
  if (!videoWrapper || !video || !video.src) return
  if (!isFullscreen.value) videoWrapper.requestFullscreen()
  else document.exitFullscreen()
}

const watchFullscreen = () => {
  // @ts-expect-error not all properties exist in ts
  // prettier-ignore
  isFullscreen.value = (document.isFullScreen || document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement)
}

const videoKey = (e: KeyboardEvent) => {
  const video = videoRef.value
  if (!video) return
  const code = e.code
  switch (code) {
    case 'Space':
      if (playing.value) video.pause()
      else video.play()
      break
    case 'KeyF':
      fullscreen()
      break
    case 'KeyT':
      emits('theatre')
      break
    case 'KeyM':
      mute()
      break
    case 'ArrowRight':
      video.currentTime = Math.min(video.duration - 0.035, video.currentTime + 5)
      current.value = video.currentTime
      syncSend(true)
      break
    case 'ArrowLeft':
      video.currentTime = Math.max(0, video.currentTime - 5)
      current.value = video.currentTime
      syncSend(true)
      break
    case 'ArrowUp':
      volume.value = Math.min(volume.value + 5, 100)
      break
    case 'ArrowDown':
      volume.value = Math.max(volume.value - 5, 0)
      break
  }
}

const videoWheel = (e: WheelEvent) => {
  const up = e.deltaY < 0
  if (up) volume.value = Math.min(volume.value + 5, 100)
  else volume.value = Math.max(volume.value - 5, 0)
}

const loopToggle = () => {
  const video = videoRef.value
  if (!video) return
  video.loop = !video.loop
  loop.value = video.loop
}

const tooltipPos = (e: MouseEvent) => {
  const tooltip = tooltipRef.value
  const parent = tooltip?.parentElement as HTMLDivElement
  const progressBar = progressRef.value
  if (!tooltip || !parent || !progressBar) return
  const offsetX = tooltip.clientWidth / 2 + parent.offsetLeft

  // const offsetY = tooltip.clientHeight
  tooltip.style.left = e.clientX - offsetX + 'px'
  const percentage =
    Math.min(Math.max(e.clientX - progressBar.offsetLeft, 0), progressBar.clientWidth) /
    progressBar.clientWidth
  // console.log(percentage)
  tooltipTime.value = length.value * percentage
  // tooltip.style.top = e.clientY - offsetY + 'px'
}

const controlsUpdate = () => {
  controlsActive.value = true
  if (controlsTimeout.value) {
    clearTimeout(controlsTimeout.value)
  }
  controlsTimeout.value = setTimeout(() => {
    controlsActive.value = false
  }, 3000)
}

watch(volume, (newVal) => {
  const video = videoRef.value
  if (!video) return
  if (newVal < 0) return
  if (newVal > 0 && video.muted) video.muted = false
  video.volume = newVal / 100
})

watch(() => props.url, changeSource)

onMounted(() => {
  document.addEventListener('mousemove', tooltipPos)
  document.addEventListener('fullscreenchange', watchFullscreen)
  changeSource(props.url)
})

onBeforeUnmount(() => {
  if (animationFrame) cancelAnimationFrame(animationFrame)
  document.removeEventListener('mousemove', tooltipPos)
  document.removeEventListener('fullscreenchange', watchFullscreen)
})

async function changeSource(url?: string) {
  const src = srcRef.value
  const video = videoRef.value
  if (!src || !video || src.src === url) return
  if (!url) {
    src.removeAttribute('src')
    return
  }
  const tempVideo = document.createElement('video')
  const tempSource = document.createElement('source')
  tempSource.src = url
  tempVideo.appendChild(tempSource)
  await new Promise<void>((resolve, reject) => {
    tempVideo.oncanplay = () => {
      resolve()
      tempVideo.oncanplay = null
    }
    tempVideo.onerror = () => {
      reject(new Error('Video load error'))
      tempVideo.onerror = null
    }
    tempVideo.load()
  })
  src.src = url
  video.load()
  video.oncanplay = () => {
    video.play().then(() => emits('urlSwap'))
    video.oncanplay = null
  }
  tempVideo.remove()

  // console.log(url)
  // video.oncanplay = () => {
  //   video.play()
  // }
  // video.load()
  // if(!video.value) video.value = {}
  // console.log(url)
}

function getState() {
  const video = videoRef.value
  if (!video || !srcRef.value) return {}
  const time = video.currentTime
  const state = playing.value ? 'unpaused' : 'paused'
  return { time, state }
}

function syncSend(priority?: boolean) {
  const video = videoRef.value
  if (!video || !srcRef.value) return null
  const time = video.currentTime
  const state = playing.value ? 'unpaused' : 'paused'
  emits('sync', time, state, priority)
}

function syncVideo(time: number, state?: 'paused' | 'unpaused') {
  console.log(state)
  // console.log('TEST FUNCTION FIRED')
  const video = videoRef.value
  if (!video || !srcRef.value) return
  video.currentTime = time
  current.value = video.currentTime
  if (state === 'paused') pause()
  else if (state === 'unpaused') {
    video.play()
  }
}

function hasAudio(video?: HTMLVideoElement) {
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
</script>
