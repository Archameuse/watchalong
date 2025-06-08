<template>
  <div
    class="flex-grow w-full overflow-hidden relative focus-visible:outline-none"
    :class="controlsActive || !isPlaying ? 'cursor-auto' : 'cursor-none'"
    ref="videoWrapperRef"
    tabindex="0"
    @wheel="videoWheel"
    @keydown="videoKey"
    @mousemove="controlsUpdate"
  >
    <!-- <div
    tabindex="0"
    class="flex-grow w-full overflow-hidden relative focus-visible:outline-none"
    :class="controlsActive || !playing ? 'cursor-auto' : 'cursor-none'"
    ref="videoWrapperRef"
    @keydown="videoKey"
    @wheel="videoWheel"
    @mousemove="controlsUpdate"
  > -->
    <video
      draggable="false"
      preload="auto"
      ref="videoRef"
      class="h-full w-full relative object-contain"
      :class="!theatre && !isFullscreen && 'md:object-cover'"
      @loadeddata="videoInit"
      @playing="videoPlay"
      @pause="videoPause"
      @click="togglePlay"
      @dblclick="toggleFullscreen"
      @waiting="videoBuffering"
      @progress="videoDownloading"
      @ended="() => host && $emit('next')"
    ></video>
    <div
      :class="
        controlsActive || !isPlaying
          ? 'opacity-100 pointer-events-auto'
          : 'opacity-0 pointer-events-none'
      "
      class="absolute top-0 left-0 w-full h-full bg-black mask-t-from-0% pointer-events-none transition-opacity"
    ></div>
    <div
      v-if="isBuffering"
      class="absolute pointer-events-none w-full h-full top-0 left-0 flex items-center justify-center backdrop-blur-sm"
    >
      <div class="h-32 aspect-square animate-spin text-extra2">
        <LoadingIcon />
      </div>
    </div>
    <div class="absolute top-0 left-0 bg-black" v-if="downloadSpeed">
      {{ formatBytes(downloadSpeed) }}ps
    </div>
    <div
      :class="volumeActive ? 'opacity-100' : 'opacity-0'"
      class="absolute top-10 left-1/2 -translate-x-1/2 bg-black w-30 flex items-center justify-center h-12 text-3xl font-bold font-sans rounded-md transition-opacity"
    >
      {{ volume }}%
    </div>
    <div
      @click.stop.prevent
      :class="
        controlsActive || !isPlaying
          ? 'opacity-100 pointer-events-auto'
          : 'opacity-0 pointer-events-none'
      "
      class="flex flex-col p-4 absolute bottom-0 w-full gap-4 transition-opacity"
    >
      <div
        class="w-full group cursor-pointer py-3"
        @mousedown="seekProgress"
        @touchstart="seekProgress"
      >
        <div ref="progressRef" class="w-full bg-extra2 rounded-full h-1.5 relative">
          <div
            v-for="bar of totalBuffer"
            v-bind:key="bar.left"
            class="bg-secondary h-full rounded-full absolute left-0 top-0 pointer-events-none"
            :style="{ left: bar.left, width: bar.width }"
          ></div>
          <div
            class="bg-thirdary h-full rounded-full absolute left-0 top-0 pointer-events-none"
            :style="{ width: (currentTime / totalTime) * 100 + '%' }"
          ></div>
        </div>
        <aside
          class="absolute w-12 items-center justify-center bg-black pointer-events-none -top-4 left-0 z-50 opacity-0 group-hover:opacity-100 transition-opacity"
          ref="tooltipRef"
        >
          {{ formatVideoTime(tooltipTime) }}
        </aside>
      </div>
      <div
        class="flex gap-2 justify-between items-center text-thirdary w-full absolute left-0 -top-6 px-4 md:static md:px-0"
      >
        <div class="flex gap-4 items-center">
          <VideoButton big @click="$emit('prev')"><PreviousIcon /></VideoButton>
          <VideoButton big @click="togglePlay"
            ><PlayIcon v-if="!isPlaying" /><PauseIcon v-else
          /></VideoButton>
          <VideoButton big @click="$emit('next')"><NextIcon /></VideoButton>
          <div class="group flex h-8 gap-2" v-if="volume >= 0">
            <VideoButton class="group" @click="toggleMute">
              <VolumeIcon :stage="volume > 60 ? 1 : volume > 0 ? 2 : 3" />
            </VideoButton>
            <input
              type="range"
              v-model="volume"
              class="cursor-pointer overflow-hidden transition-all w-0 group-hover:w-24"
            />
          </div>
          <span class="select-none text-nowrap"
            >{{ formatVideoTime(currentTime) }} / {{ formatVideoTime(totalTime) }}</span
          >
        </div>
        <div class="flex flex-row-reverse gap-4">
          <VideoButton @click="toggleFullscreen"><FullscreenIcon /></VideoButton>
          <VideoButton @click="$emit('theatre')" :class="theatre && 'text-primary'"
            ><TheaterIcon
          /></VideoButton>
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
import { formatBytes, formatVideoTime, hasAudio } from '@/utils/helpers'
import VideoButton from './VideoButton.vue'
import LoadingIcon from './icons/LoadingIcon.vue'
import socket from '@/utils/socket'
import { useRoute } from 'vue-router'
// @ts-expect-error no ts in library
import shaka from 'shaka-player/dist/shaka-player.compiled'

interface BufferBar {
  left: string
  width: string
}

const props = defineProps({
  url: String,
  type: String,
  downloadSpeed: Number,
  theatre: Boolean,
  host: Boolean,
})
const emit = defineEmits(['theatre', 'prev', 'next'])
defineExpose({ syncVideo, getState })

const route = useRoute()
let sPlayer: any = new shaka.Player()
let animationFrame: number | null = null
let controlsTimeout: ReturnType<typeof setTimeout> | null = null
let volumeTimeout: ReturnType<typeof setTimeout> | null = null

const VOLUME_TIME = 1500 // volume timeout time in ms
const CONTROLS_TIME = 1000 //controls timeout time in ms

const videoWrapperRef = ref<HTMLElement>() // reference to main wrapper for fullscreen
const videoRef = ref<HTMLVideoElement>() // reference to video element
const tooltipRef = ref<HTMLElement>() // reference to tooltip of hovered progressbar time
const progressRef = ref<HTMLElement>() // reference to progressbar
const isPlaying = ref<boolean>(false) // is video currently playing
const isBuffering = ref<boolean>(false) // is video buffering
const isFullscreen = ref<boolean>(false) // are page in fullscreen
const controlsActive = ref<boolean>(false) // controls visiblity
const volumeActive = ref<boolean>(false) // volume tooltip visibility
const totalTime = ref<number>(0) //video duration in s
const currentTime = ref<number>(0) //current video position in s
const tooltipTime = ref<number>(0) //hovered progressbar time in s
const volume = ref<number>(100) // current video volume 0-100
const preVolume = ref<number>(100) // previous volume for "unmute"
const totalBuffer = ref<BufferBar[]>([]) // array of buffer bars

const videoInit = () => {
  const video = videoRef.value
  if (!video) return console.warn('NO VIDEO COMPONENT EXISTS ON VIDEOINIT')
  if (!hasAudio(video)) volume.value = -1
  else volume.value = video.volume * 100

  totalTime.value = video.duration
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
    animationFrame = null
  }
  animationFrame = requestAnimationFrame(updateTime)
}

async function setupSource() {
  const video = videoRef.value
  const url = props.url || ''
  if (!video) return console.warn('NO VIDEO ELEMENT WERE PRESENT ON CHANGESOURCE')
  if (sPlayer) {
    await sPlayer.destroy()
    sPlayer = null
  }
  if (url.endsWith('.m3u8')) {
    // it plays muted for literally no reason but i cant do anything about it
    const referer = 'kiwik.si' // or the domain that must be sent as ref
    const headers = encodeURIComponent(JSON.stringify({ Referer: 'https://kiwik.si' }))
    const finishedUrl = `https://slave.4lpharius.workers.dev/proxy?url=${encodeURIComponent(url)}&headers=${headers}`
    // const finishedUrl = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
    sPlayer = new shaka.Player()
    sPlayer.attach(video).then(async () => {
      await sPlayer.load(finishedUrl, null, 'application/x-mpegURL')
    })
  } else {
    video.src = url
    video.addEventListener(
      'canplay',
      () => {
        const { id: roomId } = route.params
        socket.emit('requestSync', { roomId })
        video.play()
      },
      { once: true },
    )
  }
}

const videoBuffering = () => {
  const video = videoRef.value
  if (!video) return
  isBuffering.value = !video.paused && video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA
}

const videoDownloading = () => {
  const video = videoRef.value
  if (!video) return
  const newBuffer: BufferBar[] = []
  for (let i = 0; i < video.buffered.length; i++) {
    const start = video.buffered.start(i)
    const end = video.buffered.end(i)
    const left = (start / video.duration) * 100 + '%'
    const width = ((end - start) / video.duration) * 100 + '%'
    newBuffer.push({
      left,
      width,
    })
  }
  totalBuffer.value = newBuffer
  videoBuffering()
}

const videoPlay = () => {
  isPlaying.value = true
  animationFrame = requestAnimationFrame(updateTime)
  // syncSend()
}

const videoPause = () => {
  isPlaying.value = false
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
    animationFrame = null
  }
}

const actionPlay = (priority?: boolean) => {
  const video = videoRef.value
  if (!video || !isVideoLoaded() || isPlaying.value || isBuffering.value) return null
  video.play().then(() => {
    isPlaying.value = true
    if (priority) syncSend()
  })
}

const actionPause = (priority?: boolean) => {
  const video = videoRef.value
  if (!video) return
  video.pause()
  isPlaying.value = false
  if (priority) syncSend()
}

const updateTime = () => {
  const video = videoRef.value
  if (!video) return
  isBuffering.value = false
  currentTime.value = video.currentTime
  if (isPlaying.value) animationFrame = requestAnimationFrame(updateTime)
}

const tooltipPos = (e: MouseEvent) => {
  const tooltip = tooltipRef.value
  const parent = tooltip?.parentElement as HTMLElement
  const progressBar = progressRef.value
  if (!tooltip || !parent || !progressBar) return
  const offsetX = tooltip.clientWidth / 2

  // const offsetY = tooltip.clientHeight
  tooltip.style.left = e.clientX - offsetX + 'px'
  const percentage =
    Math.min(Math.max(e.clientX - progressBar.offsetLeft, 0), progressBar.clientWidth) /
    progressBar.clientWidth
  tooltipTime.value = totalTime.value * percentage
  // tooltip.style.top = e.clientY - offsetY + 'px'
}

const togglePlay = () => {
  isPlaying.value ? actionPause(true) : actionPlay(true)
}

const toggleFullscreen = () => {
  // const videoWrapper = videoWrapperRef.value
  // const video = videoRef.value
  // if (!videoWrapper || !video || !video.src) return
  // if (!isFullscreen.value) videoWrapper.requestFullscreen()
  // else document.exitFullscreen()
}

const toggleMute = () => {
  const video = videoRef.value
  if (!video || volume.value < 0) return
  if (volume.value > 0) {
    preVolume.value = volume.value
    volume.value = 0
  } else {
    volume.value = preVolume.value
  }
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
  const wasPlaying = isPlaying.value

  const cleanUp = () => {
    // if (wasPlaying) video.play().then(() => syncSend(true))
    // if (wasPlaying) unpause(true)
    // else syncSend(true)
    if (wasPlaying) actionPlay(true)
    else syncSend()
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
  actionPause()
  video.currentTime = video.duration * percentage
  currentTime.value = video.currentTime
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
  currentTime.value = video.currentTime
}

const videoKey = (e: KeyboardEvent) => {
  const video = videoRef.value
  if (!video) return
  const code = e.code
  switch (code) {
    case 'Space':
      togglePlay()
      break
    case 'KeyF':
      toggleFullscreen()
      break
    case 'KeyT':
      emit('theatre')
      break
    case 'KeyM':
      toggleMute()
      break
    case 'ArrowRight':
      video.currentTime = Math.min(video.duration - 0.035, video.currentTime + 5)
      currentTime.value = video.currentTime
      syncSend()
      break
    case 'ArrowLeft':
      video.currentTime = Math.max(0, video.currentTime - 5)
      currentTime.value = video.currentTime
      syncSend()
      break
    case 'ArrowUp':
      if (volume.value < 0) return null
      volume.value = Math.min(volume.value + 5, 100)
      break
    case 'ArrowDown':
      if (volume.value < 0) return null
      volume.value = Math.max(volume.value - 5, 0)
      break
  }
}

const videoWheel = (e: WheelEvent) => {
  if (volume.value < 0) return null
  const up = e.deltaY < 0
  if (up) volume.value = Math.min(volume.value + 5, 100)
  else volume.value = Math.max(volume.value - 5, 0)
}

function getState(): { time?: number; state?: 'unpaused' | 'paused' } {
  const video = videoRef.value
  if (!video || !isVideoLoaded()) return {}
  const time = video.currentTime
  const state = isPlaying.value ? 'unpaused' : 'paused'
  return { time, state }
}

function syncSend() {
  const video = videoRef.value
  const { id: roomId } = route.params
  if (!video || !isVideoLoaded()) return console.warn('NO VIDEO LOADED ON SYNCSEND')
  if (typeof roomId !== 'string') return console.error('NO ROOM ID EXISTS ON SYNCSEND')
  const videoTime = video.currentTime
  const videoState = isPlaying.value ? 'unpaused' : 'paused'
  socket.emit('sendSync', { roomId, data: { videoTime, videoState } })
}

function syncVideo(time?: number, state?: 'paused' | 'unpaused') {
  const video = videoRef.value
  if (!video || !isVideoLoaded()) return null
  video.currentTime = typeof time === 'number' ? time : video.currentTime
  currentTime.value = video.currentTime
  if (state === 'paused') actionPause()
  else if (state === 'unpaused') actionPlay()
}

const watchFullscreen = () => {
  // @ts-expect-error not all properties exist in ts
  // prettier-ignore
  isFullscreen.value = (document.isFullScreen || document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement)
}

const controlsUpdate = () => {
  controlsActive.value = true
  if (controlsTimeout) {
    clearTimeout(controlsTimeout)
  }
  controlsTimeout = setTimeout(() => {
    controlsActive.value = false
  }, CONTROLS_TIME)
}

function isVideoLoaded() {
  const video = videoRef.value
  return video && video.readyState >= 1
}

watch(volume, (newVal) => {
  const video = videoRef.value
  if (!video) return
  if (newVal < 0) return
  if (newVal > 0 && video.muted) video.muted = false
  video.volume = newVal / 100
  volumeActive.value = true
  if (volumeTimeout) clearTimeout(volumeTimeout)
  volumeTimeout = setTimeout(() => {
    volumeActive.value = false
  }, VOLUME_TIME)
})

watch(() => props.url, setupSource)

onMounted(() => {
  document.addEventListener('mousemove', tooltipPos)
  document.addEventListener('fullscreenchange', watchFullscreen)
  setupSource()
})
onBeforeUnmount(async () => {
  document.removeEventListener('mousemove', tooltipPos)
  document.removeEventListener('fullscreenchange', watchFullscreen)
  if (volumeTimeout) clearTimeout(volumeTimeout)
  if (controlsTimeout) clearTimeout(controlsTimeout)
  volumeTimeout = null
  controlsTimeout = null
  await sPlayer?.destroy()
  sPlayer = null
})
</script>
