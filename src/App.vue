<script setup lang="ts">
import { ref } from 'vue'; // ref needed
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
import { watch } from 'vue';
import type { TimeEntry } from './types/time-tracker';

const authStore = useAuthStore();
const settingsStore = useSettingsStore();
const timeEntriesStore = useTimeEntriesStore();

const showModal = ref(false);
const editingEntry = ref<TimeEntry | null>(null);
const currentView = ref<'tracker' | 'admin'>('tracker');
const activeTab = ref<'dashboard' | 'entries' | 'absences'>('dashboard');

// Watch for module ID readiness to load initial data
watch(
    () => settingsStore.moduleId,
    async (newId) => {
        if (newId) {
            await timeEntriesStore.loadWorkCategories(newId);
            await timeEntriesStore.loadTimeEntries(newId);
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
        } catch (e) {
            alert('Failed to save entry');
        }
    }
}
</script>

<template>
  <div class="time-tracker-app p-4 max-w-7xl mx-auto">
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

          <div v-if="authStore.user" class="text-sm text-gray-600 dark:text-gray-400">
            {{ authStore.user.firstName }} {{ authStore.user.lastName }}
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
                        'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                        activeTab === 'dashboard'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    ]"
                >
                    📊 Dashboard
                </button>
                <button
                    @click="activeTab = 'entries'"
                    :class="[
                        'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                        activeTab === 'entries'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    ]"
                >
                    📝 Time Entries
                </button>
                <button
                    @click="activeTab = 'absences'"
                    :class="[
                        'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                        activeTab === 'absences'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    ]"
                >
                    🏖️ Absences
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
            <div class="text-center py-12 text-gray-500 dark:text-gray-400">
                <svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                <h3 class="text-lg font-medium mb-2">Absences Coming Soon</h3>
                <p class="text-sm">This feature is currently under development.</p>
            </div>
        </div>

        <!-- Modals -->
        <TimeEntryModal
            v-model="showModal"
            :entry="editingEntry"
            :work-categories="timeEntriesStore.workCategories"
            @save="handleSave"
        />
    </main>

    <main v-else-if="currentView === 'admin'">
        <AdminSettings />
    </main>
  </div>
</template>
