<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseModal from './base/BaseModal.vue';
import BaseButton from './base/BaseButton.vue';
import { format } from 'date-fns';

const props = defineProps<{
    modelValue: boolean;
    absence: any | null;
    categories: any[];
}>();

const emit = defineEmits(['update:modelValue', 'save']);
const { t } = useI18n();

const formData = ref({
    absenceReasonId: 0,
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    isFullDay: true,
    startTime: '09:00',
    endTime: '17:00',
    comment: ''
});

const errors = ref<Record<string, string>>({});

watch(() => props.modelValue, (newVal) => {
    if (newVal) {
        if (props.absence) {
            formData.value = {
                absenceReasonId: props.absence.absenceReasonId,
                startDate: props.absence.startDate,
                endDate: props.absence.endDate,
                isFullDay: props.absence.isFullDay,
                startTime: props.absence.startTime || '09:00',
                endTime: props.absence.endTime || '17:00',
                comment: props.absence.comment || ''
            };
        } else {
            formData.value = {
                absenceReasonId: props.categories.length > 0 ? props.categories[0].id : 0,
                startDate: format(new Date(), 'yyyy-MM-dd'),
                endDate: format(new Date(), 'yyyy-MM-dd'),
                isFullDay: true,
                startTime: '09:00',
                endTime: '17:00',
                comment: ''
            };
        }
        errors.value = {};
    }
});

// Auto-select first category when they load and nothing is selected yet
watch(() => props.categories, (newCats) => {
    if (!props.absence && formData.value.absenceReasonId === 0 && newCats.length > 0) {
        formData.value.absenceReasonId = newCats[0].id;
    }
}, { deep: true });

const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.value.absenceReasonId) {
        newErrors.absenceReasonId = t('ct.extension.timetracker.absences.validation.reasonRequired');
    }
    
    if (!formData.value.startDate) {
        newErrors.startDate = t('ct.extension.timetracker.absences.validation.startDateRequired');
    }
    
    if (!formData.value.endDate) {
        newErrors.endDate = t('ct.extension.timetracker.absences.validation.endDateRequired');
    } else if (formData.value.startDate && formData.value.endDate < formData.value.startDate) {
        newErrors.endDate = t('ct.extension.timetracker.absences.validation.endDateAfterStartDate');
    }
    
    errors.value = newErrors;
    return Object.keys(newErrors).length === 0;
};

const handleSave = () => {
    if (validate()) {
        emit('save', {
            ...props.absence, // Preserve ID if editing
            ...formData.value
        });
    }
};
</script>

<template>
    <BaseModal
        :model-value="modelValue"
        @update:model-value="emit('update:modelValue', $event)"
        :title="absence ? t('ct.extension.timetracker.absences.editAbsence') : t('ct.extension.timetracker.absences.addAbsence')"
        size="md"
    >
        <div class="space-y-4">
            <!-- Reason -->
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('ct.extension.timetracker.absences.reason') }}</label>
                <select 
                    v-model="formData.absenceReasonId"
                    class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    :class="{ 'border-red-500': errors.absenceReasonId }"
                >
                    <option value="0" disabled>{{ t('ct.extension.timetracker.absences.selectReason') }}</option>
                    <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                        {{ cat.name }}
                    </option>
                </select>
                <p v-if="errors.absenceReasonId" class="mt-1 text-xs text-red-500">{{ errors.absenceReasonId }}</p>
            </div>

            <!-- Dates -->
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('ct.extension.timetracker.absences.startDate') }}</label>
                    <input 
                        type="date"
                        v-model="formData.startDate"
                        class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        :class="{ 'border-red-500': errors.startDate }"
                    />
                    <p v-if="errors.startDate" class="mt-1 text-xs text-red-500">{{ errors.startDate }}</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('ct.extension.timetracker.absences.endDate') }}</label>
                    <input 
                        type="date"
                        v-model="formData.endDate"
                        class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        :class="{ 'border-red-500': errors.endDate }"
                    />
                    <p v-if="errors.endDate" class="mt-1 text-xs text-red-500">{{ errors.endDate }}</p>
                </div>
            </div>

            <!-- Full Day Toggle -->
            <div class="flex items-center">
                <input 
                    type="checkbox" 
                    id="isFullDay"
                    v-model="formData.isFullDay"
                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label for="isFullDay" class="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    {{ t('ct.extension.timetracker.absences.fullDayLabel') }}
                </label>
            </div>

            <!-- Times (if not full day) -->
            <div v-if="!formData.isFullDay" class="grid grid-cols-2 gap-4 animate-fade-in">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('ct.extension.timetracker.absences.startTime') }}</label>
                    <input 
                        type="time"
                        v-model="formData.startTime"
                        class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('ct.extension.timetracker.absences.endTime') }}</label>
                    <input 
                        type="time"
                        v-model="formData.endTime"
                        class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                </div>
            </div>

            <!-- Comment -->
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('ct.extension.timetracker.absences.comment') }}</label>
                <textarea 
                    v-model="formData.comment"
                    rows="3"
                    class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    :placeholder="t('ct.extension.timetracker.absences.commentPlaceholder')"
                ></textarea>
            </div>
        </div>

        <template #footer>
            <div class="flex justify-end gap-3">
                <BaseButton variant="secondary" @click="emit('update:modelValue', false)">
                    {{ t('ct.extension.timetracker.common.cancel') }}
                </BaseButton>
                <BaseButton variant="primary" @click="handleSave">
                    {{ absence ? t('ct.extension.timetracker.absences.updateAbsence') : t('ct.extension.timetracker.absences.addAbsence') }}
                </BaseButton>
            </div>
        </template>
    </BaseModal>
</template>

<style scoped>
.animate-fade-in {
    animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-5px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>
