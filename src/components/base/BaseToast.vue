<script setup lang="ts">
import { computed } from 'vue';
import type { ToastType } from '../../stores/toast.store';

const props = defineProps<{
    message: string;
    type: ToastType;
}>();

defineEmits(['close']);

const bgColor = computed(() => {
    switch (props.type) {
        case 'success': return 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800';
        case 'error': return 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800';
        case 'warning': return 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800';
        case 'info': return 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800';
        default: return 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
});

const textColor = computed(() => {
    switch (props.type) {
        case 'success': return 'text-emerald-800 dark:text-emerald-300';
        case 'error': return 'text-red-800 dark:text-red-300';
        case 'warning': return 'text-amber-800 dark:text-amber-300';
        case 'info': return 'text-blue-800 dark:text-blue-300';
        default: return 'text-gray-800 dark:text-gray-200';
    }
});

const iconColor = computed(() => {
    switch (props.type) {
        case 'success': return 'text-emerald-500';
        case 'error': return 'text-red-500';
        case 'warning': return 'text-amber-500';
        case 'info': return 'text-blue-500';
        default: return 'text-gray-500';
    }
});
</script>

<template>
    <div 
        :class="['flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg max-w-md pointer-events-auto backdrop-blur-sm', bgColor]"
        role="alert"
    >
        <!-- Icon -->
        <div :class="iconColor">
            <svg v-if="props.type === 'success'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <svg v-else-if="props.type === 'error'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <svg v-else-if="props.type === 'warning'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
        </div>

        <!-- Message -->
        <div :class="['text-sm font-medium flex-grow leading-tight', textColor]">
            {{ props.message }}
        </div>

        <!-- Close Button -->
        <button 
            @click="$emit('close')"
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
        >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
        </button>
    </div>
</template>
