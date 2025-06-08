<template>
  <svg v-if="stage === 1" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
    <g id="SVGRepo_iconCarrier">
      <path d="M6 1H8V15H6L2 11H0V5H2L6 1Z" fill="currentColor"></path>
      <path
        d="M14 8C14 5.79086 12.2091 4 10 4V2C13.3137 2 16 4.68629 16 8C16 11.3137 13.3137 14 10 14V12C12.2091 12 14 10.2091 14 8Z"
        fill="currentColor"
      ></path>
      <path
        d="M12 8C12 9.10457 11.1046 10 10 10V6C11.1046 6 12 6.89543 12 8Z"
        fill="currentColor"
      ></path>
    </g>
  </svg>
  <svg v-else-if="stage === 2" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
    <g id="SVGRepo_iconCarrier">
      <path d="M8 1H6L2 5H0V11H2L6 15H8V1Z" fill="currentColor"></path>
      <path
        d="M12 8C12 9.10457 11.1046 10 10 10V6C11.1046 6 12 6.89543 12 8Z"
        fill="currentColor"
      ></path>
    </g>
  </svg>
  <svg v-else viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
    <g id="SVGRepo_iconCarrier">
      <path d="M8 1H6L2 5H0V11H2L6 15H8V1Z" fill="currentColor"></path>
      <path
        d="M9.29289 6.20711L11.0858 8L9.29289 9.79289L10.7071 11.2071L12.5 9.41421L14.2929 11.2071L15.7071 9.79289L13.9142 8L15.7071 6.20711L14.2929 4.79289L12.5 6.58579L10.7071 4.79289L9.29289 6.20711Z"
        fill="currentColor"
      ></path>
    </g>
  </svg>
</template>

<script setup lang="ts">
defineProps({
  stage: {
    type: Number,
    default: 1,
  },
})
</script>
