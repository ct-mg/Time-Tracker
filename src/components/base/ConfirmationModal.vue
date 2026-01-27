<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import BaseModal from './BaseModal.vue';
import BaseButton from './BaseButton.vue';

interface Props {
    modelValue: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'primary';
    isLoading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    variant: 'danger',
    isLoading: false
});

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void;
    (e: 'confirm'): void;
    (e: 'cancel'): void;
}>();

const { t } = useI18n();

function handleConfirm() {
    emit('confirm');
}

function handleCancel() {
    emit('cancel');
    emit('update:modelValue', false);
}
</script>

<template>
    <BaseModal
        :model-value="modelValue"
        @update:model-value="emit('update:modelValue', $event)"
        :title="title"
        size="sm"
    >
        <div class="flex items-start gap-4">
            <div 
                v-if="variant === 'danger'"
                class="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400"
            >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
            </div>
            <div 
                v-else-if="variant === 'warning'"
                class="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400"
            >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
            </div>
            
            <div class="mt-1">
                <p class="text-sm text-gray-600 dark:text-gray-300">
                    {{ message }}
                </p>
            </div>
        </div>

        <template #footer>
            <div class="flex justify-end gap-3">
                <BaseButton variant="secondary" @click="handleCancel">
                    {{ cancelLabel || t('ct.extension.timetracker.common.cancel') }}
                </BaseButton>
                <BaseButton 
                    :variant="variant" 
                    :is-loading="isLoading"
                    @click="handleConfirm"
                >
                    {{ confirmLabel || t('ct.extension.timetracker.common.confirm') }}
                </BaseButton>
            </div>
        </template>
    </BaseModal>
</template>
