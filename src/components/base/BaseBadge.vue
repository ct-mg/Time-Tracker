<script setup lang="ts">
import { computed } from 'vue';

interface Props {
    variant?: 'success' | 'danger' | 'warning' | 'info' | 'neutral';
    size?: 'sm' | 'md' | 'lg';
    rounded?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    variant: 'neutral',
    size: 'md',
    rounded: false
});

const baseClasses = 'inline-flex items-center font-medium transition-all duration-200';

const variantClasses = computed(() => {
    const variants = {
        success: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
        danger: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
        warning: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
        info: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
        neutral: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
    };
    return variants[props.variant];
});

const sizeClasses = computed(() => {
    const sizes = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-sm',
        lg: 'px-3 py-1.5 text-base'
    };
    return sizes[props.size];
});

const shapeClasses = computed(() => props.rounded ? 'rounded-full' : 'rounded');
</script>

<template>
    <span :class="[baseClasses, variantClasses, sizeClasses, shapeClasses, 'border']">
        <slot />
    </span>
</template>
