<template>
  <MainModal text="Add video">
    <select
      v-model="activeSection"
      class="w-full p-2 bg-extra cursor-pointer rounded-md appearance-none"
    >
      <option value="url">Direct Link</option>
      <option value="local">Local File</option>
      <option value="api">Search anime (likely would be muted)</option>
    </select>
    <div class="min-h-16 flex items-center justify-center" v-if="activeSection === 'local'">
      <ButtonPrimary @click="fileInputRef?.click()"
        >Select file
        <div class="h-4 aspect-square"></div
      ></ButtonPrimary>
      <input
        class="hidden"
        type="file"
        @change="addVideo"
        accept="video/*"
        ref="fileInputRef"
        multiple
      />
    </div>
    <div v-else-if="activeSection === 'url'" class="flex flex-col gap-2">
      <label class="uppercase font-mono font-semibold text-lg" for="Video-URL"
        >Enter video URL</label
      >
      <input
        v-model="videoURL"
        ref="inputRef"
        id="Video-URL"
        class="w-full py-2 px-4 border rounded-md bg-extra focus-visible:outline-none focus-visible:ring ring-secondary"
        placeholder="Enter link..."
      />
      <div class="flex w-full justify-end">
        <ButtonPrimary @click="addURL">Add</ButtonPrimary>
      </div>
    </div>
    <div v-else-if="activeSection === 'api'" class="flex flex-col gap-2">
      <label class="uppercase font-mono font-semibold text-lg" for="Anime-title"
        >Enter anime title</label
      >
      <input
        v-model="searchAnime"
        ref="inputRef"
        id="Anime-title"
        class="w-full py-2 px-4 border rounded-md bg-extra focus-visible:outline-none focus-visible:ring ring-secondary"
        placeholder="Enter link..."
      />
      <div class="flex w-full justify-end">
        <ButtonPrimary @click="search">Search</ButtonPrimary>
      </div>
      <label for="anime" v-if="animes.length">Search results</label>
      <select
        v-if="animes.length"
        id="anime"
        v-model="animeId"
        class="w-full p-2 bg-extra cursor-pointer rounded-md appearance-none"
      >
        <option v-for="anime of animes" :value="anime.id">{{ anime.title }}</option>
      </select>
      <label for="episode" v-if="episodes.length">Episode #</label>
      <div class="flex w-full gap-4" v-if="episodes.length">
        <select
          id="episode"
          v-model="episodeId"
          class="flex-grow p-2 bg-extra cursor-pointer rounded-md appearance-none"
        >
          <option v-for="episode of episodes" :value="episode.id">{{ episode.number }}</option>
        </select>
        <button @click="addEpisode" class="h-8 aspect-square cursor-pointer">
          <PlusIcon />
        </button>
      </div>
    </div>
    <aside
      v-if="isLoading"
      class="absolute top-0 left-0 w-full h-full backdrop-blur-xs flex items-center justify-center"
    >
      <div class="h-16 aspect-square animate-spin">
        <LoadingIcon />
      </div>
    </aside>
  </MainModal>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import MainModal from './MainModal.vue'
import ButtonPrimary from './ButtonPrimary.vue'
import PlusIcon from './icons/PlusIcon.vue'
import LoadingIcon from './icons/LoadingIcon.vue'

interface Anime {
  id: string
  image: string
  rating: number
  releaseDate: number
  title: string
  type: string
}

type EpisodeList = {
  duration: string
  id: string
  image: string
  number: number
  title: string
  url: string
}[]

interface Episode {
  isDub: boolean
  isM3U8: boolean
  quality: string
  url: string
}

const emit = defineEmits<{
  (e: 'upload', value: File[]): void
  (e: 'add', value: string): void
}>()
const fileInputRef = ref<HTMLInputElement>()
const activeSection = ref<'local' | 'url' | 'api'>('url')
const animeId = ref<string>('')
const episodeId = ref<string>('')
const searchAnime = ref<string>('')
const animes = ref<Anime[]>([])
const episodes = ref<EpisodeList>([])
const videoURL = ref<string>('')
const isLoading = ref<boolean>(false)
const addVideo = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (!target.files?.length) return
  // console.log(target.files[0])
  const files = target.files
  emit('upload', Array.from(files))
  target.value = ''
}
const addURL = () => {
  emit('add', videoURL.value)
  videoURL.value = ''
}
const search = async () => {
  animes.value = []
  animeId.value = ''
  isLoading.value = true
  const data: Anime[] = await fetch(
    import.meta.env.VITE_API_URL +
      '/api/search?' +
      new URLSearchParams({
        query: searchAnime.value,
      }),
  )
    .then((resp) => resp.json())
    .then((json) => json.results)
    .catch((e) => console.error(e))
  isLoading.value = false
  if (!data?.length) return console.error('Something went wrong searching for anime')
  animes.value = data
  animeId.value = data[0].id
}

watch(animeId, async (id) => {
  isLoading.value = true
  episodes.value = []
  episodeId.value = ''
  const data: EpisodeList = await fetch(
    import.meta.env.VITE_API_URL +
      '/api/episodes?' +
      new URLSearchParams({
        id,
      }),
  )
    .then((resp) => resp.json())
    .catch((e) => console.error(e))
  isLoading.value = false
  if (!data?.length) return console.error('Something went wrong retreiving episodes')
  episodes.value = data
  episodeId.value = data[0].id
})

const addEpisode = async () => {
  isLoading.value = true
  const data: Episode[] = await fetch(
    import.meta.env.VITE_API_URL +
      '/api/episode?' +
      new URLSearchParams({
        id: episodeId.value,
      }),
  )
    .then((resp) => resp.json())
    .catch((e) => console.error(e))
  isLoading.value = false
  if (!data?.length) return console.error('Something went wrong retreiving episodes')
  let episode: Episode = data[0]
  for (const ep of data) if (!ep.isDub) episode = ep
  console.log(episode)
  emit('add', episode.url)
}
</script>
