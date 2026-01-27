<script setup lang="ts">
import BaseCard from '../base/BaseCard.vue';
import SkeletonLoader from '../base/SkeletonLoader.vue';
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
    <BaseCard v-for="i in 4" :key="i" padding="md">
      <div class="space-y-4">
        <div class="flex justify-between items-start">
          <SkeletonLoader width="80px" height="1.25rem" />
          <SkeletonLoader width="20px" height="20px" border-radius="50%" />
        </div>
        <div>
          <SkeletonLoader width="120px" height="2rem" />
          <SkeletonLoader width="60px" height="0.75rem" class-name="mt-2" />
        </div>
        <SkeletonLoader width="100%" height="0.5rem" border-radius="1rem" />
        <div class="flex justify-between">
          <SkeletonLoader width="30px" height="0.75rem" />
          <SkeletonLoader width="60px" height="0.75rem" />
        </div>
      </div>
    </BaseCard>
  </div>
</template>
