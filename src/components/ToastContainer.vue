<script setup lang="ts">
import { useToastStore } from '../stores/toast.store';
import BaseToast from './base/BaseToast.vue';

const toastStore = useToastStore();
</script>

<template>
    <div class="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
        <TransitionGroup 
            name="toast"
            enter-active-class="transition duration-300 ease-out"
            enter-from-class="transform translate-x-12 opacity-0"
            enter-to-class="transform translate-x-0 opacity-100"
            leave-active-class="transition duration-200 ease-in"
            leave-from-class="transform translate-x-0 opacity-100"
            leave-to-class="transform translate-x-12 opacity-0"
            move-class="transition duration-300 ease-in-out"
        >
            <BaseToast 
                v-for="toast in toastStore.toasts"
                :key="toast.id"
                :message="toast.message"
                :type="toast.type"
                @close="toastStore.removeToast(toast.id)"
            />
        </TransitionGroup>
    </div>
</template>

<style scoped>
.toast-move {
    transition: all 0.3s ease;
}
</style>
