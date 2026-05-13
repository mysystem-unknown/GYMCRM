import { create } from 'zustand';
import type { Member } from '@/types/gym';

interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  gymId: string | null;
  gymName: string | null;
  gymSlug: string | null;
  canRenewMemberships: boolean;
}

interface GymStore {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  activeGymId: string | null;
  setActiveGymId: (gymId: string | null) => void;

  activeView: 'dashboard' | 'members' | 'expenses' | 'search' | 'settings' | 'how-to-use' | 'gym-management' | 'staff-management';
  setActiveView: (view: GymStore['activeView']) => void;

  selectedMember: Member | null;
  setSelectedMember: (member: Member | null) => void;
  showRenewalModal: boolean;
  setShowRenewalModal: (show: boolean) => void;
  showAddMemberModal: boolean;
  setShowAddMemberModal: (show: boolean) => void;
  showEditMemberModal: boolean;
  setShowEditMemberModal: (show: boolean) => void;
  showHowToUse: boolean;
  setShowHowToUse: (show: boolean) => void;
}

export const useGymStore = create<GymStore>((set, get) => ({
  user: null,
  setUser: (user) => set({
    user,
    activeGymId: user?.gymId || get().activeGymId,
  }),
  isLoading: true,
  setIsLoading: (loading) => set({ isLoading: loading }),
  activeGymId: null,
  setActiveGymId: (gymId) => set({ activeGymId: gymId }),

  activeView: 'dashboard',
  setActiveView: (view) => set({ activeView: view, selectedMember: null }),

  selectedMember: null,
  setSelectedMember: (member) => set({ selectedMember: member }),
  showRenewalModal: false,
  setShowRenewalModal: (show) => set({ showRenewalModal: show }),
  showAddMemberModal: false,
  setShowAddMemberModal: (show) => set({ showAddMemberModal: show }),
  showEditMemberModal: false,
  setShowEditMemberModal: (show) => set({ showEditMemberModal: show }),
  showHowToUse: false,
  setShowHowToUse: (show) => set({ showHowToUse: show }),
}));
