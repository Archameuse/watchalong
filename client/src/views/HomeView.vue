<template>
  <main class="flex flex-col max-w-sm mx-auto gap-10 min-h-screen justify-center overflow-x-hidden">
    <h1 class="font-[impact] text-4xl [@media(width>19rem)]:text-6xl text-center">Watchalong</h1>
    <div class="flex justify-between gap-2">
      <ButtonPrimary @click="createRoom">
        <div class="w-4">
          <PlusIcon />
        </div>
        Create room
      </ButtonPrimary>
      <ButtonPrimary @click="joinModalActive = true">
        <div class="w-4">
          <LinkIcon />
        </div>
        Join room
      </ButtonPrimary>
    </div>
  </main>
  <!-- <JoinModal v-if="joinModalActive" @close="joinModalActive = false" @go="joinRoom" /> -->
</template>

<script setup lang="ts">
import ButtonPrimary from '@/components/ButtonPrimary.vue'
import PlusIcon from '@/components/icons/PlusIcon.vue'
import LinkIcon from '@/components/icons/LinkIcon.vue'
// import JoinModal from '@/components/JoinModal.vue'
import { v4 } from 'uuid'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
const joinModalActive = ref<boolean>(false)

const router = useRouter()

const createRoom = () => {
  const id = v4()
  // check if such room exists -> regenerate -> check again loop
  router.push({
    path: id,
    state: {
      host: true,
    },
  })
}
const joinRoom = (id?: string) => {
  if (!id) return alert('Please enter id')
  // check if room don't exist -> return alert('No such room exists')
  router.push({
    path: id,
    state: {
      host: false,
    },
  })
}
</script>
