<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from './stores/auth.store';
import { useTimeEntriesStore } from './stores/time-entries.store';
import { useSettingsStore } from './stores/settings.store';
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
import UserSettings from './components/UserSettings.vue';
import ToastContainer from './components/ToastContainer.vue';
import { useAbsencesStore } from './stores/absences.store';
import { useToastStore } from './stores/toast.store';
import { watch } from 'vue';
import type { TimeEntry } from './types/time-tracker';

const authStore = useAuthStore();
const settingsStore = useSettingsStore();
const timeEntriesStore = useTimeEntriesStore();
const toastStore = useToastStore();
const absencesStore = useAbsencesStore();

const editingEntry = ref<TimeEntry | null>(null);
const editingAbsence = ref<any | null>(null);
const showModal = ref(false);
const showAbsenceModal = ref(false);
const currentView = ref<'tracker' | 'admin'>('tracker');
const activeTab = ref<'dashboard' | 'entries' | 'absences' | 'reports'>('dashboard');

// Initialize Theme
onMounted(() => {
    settingsStore.initTheme();
});

// Watch for module ID readiness to load initial data
watch(
    () => settingsStore.moduleId,
    async (newId) => {
        if (newId) {
            await timeEntriesStore.loadWorkCategories(newId);
            await timeEntriesStore.loadTimeEntries(newId);
            await absencesStore.loadAbsenceCategories();
            await absencesStore.loadAbsences();
            await authStore.checkPermissions(); // Ensure permissions are checked
        }
    }
);

function handleAdd() {
    editingEntry.value = null;
    showModal.value = true;
}

function handleEdit(entry: TimeEntry) {
    editingEntry.value = entry;
    showModal.value = true;
}

async function handleSave(entryData: Partial<TimeEntry>) {
    if (settingsStore.moduleId) {
        try {
            await timeEntriesStore.saveManualEntry(settingsStore.moduleId, entryData, editingEntry.value || undefined);
            toastStore.success('Entry saved successfully');
        } catch (e) {
            toastStore.error('Failed to save entry');
        }
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

async function handleDeleteAbsence(absence: any) {
    if (confirm('Are you sure you want to delete this absence?')) {
        try {
            await absencesStore.deleteAbsence(absence.id);
            toastStore.success('Absence deleted');
        } catch (e) {
            toastStore.error('Failed to delete absence');
        }
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
    <header class="mb-8 flex justify-between items-center">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">ChurchTools Time Tracker</h1>
      
      <div class="flex items-center gap-4">
          <div v-if="authStore.isAdmin" class="flex bg-gray-100 dark:bg-gray-800 rounded p-1">
              <button 
                @click="currentView = 'tracker'"
                :class="['px-3 py-1 rounded text-sm font-medium transition-colors', currentView === 'tracker' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400']"
              >
                  Tracker
              </button>
              <button 
                @click="currentView = 'admin'"
                :class="['px-3 py-1 rounded text-sm font-medium transition-colors', currentView === 'admin' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400']"
              >
                  Admin
              </button>
          </div>

          <!-- User Settings Dropdown -->
          <div v-if="authStore.user">
            <UserSettings />
          </div>
      </div>
    </header>

    <main v-if="currentView === 'tracker'">
        <!-- Tab Navigation -->
        <div class="mb-6 border-b border-gray-200 dark:border-gray-700">
            <nav class="flex gap-8" aria-label="Tabs">
                <button
                    @click="activeTab = 'dashboard'"
                    :class="[
                        'py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2',
                        activeTab === 'dashboard'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    ]"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                    </svg>
                    Dashboard
                </button>
                <button
                    @click="activeTab = 'entries'"
                    :class="[
                        'py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2',
                        activeTab === 'entries'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    ]"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Time Entries
                </button>
                <button
                    @click="activeTab = 'absences'"
                    :class="[
                        'py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2',
                        activeTab === 'absences'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    ]"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    Absences
                </button>
                <button
                    @click="activeTab = 'reports'"
                    :class="[
                        'py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2',
                        activeTab === 'reports'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    ]"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    Reports
                </button>
            </nav>
        </div>

        <!-- Dashboard Tab -->
        <div v-if="activeTab === 'dashboard'">
        <!-- Statistics Cards -->
        <StatisticsCards />

        <!-- TrackerControls -->
        <TrackerControls />
        
        <!-- Recent Entries -->
        <div class="mb-8">
            <RecentEntries @viewAll="activeTab = 'entries'" />
        </div>
        </div>

        <!-- Time Entries Tab -->
        <div v-if="activeTab === 'entries'">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-semibold dark:text-white">Time Entries</h2>
                <button 
                    @click="handleAdd"
                    class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add Entry
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
        <div v-if="activeTab === 'absences'">
            <AbsencesList 
                @add="handleAddAbsence"
                @edit="handleEditAbsence"
                @delete="handleDeleteAbsence"
            />
        </div>

        <!-- Reports Tab -->
        <div v-if="activeTab === 'reports'">
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
    </main>

    <main v-else-if="currentView === 'admin'">
        <AdminSettings />
    </main>

    <!-- Toast Notifications -->
    <ToastContainer />
    </div>
  </div>
</template>
