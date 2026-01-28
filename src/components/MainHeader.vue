<script setup lang="ts">
import { useAuthStore } from '../stores/auth.store';
import { useSettingsStore } from '../stores/settings.store';
import { useTimeEntriesStore } from '../stores/time-entries.store';
import { formatHours } from '../utils/date';
import UserSettings from './UserSettings.vue';

const authStore = useAuthStore();
const settingsStore = useSettingsStore();
const timeEntriesStore = useTimeEntriesStore();

function setView(view: 'tracker' | 'admin') {
    settingsStore.currentView = view;
    settingsStore.saveUIState();
}
</script>

<template>
    <header class="mb-8 space-y-4">
      <div class="flex justify-between items-center">
          <div class="flex flex-col">
              <h1 class="text-2xl font-bold text-gray-900 dark:text-white">ChurchTools Time Tracker</h1>
              <!-- Quick Stats Bar -->
              <div v-if="timeEntriesStore.todayStats && settingsStore.currentView === 'tracker'" class="flex gap-4 mt-1">
                  <div class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                      <span class="w-2 h-2 rounded-full" :class="timeEntriesStore.todayStats.isOnTrack ? 'bg-green-500' : 'bg-blue-400'"></span>
                      <span class="font-medium text-gray-700 dark:text-gray-300">Today:</span>
                      {{ formatHours(timeEntriesStore.todayStats.actual * 3600000) }}
                  </div>
                  <div class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                      <span class="w-2 h-2 rounded-full" :class="timeEntriesStore.thisWeekStats.isOnTrack ? 'bg-green-500' : 'bg-purple-400'"></span>
                      <span class="font-medium text-gray-700 dark:text-gray-300">This Week:</span>
                      {{ formatHours(timeEntriesStore.thisWeekStats.actual * 3600000) }}
                  </div>
              </div>
          </div>
          
          <div class="flex items-center gap-4">
              <div v-if="authStore.isAdmin" class="flex bg-gray-100 dark:bg-gray-800 rounded p-1">
                  <button 
                    @click="setView('tracker')"
                    :class="['px-3 py-1 rounded text-sm font-medium transition-colors', settingsStore.currentView === 'tracker' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400']"
                  >
                      Tracker
                  </button>
                  <button 
                    @click="setView('admin')"
                    :class="['px-3 py-1 rounded text-sm font-medium transition-colors', settingsStore.currentView === 'admin' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400']"
                  >
                      Admin
                  </button>
              </div>
    
              <!-- User Settings Dropdown -->
              <div v-if="authStore.user">
                <UserSettings />
              </div>
          </div>
      </div>
    </header>
</template>
