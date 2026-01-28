<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useAuthStore } from './stores/auth.store';
import { useTimeEntriesStore } from './stores/time-entries.store';
import { useSettingsStore } from './stores/settings.store';
import { useAbsencesStore } from './stores/absences.store';
import { useToastStore } from './stores/toast.store';
import { useI18n } from 'vue-i18n';

// Components
import TrackerControls from './components/TrackerControls.vue';
import TimeEntriesList from './components/TimeEntriesList.vue';
import TimeTrackerFilters from './components/TimeTrackerFilters.vue';
import TimeEntryModal from './components/TimeEntryModal.vue';
import AdminSettings from './components/AdminSettings.vue';
import StatisticsCards from './components/StatisticsCards.vue';
import RecentEntries from './components/RecentEntries.vue';
import AbsenceModal from './components/AbsenceModal.vue';
import AbsencesList from './components/AbsencesList.vue';
import ReportsView from './components/ReportsView.vue';
import ToastContainer from './components/ToastContainer.vue';
import ConfirmationModal from './components/base/ConfirmationModal.vue';
import MainHeader from './components/MainHeader.vue';
import TabNavigation from './components/TabNavigation.vue';

import { setLanguage } from './utils/i18n';
import type { TimeEntry } from './types/time-tracker';

const authStore = useAuthStore();
const settingsStore = useSettingsStore();
const timeEntriesStore = useTimeEntriesStore();
const toastStore = useToastStore();
const absencesStore = useAbsencesStore();
const { t } = useI18n();

const editingEntry = ref<TimeEntry | null>(null);
const editingAbsence = ref<any | null>(null);
const showModal = ref(false);
const showAbsenceModal = ref(false);
const showDeleteConfirm = ref(false);
const absenceToDelete = ref<any | null>(null);

// Initialize App
onMounted(() => {
    // 1. Initial Local Theme/Lang/UI
    settingsStore.initTheme();
    setLanguage(settingsStore.settings.language);

    // 2. Load History State (takes precedence over localStorage for back/forward)
    if (window.history.state && (window.history.state.currentView || window.history.state.activeTab)) {
        if (window.history.state.currentView) settingsStore.currentView = window.history.state.currentView;
        if (window.history.state.activeTab) settingsStore.activeTab = window.history.state.activeTab;
    } else {
        window.history.replaceState({ 
            currentView: settingsStore.currentView, 
            activeTab: settingsStore.activeTab 
        }, '', '');
    }

    // 3. Handle back/forward
    window.addEventListener('popstate', (event) => {
        if (event.state) {
            if (event.state.currentView) settingsStore.currentView = event.state.currentView;
            if (event.state.activeTab) settingsStore.activeTab = event.state.activeTab;
        }
    });
});

// Watch for language changes
watch(
    () => settingsStore.settings.language,
    (newLang) => {
        setLanguage(newLang);
    }
);

// Watch for module ID readiness to load initial data
watch(
    () => settingsStore.moduleId,
    async (newId) => {
        if (newId) {
            await Promise.all([
                timeEntriesStore.loadWorkCategories(),
                timeEntriesStore.loadTimeEntries(),
                absencesStore.loadAbsenceCategories(),
                absencesStore.loadAbsences(),
                authStore.checkPermissions()
            ]);
        }
    },
    { immediate: true }
);

// Sync state to history
watch([() => settingsStore.currentView, () => settingsStore.activeTab], ([newView, newTab]) => {
    const currentState = window.history.state;
    if (!currentState || currentState.currentView !== newView || currentState.activeTab !== newTab) {
        window.history.pushState(
            { currentView: newView, activeTab: newTab },
            '',
            ''
        );
    }
});

function handleAdd() {
    editingEntry.value = null;
    showModal.value = true;
}

function handleEdit(entry: TimeEntry) {
    editingEntry.value = entry;
    showModal.value = true;
}

async function handleSave(entryData: Partial<TimeEntry>) {
    try {
        await timeEntriesStore.saveManualEntry(entryData, editingEntry.value || undefined);
        toastStore.success('Entry saved successfully');
    } catch (e) {
        toastStore.error('Failed to save entry');
    }
}

// Absence Handlers
function handleAddAbsence() {
    editingAbsence.value = null;
    showAbsenceModal.value = true;
}

function handleEditAbsence(absence: any) {
    editingAbsence.value = absence;
    showAbsenceModal.value = true;
}

function handleDeleteAbsence(absence: any) {
    absenceToDelete.value = absence;
    showDeleteConfirm.value = true;
}

async function confirmDeleteAbsence() {
    if (!absenceToDelete.value) return;
    
    try {
        await absencesStore.deleteAbsence(absenceToDelete.value.id);
        toastStore.success(t('ct.extension.timetracker.notifications.entryDeleted'));
    } catch (e) {
        toastStore.error(t('ct.extension.timetracker.notifications.deleteEntryFailed'));
    } finally {
        showDeleteConfirm.value = false;
        absenceToDelete.value = null;
    }
}

async function handleSaveAbsence(absenceData: any) {
    try {
        await absencesStore.saveAbsence(absenceData);
        showAbsenceModal.value = false;
        toastStore.success('Absence saved');
    } catch (e) {
        toastStore.error('Failed to save absence');
    }
}
</script>

<template>
  <div class="time-tracker-app min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
    <div class="p-4 pb-24 max-w-7xl mx-auto">
    
    <MainHeader />

    <main v-if="settingsStore.currentView === 'tracker'">
        <TabNavigation />

        <!-- Dashboard Tab -->
        <div v-if="settingsStore.activeTab === 'dashboard'">
            <StatisticsCards />
            <TrackerControls />
            <div class="mb-8">
                <RecentEntries @viewAll="settingsStore.activeTab = 'entries'" />
            </div>
        </div>

        <!-- Time Entries Tab -->
        <div v-if="settingsStore.activeTab === 'entries'">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-semibold dark:text-white">{{ t('ct.extension.timetracker.timeEntries.title') }}</h2>
                <button 
                    @click="handleAdd"
                    class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    {{ t('ct.extension.timetracker.timeEntries.addManual') }}
                </button>
            </div>
            
            <div v-if="timeEntriesStore.isLoading" class="flex justify-center p-8 text-gray-500">
                Loading entries...
            </div>
            
            <TimeTrackerFilters />

            <TimeEntriesList 
                @edit="handleEdit" 
            />
        </div>

        <!-- Absences Tab -->
        <div v-if="settingsStore.activeTab === 'absences'">
            <AbsencesList 
                @add="handleAddAbsence"
                @edit="handleEditAbsence"
                @delete="handleDeleteAbsence"
            />
        </div>

        <!-- Reports Tab -->
        <div v-if="settingsStore.activeTab === 'reports'">
            <ReportsView />
        </div>

        <!-- Modals -->
        <TimeEntryModal
            v-model="showModal"
            :entry="editingEntry"
            :work-categories="timeEntriesStore.workCategories"
            @save="handleSave"
        />

        <AbsenceModal
            v-model="showAbsenceModal"
            :absence="editingAbsence"
            :categories="absencesStore.categories"
            @save="handleSaveAbsence"
        />

        <ConfirmationModal
            v-model="showDeleteConfirm"
            :title="t('ct.extension.timetracker.modal.deleteAbsence.title')"
            :message="t('ct.extension.timetracker.modal.deleteAbsence.message')"
            @confirm="confirmDeleteAbsence"
        />
    </main>

    <main v-else-if="settingsStore.currentView === 'admin'">
        <AdminSettings />
    </main>

    <!-- Toast Notifications -->
    <ToastContainer />
    </div>
  </div>
</template>
