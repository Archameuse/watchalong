<template>
  <MainSection class="gap-4 overflow-y-scroll">
    <div
      v-for="user of users"
      v-bind:key="user.id"
      class="flex items-center w-full p-0.5 gap-2 min-h-fit tracking-tighter select-none cursor-pointer overflow-hidden"
    >
      <div class="h-12 aspect-square overflow-hidden">
        <img :src="user.avatar" draggable="false" class="h-full w-full object-cover" />
      </div>
      <div class="w-full flex justify-between">
        <span class="capitalize">{{ user.name }}</span>
      </div>
      <div v-if="user.id === owner" class="h-6 aspect-square">
        <CrownIcon />
      </div>
    </div>
  </MainSection>
</template>

<script setup lang="ts">
import { randomName } from '@/utils/helpers'
import MainSection from './MainSection.vue'
import { v4 } from 'uuid'
import { createAvatar } from '@dicebear/core'
import { bottts } from '@dicebear/collection'
import { useRoute } from 'vue-router'
import CrownIcon from './icons/CrownIcon.vue'
const route = useRoute()
const { id: owner } = route.params

const users: User[] = []
for (let i = 0; i < 10; i++) {
  const name = randomName()
  const svg = createAvatar(bottts, {
    seed: name,
  }).toString()
  const id = i === 0 && typeof route.params.id === 'string' ? route.params.id : v4()
  users.push({
    id,
    name,
    avatar: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
  })
}
</script>
