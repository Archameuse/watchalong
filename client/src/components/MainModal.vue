<template>
  <aside
    @mousedown="$emit('close')"
    class="w-full h-full fixed top-0 left-0 bg-[#00000079] flex items-center justify-center"
  >
    <div
      @mousedown.stop
      class="bg-thirdary text-primary w-screen max-w-sm max-h-screen p-4 overflow-y-auto flex flex-col gap-4 relative"
    >
      <div class="flex justify-between items-center select-none border-b">
        <h1 class="text-4xl font-mono font-semibold">{{ text }}</h1>
        <button
          class="h-12 aspect-square cursor-pointer hover:opacity-80 active:opacity-95 transition-all"
          @click="$emit('close')"
        >
          <CloseIcon />
        </button>
      </div>
      <slot></slot>
    </div>
  </aside>
</template>

<script setup lang="ts">
import CloseIcon from './icons/CloseIcon.vue'

defineEmits(['close'])
defineProps({
  text: {
    type: String,
    default: 'Default name',
  },
})
</script>
