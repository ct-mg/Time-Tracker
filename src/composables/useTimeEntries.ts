import { computed } from 'vue';
import { useTimeEntriesStore } from '../stores/time-entries.store';

export function useTimeEntries() {
    const timeEntriesStore = useTimeEntriesStore();

    return {
        // Delegate all work to store
        groupedEntries: computed(() => timeEntriesStore.groupedEntries),
        searchTerm: computed({
            get: () => timeEntriesStore.searchTerm,
            set: (v) => timeEntriesStore.searchTerm = v
        }),
        groupingMode: computed({
            get: () => timeEntriesStore.groupingMode,
            set: (v) => timeEntriesStore.groupingMode = v
        }),
    };
}
