<script setup lang="ts">
interface Props {
    modelValue: boolean;
    title?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    closeOnBackdrop?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    size: 'md',
    closeOnBackdrop: true
});

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void;
}>();

const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
};

function close() {
    emit('update:modelValue', false);
}

function handleBackdropClick() {
    if (props.closeOnBackdrop) {
        close();
    }
}
</script>

<template>
    <Transition
        enter-active-class="transition-opacity duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
    >
        <div 
            v-if="modelValue" 
            class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            @click.self="handleBackdropClick"
        >
            <Transition
                enter-active-class="transition-all duration-200 ease-out"
                enter-from-class="opacity-0 scale-95 translate-y-4"
                enter-to-class="opacity-100 scale-100 translate-y-0"
                leave-active-class="transition-all duration-150 ease-in"
                leave-from-class="opacity-100 scale-100 translate-y-0"
                leave-to-class="opacity-0 scale-95 translate-y-4"
            >
                <div 
                    v-if="modelValue"
                    :class="['bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full', sizeClasses[size]]"
                    @click.stop
                >
                    <!-- Header -->
                    <div v-if="title || $slots.header" class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <slot name="header">
                            <h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ title }}</h3>
                        </slot>
                        <button 
                            @click="close"
                            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                        >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>

                    <!-- Body -->
                    <div class="px-6 py-4">
                        <slot />
                    </div>

                    <!-- Footer -->
                    <div v-if="$slots.footer" class="px-6 py-4 bg-gray-50 dark:bg-gray-900 rounded-b-lg border-t border-gray-200 dark:border-gray-700">
                        <slot name="footer" />
                    </div>
                </div>
            </Transition>
        </div>
    </Transition>
</template>
