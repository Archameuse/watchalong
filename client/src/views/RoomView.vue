<template>
  <main class="flex flex-col h-dvh h-screen w-screen overflow-hidden sm:flex-row">
    <section
      :class="theatre && 'max-h-none'"
      class="flex-grow flex flex-col h-full max-h-96 sm:max-h-none bg-extra2 relative"
    >
      <VideoPlayer
        :host="isHost"
        :url="activeVideoLink"
        :download-speed="downloadSpeed"
        :theatre="theatre"
        @theatre="theatre = !theatre"
        @prev="prev"
        @next="next"
        ref="videoPlayerRef"
      />
    </section>
    <section
      v-if="!theatre"
      class="w-full sm:w-72 sm:min-w-72 min-h-64 h-full sm:h-full flex flex-col bg-primary relative"
    >
      <div class="flex items-center justify-center gap-2 sm:gap-0 px-2">
        <span class="text-sm tracking-tighter break-words">
          Room "<b>{{ $route.params.id }}</b
          >"
        </span>
        <button
          @click="copy"
          class="w-4 cursor-pointer hover:opacity-80 active:opacity-95 transition"
        >
          <CopyIcon />
        </button>
      </div>
      <div class="flex bg-extra2">
        <button
          v-for="num in 3"
          v-bind:key="num"
          @click="activeSection = num"
          :class="
            activeSection === num
              ? 'border-thirdary border-t-2 bg-primary'
              : 'pt-0.5 text-secondary'
          "
          class="flex-grow h-8 cursor-pointer flex justify-center"
        >
          <PlaylistIcon v-if="num === 1" />
          <UsersIcon v-else-if="num === 2" />
          <SettingsIcon v-else-if="num === 3" />
        </button>
      </div>
      <PlaylistSection
        :selected="activeVideo"
        :playlist="playlist"
        @select="
          (id) => {
            activeVideo = id
            sendActive()
          }
        "
        @add="linkUpload"
        @upload="filesUpload"
        @delete="(id) => playlistDelete(id, true)"
        v-if="activeSection === 1"
      />
      <UsersSection :users="users" v-else-if="activeSection === 2" />
      <OptionsSection v-else-if="activeSection === 3" />
    </section>
  </main>
</template>

<script setup lang="ts">
import CopyIcon from '@/components/icons/CopyIcon.vue'
import PlaylistIcon from '@/components/icons/PlaylistIcon.vue'
import SettingsIcon from '@/components/icons/SettingsIcon.vue'
import UsersIcon from '@/components/icons/UsersIcon.vue'
import MainSection from '@/components/MainSection.vue'
import OptionsSection from '@/components/OptionsSection.vue'
import PlaylistSection from '@/components/PlaylistSection.vue'
import UsersSection from '@/components/UsersSection.vue'
import VideoPlayer from '@/components/VideoPlayer.vue'
import socket from '@/utils/socket'
import { v4 } from 'uuid'
import { onMounted, onUnmounted, watch } from 'vue'
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import type WebTorrent from 'webtorrent'

// let client: WebTorrent.Instance | null = null
let client: WebTorrent.Instance | null = null

const videoPlayerRef = ref<InstanceType<typeof VideoPlayer> | null>(null)
const activeSection = ref<number>(1)
const activeVideo = ref<number>(-1)
const activeVideoLink = ref<string | undefined>(``)

const theatre = ref<boolean>(false)
const route = useRoute()
const users = ref<User[]>([])
const playlist = ref<Video[]>([])
const isHost = ref<boolean>(false)
const downloadSpeed = ref<number>(0)

const copy = async () => {
  await navigator.clipboard.writeText(window.location.href)
  alert('Copied link')
}

const filesUpload = (files: File[]) => {
  const cleanVideos: Video[] = []
  for (const file of files) {
    const newVideo: Video = {
      id: v4(),
      name: file.name,
      status: 'file-client',
    }
    cleanVideos.push(newVideo)
    playlist.value.push({
      ...newVideo,
      status: 'file-host',
      src: file,
      url: URL.createObjectURL(file),
    })
  }
  const { id: roomId } = route.params
  if (typeof roomId !== 'string') return console.warn('No id of this route exist')
  socket.emit('sendVideos', { roomId, playlist: cleanVideos })
}

const linkUpload = (link: string) => {
  const { id: roomId } = route.params
  if (typeof roomId !== 'string') return console.warn('No id of this route exist')
  if (link.endsWith('.m3u8')) {
    const newVideo: Video = { id: v4(), name: link, status: 'link', url: link }
    playlist.value.push(newVideo)
    socket.emit('sendVideos', { roomId, playlist: [newVideo] })
  } else {
    const video = document.createElement('video')
    video.onloadedmetadata = () => {
      const newVideo: Video = { id: v4(), name: link, status: 'link', url: link }
      playlist.value.push(newVideo)
      socket.emit('sendVideos', { roomId, playlist: [newVideo] })
    }
    video.onerror = () => {
      console.error("Video can't be loaded hence it were not added")
    }
    video.src = link
  }
}

const playlistDelete = (id: number, direct?: boolean) => {
  const prev = activeVideo.value
  const revokeUrl = playlist.value[id].url
  playlist.value.splice(id, 1)
  if (activeVideo.value >= id) activeVideo.value = Math.max(0, activeVideo.value - 1)
  if (prev !== activeVideo.value) sendActive()
  if (revokeUrl) URL.revokeObjectURL(revokeUrl)
  // if (id === 0 && activeVideo.value === 0 && playlist.value.length) activeVideoHandler()
  const { id: roomId } = route.params
  if (typeof roomId !== 'string') return console.warn('No id of this route exist')
  if (direct) socket.emit('sendDelete', { roomId, videoId: id })
}

const prev = () => {
  if (activeVideo.value >= 0) activeVideo.value = Math.max(activeVideo.value - 1, 0)
  sendActive()
}
const next = () => {
  activeVideo.value = Math.min(activeVideo.value + 1, playlist.value.length - 1)
  sendActive()
}

watch(
  users,
  (users) => {
    if (!socket.id) return null
    const me = users.find((e) => e.id === socket.id)
    isHost.value = !!me?.host
  },
  { deep: true },
)

watch(
  playlist,
  (val) => {
    const prev = activeVideo.value
    activeVideo.value = Math.max(Math.min(activeVideo.value, val.length - 1), 0)
    if (prev !== activeVideo.value) sendActive()
  },
  { deep: true },
)

watch(activeVideo, activeVideoHandler)

function activeVideoHandler() {
  const video = playlist.value[activeVideo.value]
  if (!video) return console.error('ACTIVE VIDEO HANDLER DIDNT FOUND VIDEO IN PLAYLIST')
  // if (video.status === 'file-host') {
  //   activeVideoLink.value = video.url
  // }
  const { id: roomId } = route.params
  if (typeof roomId !== 'string') return console.warn('No id of this route exist')
  if (video.status === 'file-host') {
    const { src, url } = video
    const src2 = playlist.value[activeVideo.value + 1]?.src
    if (!client) return console.error('NO TORRENT CLIENT EXISTS (ACTIVEVIDEOHANDLER)')
    if (!src) return console.warn('NO SRC ON THIS VIDEO (ACTIVEVIDEOHANDLER)')
    activeVideoLink.value = url || URL.createObjectURL(src)
    let existLink: string | null = null
    client.torrents.forEach((t) => {
      if (t.length === src.size && t.name === src.name) {
        // if current video is one that should be seeded
        existLink = t.magnetURI
      } else if (src2 && t.length === src2.size && t.name === src2.name && t.numPeers) {
        // if next video is seeding keep it maybe add something here later
      } else {
        t.destroy({ destroyStore: true })
      }
    })
    if (!existLink) {
      client.seed(src, { private: true }, (t) => {
        video.progress = 0
        console.log('Started seeding')
        socket.emit('sendTorrent', {
          roomId,
          data: { torrent: t.magnetURI, active: activeVideo.value },
        })
      })
    } else
      socket.emit('sendTorrent', {
        roomId,
        data: { torrent: existLink, active: activeVideo.value },
      })
  } else {
    const { url } = video
    if (url) {
      activeVideoLink.value = url
      const { id: roomId } = route.params
      if (
        typeof roomId === 'string' &&
        playlist.value[activeVideo.value + 1] &&
        playlist.value[activeVideo.value + 1].status === 'file-client' &&
        !playlist.value[activeVideo.value + 1].url
      )
        socket.emit('requestTorrentId', { roomId, videoId: activeVideo.value + 1 })
    }
  }
}

function sendActive() {
  const { id: roomId } = route.params
  if (typeof roomId !== 'string') return console.warn('No id of this route exist')
  if (playlist.value[activeVideo.value]?.status !== 'file-host')
    socket.emit('sendActive', { roomId, videoId: activeVideo.value })
}

onMounted(() => {
  client = new window.WebTorrent()
  const { id } = route.params
  if (typeof id !== 'string') return null
  socket.on('sendUsers', (data: User[]) => {
    if (typeof data === 'object') users.value = data
  })
  socket.on('requestedInit', (uId: string) => {
    if (!isHost.value) return null
    const formattedPlaylist: Video[] = playlist.value.map((video) => {
      const { progress, src, url, ...rest } = video
      return {
        ...rest,
        url: rest.status === 'link' ? url : undefined,
        status: rest.status === 'file-host' ? 'file-client' : rest.status,
      }
    })
    socket.emit('sendInit', {
      uId,
      data: { playlist: formattedPlaylist, active: activeVideo.value },
    })
  })
  socket.on('receiveInit', (data: { playlist: Video[]; active: number }) => {
    const { id: roomId } = route.params
    const { playlist: receivedPlaylist, active } = data
    if (receivedPlaylist.length) playlist.value = receivedPlaylist
    if (typeof active === 'number') activeVideo.value = active
    if (playlist.value[activeVideo.value]?.status === 'file-client' && typeof roomId === 'string')
      socket.emit('requestTorrent', { roomId })
  })
  socket.on('receiveVideos', (newPlaylist: Video[]) => {
    if (typeof newPlaylist === 'object') playlist.value.push(...newPlaylist)
  })
  socket.on('receiveDelete', (videoId) => {
    if (typeof videoId === 'number') playlistDelete(videoId)
  })
  socket.on('receiveActive', (videoId) => {
    if (typeof videoId === 'number') activeVideo.value = videoId
  })
  socket.on('sendRequestTorrent', () => {
    activeVideoHandler()
  })
  socket.on('receiveTorrent', (data: { torrent: string; active: number; remain?: boolean }) => {
    const { torrent: torrentLink, active, remain } = data
    const { id: roomId } = route.params
    if (playlist.value[active]?.url || playlist.value[active]?.progress)
      return !remain && (activeVideo.value = active)
    if (typeof torrentLink !== 'string')
      return console.warn('NO VALID TORRENT LINK PROVIDED (receiveTorrent)')
    client?.torrents.forEach((t) => {
      if (!t.numPeers) t.destroy({ destroyStore: true })
    })
    playlist.value.forEach((v) => (v.progress = 0))
    if (playlist.value[active]) playlist.value[active].progress = 0.001
    const videoPlayer = videoPlayerRef.value
    if (typeof roomId === 'string' && !remain && videoPlayer) {
      videoPlayer.syncVideo(undefined, 'paused')
      socket.emit('sendSync', { roomId, data: { videoState: 'paused' } })
    }
    client?.add(torrentLink.trim(), { private: true }, (t) => {
      console.log('Connected to torrent:', t.infoHash)
      const onDownload = () => {
        if (playlist.value[active]) playlist.value[active].progress = t.progress
        downloadSpeed.value = t.downloadSpeed
        if (t.progress >= 1) {
          t.off('download', onDownload)
          downloadSpeed.value = 0
        }
      }
      t.on('download', onDownload)
      const file = t.files[0]
      file.getBlob((err, blob) => {
        if (err || !blob) return console.error(err || 'Unexpected error retrieving file blob')
        if (playlist.value[active]) {
          playlist.value[active].src = new File([blob], playlist.value[active].name)
          playlist.value[active].url = URL.createObjectURL(playlist.value[active].src)
          if (!remain) {
            if (activeVideo.value === active) activeVideoHandler()
            else activeVideo.value = active
            if (
              typeof roomId === 'string' &&
              playlist.value[active + 1] &&
              playlist.value[active + 1].status === 'file-client' &&
              !playlist.value[active + 1].url
            )
              socket.emit('requestTorrentId', { roomId, videoId: active + 1 })
          }
        } else if (!remain) activeVideoLink.value = URL.createObjectURL(blob)
      })
    })
  })
  socket.on('sendRequestTorrentId', (data: { uId: string; videoId: number }) => {
    const { uId, videoId } = data
    const video = playlist.value[videoId]
    const src = video?.src
    if (!video || !src) return null
    if (!client) return console.warn('NO CLIENT EXISTS AT SENDREQUESTTORRENTID')
    let existLink: string | null = null
    client.torrents.forEach((t) => {
      if (t.length === src.size && t.name === src.name) existLink = t.magnetURI
    })
    if (!existLink) {
      client.seed(src, { private: true }, (t) => {
        video.progress = 0
        console.log('Seeding:', t.magnetURI)
        socket.emit('sendTorrentId', {
          uId,
          data: { torrent: t.magnetURI, active: videoId, remain: true },
        })
      })
    } else
      socket.emit('sendTorrentId', {
        uId,
        data: { torrent: existLink, active: videoId, remain: true },
      })
  })
  socket.on('receiveSync', (data: { videoTime?: number; videoState: string }) => {
    const { videoTime, videoState } = data
    const videoPlayer = videoPlayerRef.value
    if (videoState !== 'paused' && videoState !== 'unpaused')
      return console.error('WRONG VALUES PASSED TO RECEIVESYNC')
    if (!videoPlayer) return console.error('Video player does not exist on receivesync')
    videoPlayer.syncVideo(videoTime, videoState)
  })
  socket.on('sendRequestSync', (uId) => {
    if (!isHost.value) return null
    const videoPlayer = videoPlayerRef.value
    if (!videoPlayer) return console.error('video player does not exist on sendrequestsync')
    const { time: videoTime, state: videoState } = videoPlayer.getState()
    if (typeof uId === 'string') socket.emit('sendSyncId', { uId, data: { videoTime, videoState } })
  })
  socket.emit('joinRoom', id)
  socket.emit('requestInit', id)
})
onUnmounted(() => {
  client?.destroy()
  client = null
  socket.off('message')
  socket.disconnect()
})
</script>
