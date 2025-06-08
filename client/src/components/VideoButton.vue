<template>
  <button class="h-8 aspect-square cursor-pointer" :class="big && 'hidden md:block'">
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
defineProps({
  big: Boolean,
})
</script>
