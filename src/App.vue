<script setup lang="ts">
import { ref } from 'vue'; // ref needed
import { useAuthStore } from './stores/auth.store';
import { useTimeEntriesStore } from './stores/time-entries.store';
import { useSettingsStore } from './stores/settings.store';
import TrackerControls from './components/TrackerControls.vue';
import TimeEntriesList from './components/TimeEntriesList.vue';
import TimeEntryModal from './components/TimeEntryModal.vue';
import AdminSettings from './components/AdminSettings.vue';
import { watch } from 'vue';
import type { TimeEntry } from './types/time-tracker';

const authStore = useAuthStore();
const settingsStore = useSettingsStore();
const timeEntriesStore = useTimeEntriesStore();

const showModal = ref(false);
const editingEntry = ref<TimeEntry | null>(null);
const currentView = ref<'tracker' | 'admin'>('tracker');

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
        <TrackerControls />
        
        <div class="mt-8">
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
            <div v-else-if="timeEntriesStore.entries.length === 0" class="text-center p-8 text-gray-500 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                No entries found. Start tracking time to see them here.
            </div>
            <TimeEntriesList 
                v-else 
                @edit="handleEdit" 
            />
        </div>

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
