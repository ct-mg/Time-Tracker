<script setup lang="ts">
import { computed } from 'vue';
import { useTracking } from '../composables/useTracking';

const { elapsedTime, isTracking } = useTracking();

const formattedTime = computed(() => {
    if (!isTracking.value) return '00:00:00';
    
    const totalSeconds = Math.floor(elapsedTime.value / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
});
</script>

<template>
    <div 
        class="text-4xl font-mono font-bold text-gray-800 dark:text-white tracking-wider px-4 py-2 rounded-lg"
        :class="{ 'animate-shine text-green-600 dark:text-green-400': isTracking }"
    >
        {{ formattedTime }}
    </div>
</template>

<style scoped>
/* Scoped styles removed as animation moved to global style.css */
</style>
