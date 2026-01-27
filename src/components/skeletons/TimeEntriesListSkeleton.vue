<script setup lang="ts">
import SkeletonLoader from '../base/SkeletonLoader.vue';
</script>

<template>
  <div class="space-y-6">
    <div v-for="i in 3" :key="i" class="bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
      <div class="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
        <SkeletonLoader width="150px" height="1.5rem" />
        <div class="flex gap-4">
          <SkeletonLoader width="80px" height="1rem" />
          <SkeletonLoader width="80px" height="1rem" />
        </div>
      </div>
      <div v-for="j in 2" :key="j" class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
        <div class="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex justify-between">
          <SkeletonLoader width="200px" height="1.25rem" />
          <SkeletonLoader width="100px" height="1rem" />
        </div>
        <div class="p-3">
          <div v-for="k in 3" :key="k" class="flex gap-4 mb-2 last:mb-0">
            <SkeletonLoader width="20px" height="20px" />
            <SkeletonLoader width="60px" height="1rem" />
            <SkeletonLoader width="60px" height="1rem" />
            <SkeletonLoader width="100px" height="1rem" />
            <SkeletonLoader width="150px" height="1rem" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
