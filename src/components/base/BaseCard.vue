<script setup lang="ts">
interface Props {
    padding?: 'none' | 'sm' | 'md' | 'lg';
    hoverable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    padding: 'md',
    hoverable: false
});

const baseClasses = 'bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-all duration-200';

const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
};

const hoverClasses = props.hoverable ? 'hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer transform hover:-translate-y-0.5' : '';
</script>

<template>
    <div :class="[baseClasses, paddingClasses[padding], hoverClasses]">
        <slot />
    </div>
</template>
