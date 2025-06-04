<template>
  <main class="flex flex-col h-dvh h-screen w-screen overflow-hidden sm:flex-row">
    <section
      :class="theatre && 'max-h-none'"
      class="flex-grow flex flex-col h-full max-h-96 sm:max-h-none bg-extra2 relative"
    >
      <VideoPlayer
        :url="activeVideoLink"
        :downloadspeed="downloadSpeed"
        ref="videoPlayerRef"
        @sync="syncVideo"
        @url-swap="syncWithHost"
        :theatre="theatre"
        @theatre="theatre = !theatre"
        @prev="prev"
        @next="next"
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
          v-for="num in 2"
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
          <SettingsIcon v-else-if="num === 2" />
        </button>
      </div>
      <PlaylistSection
        v-if="activeSection === 1"
        :playlist="playlist"
        :selected="activeVideo"
        @select="(id) => (activeVideo = id)"
        @delete="(id) => playlistDelete(id, true)"
        @upload="filesUpload"
        @add="linkAdd"
      />
      <OptionsSection v-else-if="activeSection === 2" />
      <div
        v-if="!connectionEstablished"
        class="absolute top-0 left-0 w-full h-full backdrop-blur-xs flex items-center justify-center"
      >
        <span class="text-xl px-6 text-extra z-10"
          >No connection, if loading takes too long, try refreshing page or check your id</span
        >
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import CopyIcon from '@/components/icons/CopyIcon.vue'
import PlaylistIcon from '@/components/icons/PlaylistIcon.vue'
import SettingsIcon from '@/components/icons/SettingsIcon.vue'
import OptionsSection from '@/components/OptionsSection.vue'
import PlaylistSection from '@/components/PlaylistSection.vue'
import VideoPlayer from '@/components/VideoPlayer.vue'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type WebTorrent from 'webtorrent'
import Peer, { DataConnection } from 'peerjs'
import { useRoute } from 'vue-router'
import { v4 } from 'uuid'

interface ConData {
  type:
    | 'add-file'
    | 'delete-playlist'
    | 'send-video'
    | 'send-active'
    | 'init'
    | 'sync-video'
    | 'sync-with-host'
    | 'add-link'
  data: {
    url?: string
    id?: string
    playlist?: Video[]
    active?: number
    videoTime?: number
    videoState?: 'paused' | 'unpaused'
  }
}

let client: WebTorrent.Instance | undefined
const host = !!history.state.host

const connectionEstablished = ref<boolean>(host)
const activeSection = ref<number>(1)
const activeVideo = ref<number>(-1)
const activeVideoLink = ref<string>()
const downloadSpeed = ref<number>(0)
const theatre = ref<boolean>(false)
const playlist = ref<Video[]>([])
const connections = ref<DataConnection[]>([])
const videoPlayerRef = ref<InstanceType<typeof VideoPlayer> | null>(null)
const peer = ref<Peer>()
const route = useRoute()

const copy = async () => {
  await navigator.clipboard.writeText(window.location.href)
  alert('Copied link')
}

const playlistDelete = (id: number, direct?: boolean) => {
  if (host || !direct) {
    console.log('DELETED VIDEO', id)
    playlist.value.splice(id, 1)
  }
  if (host || direct)
    for (const con of connections.value) {
      con.send({
        type: 'delete-playlist',
        data: { active: id },
      } as ConData)
    }
  if (activeVideo.value >= id) activeVideo.value = Math.max(0, activeVideo.value - 1)
  if (id === 0 && activeVideo.value === 0 && playlist.value.length) activeVideoHandler()
}

const prev = () => {
  if (!host) return null
  if (activeVideo.value >= 0) activeVideo.value = Math.max(activeVideo.value - 1, 0)
}
const next = () => {
  if (!host) return null
  activeVideo.value = Math.min(activeVideo.value + 1, playlist.value.length - 1)
}

const filesUpload = async (files: File[]) => {
  if (!host) return null
  const videoRegex = /\.(mp4|mov|avi|wmv|flv|mkv|webm|mpeg|mpg|3gp|m4v)$/i
  if (!client) return null
  const tempPlaylist: Video[] = []
  for (const file of files) {
    if (!videoRegex.test(file.name)) {
      alert('Wrong extension was passed')
      break
    }
    const newVideo: Video = {
      id: v4(),
      name: file.name,
      status: 'file-host',
      src: file,
      url: URL.createObjectURL(file),
    }
    playlist.value.push(newVideo)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { src, url, ...sendVideo } = newVideo
    sendVideo.status = 'file-client'
    tempPlaylist.push(sendVideo)
  }
  if (!tempPlaylist.length) return console.warn('No videos was added')
  for (const con of connections.value) {
    con.send({
      type: 'add-file',
      data: { playlist: tempPlaylist },
    } as ConData)
  }
}

const linkAdd = (url: string, id?: string) => {
  // if(host&&!secondary) video
  const video = document.createElement('video')
  const src = document.createElement('source')
  src.src = url
  video.appendChild(src)
  video.onloadedmetadata = () => {
    const v4Id = v4()
    if (host && !id)
      playlist.value.push({
        id: v4Id,
        name: url,
        status: 'link',
        url,
      })

    for (const con of connections.value) {
      con.send({
        type: 'add-link',
        data: { url, id: id || v4Id },
      } as ConData)
    }
  }
  src.onerror = () => {
    console.error('Video cant be loaded')
  }
  video.load()
}

watch(
  playlist,
  (val) => {
    activeVideo.value = Math.max(Math.min(activeVideo.value, val.length - 1), 0)
  },
  { deep: true },
)

watch(activeVideo, () => activeVideoHandler())

function setupConnection(con: DataConnection) {
  con.on('open', () => {
    connectionEstablished.value = true
  })
  con.on('data', async (data) => {
    if (!isConData(data)) return console.error('WRONG TYPE OF DATA WAS PASSED')
    // console.log('Recieved data', data)
    // console.log(data.data.playlist)
    switch (data.type) {
      case 'init': {
        const { active, playlist: recievedPlaylist } = data.data
        if (!recievedPlaylist?.length) return
        playlist.value = recievedPlaylist
        activeVideo.value = active || activeVideo.value
        break
      }
      case 'send-video': {
        const { url, active } = data.data
        if (!url) return console.error('No url was passed down')
        if (typeof active !== 'number')
          return console.error('No current selected video id was passed down')
        if (playlist.value[active]?.src) return (activeVideo.value = active)

        if (!client) return console.error('No torrent client exists')
        console.log('Attempting to download video')
        for (const tor of client.torrents) {
          tor.destroy({ destroyStore: true })
        }
        for (const video of playlist.value) video.progress = 0
        if (playlist.value[active]) playlist.value[active].progress = 0.001
        client.add(url.trim(), { private: true }, (torrent) => {
          console.log('Connected to torrent:', torrent.infoHash)
          const onDownload = () => {
            // add upload progress maybe later
            if (playlist.value[active]) playlist.value[active].progress = torrent.progress
            downloadSpeed.value = torrent.downloadSpeed
            if (torrent.progress >= 1) {
              torrent.off('download', onDownload)
              downloadSpeed.value = 0
            }
          }
          torrent.on('download', onDownload)
          const file = torrent.files[0]
          file.getBlob((err, blob) => {
            if (err || !blob) return console.error(err || 'Unexpected error retrieving file blob')

            if (playlist.value[active]) {
              playlist.value[active].src = new File([blob], playlist.value[active].name)
              playlist.value[active].url = URL.createObjectURL(playlist.value[active].src)
              if (activeVideo.value === active) activeVideoHandler()
              else activeVideo.value = active
            } else activeVideoLink.value = URL.createObjectURL(blob)
          })
        })
        break
      }
      case 'send-active': {
        // if (!host) return
        const { active } = data.data
        if (typeof active !== 'number')
          return console.error('no active video was passed into send-active')
        activeVideo.value = active
        if (activeVideo.value === active) activeVideoHandler(false)
        else activeVideo.value = active
        break
      }
      case 'add-file': {
        const { playlist: recievedPlaylist } = data.data
        if (!recievedPlaylist) return console.warn('No playlist data was passed to add-playlist')
        playlist.value.push(...recievedPlaylist)
        break
      }
      case 'delete-playlist': {
        const { active } = data.data
        if (typeof active !== 'number')
          return console.warn('No video id was passed to delete-playlist')
        playlistDelete(active)
        break
      }
      case 'sync-video': {
        const { videoState, videoTime } = data.data
        const videoPlayer = videoPlayerRef.value
        if (!videoState || typeof videoTime !== 'number')
          return console.warn('Nothing was passed into sync-video')
        if (!videoPlayer) return console.error('NO VIDEO PLAYER PRESENT (SYNCVIDEO)')
        videoPlayer.syncVideo(videoTime, videoState)
        break
      }
      case 'sync-with-host': {
        if (!host) return null
        const videoPlayer = videoPlayerRef.value
        if (!videoPlayer?.getState) return null
        const { time, state } = videoPlayer.getState()
        if (typeof time !== 'number' || !state) return null
        for (const con of connections.value)
          con.send({
            type: 'sync-video',
            data: {
              videoState: state,
              videoTime: time,
            },
          } as ConData)
        break
      }
      case 'add-link': {
        const { url, id } = data.data
        if (!url) return console.warn('NO URL WAS PASSED (ADDLINK)')
        if (!id) return console.warn('NO ID WAS PASSED (ADDLINK)')
        playlist.value.push({
          name: url,
          status: 'link',
          id,
          url,
        })
        if (host) linkAdd(url, id)
        break
      }
    }
  })
}

function isConData(data: unknown): data is ConData {
  return typeof data === 'object' && data !== null && 'type' in data
}

function activeVideoHandler(priority: boolean = true) {
  const val = activeVideo.value
  const video = playlist.value[val]
  if (!video) return null
  if (video.status === 'file-host') {
    if (!client) return null
    const { src } = video
    if (!src) return console.error('NO SOURCE OF THIS FILE EXISTS')
    activeVideoLink.value = video.url || URL.createObjectURL(src)
    client.torrents.forEach((t) => t.destroy({ destroyStore: true }))
    client.seed(src, { private: true }, (torrent) => {
      video.progress = 0
      console.log('Seeding:', torrent.magnetURI)
      for (const connection of connections.value) {
        connection.send({
          type: 'send-video',
          data: {
            active: val,
            url: torrent.magnetURI,
          },
        } as ConData)
      }
      // torrent.on('upload', () => {
      // add tracking of min upload maybe between all who downloads
      // })
      // example of progress
      // const iId = setInterval(() => {
      //   if (typeof video.progress === 'number' && video.progress < 100) video.progress += 1
      //   else {
      //     clearInterval(iId)
      //     // console.log('progress reached 100')
      //   }
      // }, 25)
    })
  } else if (video.status === 'file-client') {
    const { url } = video
    if (url) activeVideoLink.value = url
    sendActive(priority)
  } else if (video.status === 'link') {
    const { url } = video
    activeVideoLink.value = url
    sendActive(priority)
  }
}

function syncVideo(time: number, state: 'paused' | 'unpaused', priority?: boolean) {
  if (!host && !priority) return
  for (const con of connections.value) {
    con.send({
      type: 'sync-video',
      data: {
        videoState: state,
        videoTime: time,
      },
    } as ConData)
  }
}

function sendActive(priority?: boolean) {
  if (!connections.value.length) console.warn('NO CONNECTIONS EXIST')
  if (host || priority) {
    for (const con of connections.value) {
      con.send({
        type: 'send-active',
        data: {
          active: activeVideo.value,
        },
      } as ConData)
    }
  }
}

function syncWithHost() {
  if (host) return null
  for (const con of connections.value) {
    con.send({ type: 'sync-with-host' } as ConData)
  }
}

onMounted(() => {
  client = new window.WebTorrent()
  const { id } = route.params
  if (typeof id !== 'string') return console.error('No id on this page')
  if (host && typeof id === 'string')
    peer.value = new Peer(id, {
      host: '0.peerjs.com',
      port: 443,
      path: '/',
      secure: true,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          // Add TURN here for full mobile support
        ],
      },
    })
  else
    peer.value = new Peer(v4(), {
      host: '0.peerjs.com',
      port: 443,
      path: '/',
      secure: true,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          // Add TURN here for full mobile support
        ],
      },
    })
  peer.value.on('open', () => {
    if (!peer.value || host) return
    const con = peer.value.connect(id)
    setupConnection(con)
    connections.value.push(con)
    console.log('Connected to', id)
    // console.log('open', connections.value[0])
  })
  peer.value.on('connection', (data) => {
    if (!host) return
    console.log('Someone connected')
    setupConnection(data)
    const transferPlaylist = playlist.value.map((video) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { src, progress, ...rest } = video

      rest.status = rest.status === 'file-host' ? 'file-client' : 'link'
      if (rest.status !== 'link') delete rest.url
      return rest
    }) as Video[]
    data.on('open', () => {
      console.log('SENT INIT DATA')
      data.send({
        type: 'init',
        data: {
          playlist: transferPlaylist,
          active: activeVideo.value,
        },
      } as ConData)
    })
    connections.value.push(data)
  })
})
onBeforeUnmount(() => {
  client?.destroy()
})
</script>
