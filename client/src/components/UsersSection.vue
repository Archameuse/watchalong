<template>
  <MainSection class="gap-4 overflow-y-auto">
    <div
      v-for="user of users"
      v-bind:key="user.id"
      class="flex items-center w-full p-0.5 px-2 gap-2 min-h-fit tracking-tighter select-none cursor-pointer overflow-hidden"
      :class="socket.id===user.id&&'bg-extra2'"
    >
      <div class="h-12 aspect-square overflow-hidden">
        <img :src="getImage(user.name)" draggable="false" class="h-full w-full object-cover" />
      </div>
      <div class="w-full flex justify-between">
        <span class="capitalize">{{ user.name }}</span>
      </div>
      <div v-if="user.host" class="h-6 aspect-square">
        <CrownIcon />
      </div>
    </div>
  </MainSection>
</template>

<script setup lang="ts">
import MainSection from './MainSection.vue'
import { createAvatar } from '@dicebear/core'
import { bottts } from '@dicebear/collection'
import CrownIcon from './icons/CrownIcon.vue'
import type {PropType} from 'vue'
import socket from '@/utils/socket'
defineProps({
  users: {
    type: Array as PropType<User[]>,
    required: true
  }
})
const getImage = (name:string) => {
  const svg = createAvatar(bottts, {
    seed: name,
  }).toString()
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
</script>
