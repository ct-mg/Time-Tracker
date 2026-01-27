<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  width?: string;
  height?: string;
  borderRadius?: string;
  className?: string;
}

const props = withDefaults(defineProps<Props>(), {
  width: '100%',
  height: '1rem',
  borderRadius: '0.25rem',
  className: ''
});

const style = computed(() => ({
  width: props.width,
  height: props.height,
  borderRadius: props.borderRadius
}));
</script>

<template>
  <div 
    class="skeleton-loader h-full overflow-hidden relative bg-gray-200 dark:bg-gray-700" 
    :class="className"
    :style="style"
  >
    <div class="shimmer-sweep absolute inset-0"></div>
  </div>
</template>

<style scoped>
.skeleton-loader {
  display: inline-block;
  vertical-align: middle;
}

.shimmer-sweep {
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.2) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  animation: shimmer 1.5s infinite;
}

.dark .shimmer-sweep {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.05) 50%,
    rgba(255, 255, 255, 0) 100%
  );
}

@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}
</style>
