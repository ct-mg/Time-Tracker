import { ref, computed, onUnmounted, watch } from 'vue';
import { useTimeEntriesStore } from '../stores/time-entries.store';

export function useTracking() {
    const store = useTimeEntriesStore();
    const elapsedTime = ref(0);
    const intervalId = ref<NodeJS.Timeout | null>(null);

    const isTracking = computed(() => !!store.activeEntry);

    function updateTimer() {
        if (store.activeEntry) {
            const start = new Date(store.activeEntry.startTime).getTime();
            const now = new Date().getTime();
            elapsedTime.value = now - start;
        } else {
            elapsedTime.value = 0;
        }
    }

    function startTicker() {
        if (intervalId.value) return;
        updateTimer();
        intervalId.value = setInterval(updateTimer, 1000);
    }

    function stopTicker() {
        if (intervalId.value) {
            clearInterval(intervalId.value);
            intervalId.value = null;
        }
        elapsedTime.value = 0;
    }

    // Watch for active entry changes to start/stop ticker automatically
    watch(
        () => store.activeEntry,
        (newEntry) => {
            if (newEntry) {
                startTicker();
            } else {
                stopTicker();
            }
        },
        { immediate: true }
    );

    onUnmounted(() => {
        stopTicker();
    });

    return {
        elapsedTime,
        isTracking
    };
}
