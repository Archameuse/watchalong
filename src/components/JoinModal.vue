<template>
  <MainModal text="Join Room">
    <div class="flex-col gap-2">
      <label class="uppercase font-mono font-semibold text-lg" for="Room-link">Room link</label>
      <input
        ref="inputRef"
        id="Room-link"
        class="w-full py-2 px-4 border rounded-md bg-extra focus-visible:outline-none focus-visible:ring ring-secondary"
        placeholder="Enter link..."
      />
    </div>
    <div class="flex w-full justify-end">
      <ButtonPrimary @click="$emit('go', inputRef?.value)">Join</ButtonPrimary>
    </div>
  </MainModal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ButtonPrimary from './ButtonPrimary.vue'
import MainModal from './MainModal.vue'

defineEmits(['go'])
const inputRef = ref<HTMLInputElement>()
</script>
