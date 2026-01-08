<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useSettingsStore } from '../stores/settings.store';
import { useAuthStore } from '../stores/auth.store';

const settingsStore = useSettingsStore();
const authStore = useAuthStore();
const isOpen = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

function toggleMenu() {
    isOpen.value = !isOpen.value;
}

function closeMenu(e: MouseEvent) {
    if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
        isOpen.value = false;
    }
}

onMounted(() => {
    document.addEventListener('click', closeMenu);
});

onUnmounted(() => {
    document.removeEventListener('click', closeMenu);
});

function handleThemeChange(theme: 'light' | 'dark' | 'system') {
    settingsStore.setTheme(theme);
}
</script>

<template>
    <div class="relative" ref="dropdownRef">
        <!-- Trigger -->
        <button 
            @click.stop="toggleMenu"
            class="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg py-1 px-2 transition-colors"
        >
            <div class="text-xs text-right hidden sm:block">
               <div class="font-medium text-gray-900 dark:text-white">{{ authStore.user?.firstName }} {{ authStore.user?.lastName }}</div>
               <div v-if="authStore.isAdmin" class="text-blue-600 dark:text-blue-400 font-bold">Admin</div>
               <div v-else-if="authStore.isManager" class="text-green-600 dark:text-green-400 font-bold">Manager</div>
            </div>
            
            <div class="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-700">
                {{ authStore.user?.firstName?.charAt(0) }}{{ authStore.user?.lastName?.charAt(0) }}
            </div>
        </button>

        <!-- Dropdown -->
        <div 
            v-if="isOpen"
            class="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 py-2 z-50 transform origin-top-right transition-all"
        >
            <div class="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                <p class="text-sm font-medium text-gray-900 dark:text-white">User Settings</p>
            </div>

            <div class="px-4 py-3">
                <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Theme</p>
                
                <div class="grid grid-cols-3 gap-2">
                    <button 
                        @click="handleThemeChange('light')"
                        :class="[
                            'flex flex-col items-center justify-center p-2 rounded-md border text-xs font-medium transition-colors',
                            settingsStore.theme === 'light' 
                                ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-500 dark:text-blue-300' 
                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600'
                        ]"
                    >
                        <svg class="w-5 h-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        Light
                    </button>

                    <button 
                        @click="handleThemeChange('dark')"
                        :class="[
                            'flex flex-col items-center justify-center p-2 rounded-md border text-xs font-medium transition-colors',
                            settingsStore.theme === 'dark' 
                                ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-500 dark:text-blue-300' 
                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600'
                        ]"
                    >
                        <svg class="w-5 h-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                        Dark
                    </button>

                    <button 
                        @click="handleThemeChange('system')"
                        :class="[
                            'flex flex-col items-center justify-center p-2 rounded-md border text-xs font-medium transition-colors',
                            settingsStore.theme === 'system' 
                                ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-500 dark:text-blue-300' 
                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600'
                        ]"
                    >
                        <svg class="w-5 h-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        System
                    </button>
                </div>
            </div>
            
            <div class="bg-gray-50 dark:bg-gray-700/50 px-4 py-2 mt-2 rounded-b-lg">
                <p class="text-[10px] text-gray-400 text-center">Version 0.0.1</p>
            </div>
        </div>
    </div>
</template>
