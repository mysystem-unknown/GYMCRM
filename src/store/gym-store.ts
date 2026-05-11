import { create } from 'zustand';
import type { Member } from '@/types/gym';

interface GymStore {
  activeView: 'dashboard' | 'members' | 'expenses' | 'search' | 'settings';
  setActiveView: (view: GymStore['activeView']) => void;
  selectedMember: Member | null;
  setSelectedMember: (member: Member | null) => void;
  showRenewalModal: boolean;
  setShowRenewalModal: (show: boolean) => void;
  showAddMemberModal: boolean;
  setShowAddMemberModal: (show: boolean) => void;
  showEditMemberModal: boolean;
  setShowEditMemberModal: (show: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const useGymStore = create<GymStore>((set) => ({
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
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
