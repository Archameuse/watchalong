import type { TorrentFile } from 'webtorrent'

export {}

declare global {
  interface Window {
    WebTorrent: {
      new (): WebTorrent.Instance
    }
  }
  interface User {
    name: string
    id: string
    // avatar: string
    host?: boolean
  }
  interface Video {
    id: string
    name: string
    status: 'file-host' | 'file-client' | 'link'
    src?: File
    url?: string
    progress?: number
    // adder: string
    // name: string
    // url: string
    // duration: number
    // size: number
    // type: string
    // src?: File
    // offset?: number
  }
  interface VideoData {
    type: 'host' | 'client' //host mean file-host, client mean everything else
    url: string
  }
}
