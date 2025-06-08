<template>
  <MainSection>
    <div
      v-for="(video, id) of playlist"
      v-bind:key="video.id"
      :class="id === selected && 'bg-extra2'"
      @click="$emit('select', id)"
      class="flex min-h-fit items-center w-full justify-between p-1 gap-2 tracking-tighter select-none cursor-pointer overflow-x-hidden relative"
    >
      <div
        @click.stop
        v-if="video.progress && video.progress < 1"
        class="absolute left-0 top-0 w-full h-full backdrop-blur-[2px] flex items-center"
      >
        <div
          class="w-full bg-extra2 rounded-full h-1.5 relative cursor-pointer group"
          ref="progressRef"
        >
          <div
            class="bg-thirdary h-full rounded-full absolute left-0 top-0 pointer-events-none"
            :style="{ width: video.progress * 100 + '%' }"
          ></div>
        </div>
      </div>
      <div
        @click.stop="$emit('delete', id)"
        class="aspect-square h-6 hover:bg-thirdary hover:text-extra2 rounded-lg flex items-center justify-center"
      >
        <CloseIcon />
      </div>
      <span class="flex-grow break-words text-sm overflow-x-hidden"
        >{{ id }}. {{ video.name }}
      </span>
      <div class="w-8 flex text-xs justify-end" v-if="video.url">
        <div class="w-4 aspect-square"><Checkicon /></div>
      </div>
    </div>
    <div class="min-h-16 flex items-center justify-center">
      <!-- <ButtonPrimary @click="fileInputRef?.click()">Add</ButtonPrimary>
      <input
        class="hidden"
        type="file"
        @change="addVideo"
        accept="video/*"
        ref="fileInputRef"
        multiple
      /> -->

      <ButtonPrimary @click="selectModal = true"
        >Add
        <div class="h-4 aspect-square"><PlusIcon /></div
      ></ButtonPrimary>
    </div>
  </MainSection>
  <SelectModal
    v-if="selectModal"
    @upload="
      (files) => {
        selectModal = false
        $emit('upload', files)
      }
    "
    @add="
      (url) => {
        if (!url.endsWith('.m3u8')) selectModal = false
        $emit('add', url)
      }
    "
    @close="selectModal = false"
  />
</template>
<script setup lang="ts">
import MainSection from './MainSection.vue'
import { ref, type PropType } from 'vue'
import CloseIcon from './icons/CloseIcon.vue'
import ButtonPrimary from './ButtonPrimary.vue'
import Checkicon from './icons/Checkicon.vue'
import PlusIcon from './icons/PlusIcon.vue'
import SelectModal from './SelectModal.vue'
import { url } from 'inspector'
// import SelectModal from './SelectModal.vue'
const selectModal = ref<boolean>(false)
defineProps({
  selected: {
    type: Number,
    required: true,
  },
  playlist: {
    type: Array as PropType<Video[]>,
  },
})

defineEmits<{
  (e: 'select', value: number): void
  (e: 'delete', value: number): void
  (e: 'upload', value: File[]): void
  (e: 'add', value: string): void
}>()
</script>
