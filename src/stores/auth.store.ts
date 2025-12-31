import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import { useSettingsStore } from './settings.store';
import type { UserPermissions } from '../types/time-tracker';

export const useAuthStore = defineStore('auth', () => {
    const user = ref<any>(null); // Type 'Person' from CT client if available
    const isManager = ref(false);
    const isAdmin = ref(false);
    const userList = ref<Array<{ id: number; name: string }>>([]);

    const settingsStore = useSettingsStore();

    const permissions = computed<UserPermissions>(() => {
        // Basic permission logic based on manager status
        return {
            canSeeAllEntries: false, // TODO: Implement HR check from legacy
            canSeeOwnEntries: true,
            managedEmployeeIds: [] // TODO: Implement managed employees logic
        };
    });

    function setUser(u: any) {
        user.value = u;
    }

    async function checkPermissions() {
        if (!user.value) return;

        const settings = settingsStore.settings;

        // Check Manager Role
        let _isManager = false;

        // check HR group
        if (settings.hrGroupId) {
            const isHR = await userIsInGroup(user.value.id, settings.hrGroupId);
            if (isHR) _isManager = true;
        }

        // check Manager Group
        if (!_isManager && settings.managerGroupId) {
            const isMgr = await userIsInGroup(user.value.id, settings.managerGroupId);
            if (isMgr) _isManager = true;
        }

        // Check assignments
        if (!_isManager && settings.managerAssignments) {
            const hasAssignments = settings.managerAssignments.some(a => a.managerId === user.value.id);
            if (hasAssignments) _isManager = true;
        }

        isManager.value = _isManager;
        isAdmin.value = _isManager; // Defaulting admin to manager for now as per legacy

        if (_isManager) {
            await loadUserList();
        }
    }

    async function userIsInGroup(userId: number, groupId: number): Promise<boolean> {
        try {
            const groupMembers = (await churchtoolsClient.get(`/groups/${groupId}/members`)) as any[];
            return groupMembers.some(
                (member: { personId?: number; id?: number }) =>
                    (member.personId || member.id) === userId
            );
        } catch (error) {
            console.error(`Failed to check group membership`, error);
            return false;
        }
    }

    async function loadUserList() {
        try {
            const response = await churchtoolsClient.get<Array<{ id: number; firstName?: string; lastName?: string }>>('/persons');
            userList.value = (response || [])
                .map((person) => ({
                    id: person.id,
                    name: `${person.firstName || ''} ${person.lastName || ''}`.trim() || `User ${person.id}`
                }))
                .filter((u) => u.id);
        } catch (error) {
            console.error('Failed to load user list', error);
        }
    }

    return {
        user,
        isManager,
        isAdmin,
        permissions,
        userList,
        setUser,
        checkPermissions
    };
});
