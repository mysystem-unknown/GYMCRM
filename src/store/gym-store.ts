import { create } from 'zustand';
import type { Member, AuthUser } from '@/types/gym';

interface GymStore {
  // Auth
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  activeGymId: string | null;
  setActiveGymId: (gymId: string | null) => void;

  // Navigation
  activeView: 'dashboard' | 'members' | 'expenses' | 'search' | 'settings' | 'how-to-use' | 'gym-management';
  setActiveView: (view: GymStore['activeView']) => void;

  // Member state
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
  // Auth
  user: null,
  setUser: (user) => set({
    user,
    activeGymId: user?.gymId || get().activeGymId,
  }),
  isLoading: true,
  setIsLoading: (loading) => set({ isLoading: loading }),
  activeGymId: null,
  setActiveGymId: (gymId) => set({ activeGymId: gymId }),

  // Navigation
  activeView: 'dashboard',
  setActiveView: (view) => set({ activeView: view, selectedMember: null }),

  // Member state
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
