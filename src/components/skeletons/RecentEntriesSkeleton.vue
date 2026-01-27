<script setup lang="ts">
import SkeletonLoader from '../base/SkeletonLoader.vue';
</script>

<template>
  <div class="space-y-4">
    <div v-for="i in 2" :key="i">
      <SkeletonLoader width="150px" height="1rem" class-name="mb-3" />
      <div v-for="j in 2" :key="j" class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg mb-2">
        <div class="flex items-center gap-3">
          <SkeletonLoader width="4px" height="2rem" />
          <div>
            <SkeletonLoader width="100px" height="1rem" class-name="mb-1" />
            <SkeletonLoader width="150px" height="0.75rem" />
          </div>
        </div>
        <div class="text-right">
          <SkeletonLoader width="80px" height="1rem" class-name="mb-1" />
          <SkeletonLoader width="40px" height="0.75rem" />
        </div>
      </div>
    </div>
  </div>
</template>
