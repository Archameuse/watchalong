<template>
  <MainModal text="Add video">
    <select
      v-model="activeSection"
      class="w-full p-2 bg-extra cursor-pointer rounded-md appearance-none"
    >
      <option value="local" v-if="host">Local File</option>
      <option value="url">Direct Link</option>
    </select>
    <div class="min-h-16 flex items-center justify-center" v-if="host && activeSection === 'local'">
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
  </MainModal>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import MainModal from './MainModal.vue'
import ButtonPrimary from './ButtonPrimary.vue'
const { host } = history.state
const emit = defineEmits<{
  (e: 'upload', value: File[]): void
  (e: 'add', value: string): void
}>()
const fileInputRef = ref<HTMLInputElement>()
const activeSection = ref<'local' | 'url'>(host ? 'local' : 'url')
const videoURL = ref<string>('')
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
</script>
