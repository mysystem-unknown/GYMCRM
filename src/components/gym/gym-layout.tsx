'use client';

import { useGymStore } from '@/store/gym-store';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard,
  Users,
  Receipt,
  Search,
  Settings,
  Dumbbell,
  Menu,
  Sun,
  Moon,
  Plus,
} from 'lucide-react';
import { DashboardView } from './dashboard-view';
import { MembersView } from './members-view';
import { ExpensesView } from './expenses-view';
import { SearchView } from './search-view';
import { SettingsView } from './settings-view';
import { MemberProfile } from './member-profile';
import { RenewalModal } from './renewal-modal';
import { AddMemberModal } from './add-member-modal';
import { EditMemberModal } from './edit-member-modal';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'members' as const, label: 'Members', icon: Users },
  { id: 'expenses' as const, label: 'Expenses', icon: Receipt },
  { id: 'search' as const, label: 'Search', icon: Search },
  { id: 'settings' as const, label: 'Settings', icon: Settings },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const activeView = useGymStore((s) => s.activeView);
  const setActiveView = useGymStore((s) => s.setActiveView);
  const setShowAddMemberModal = useGymStore((s) => s.setShowAddMemberModal);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 py-5">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-600 text-white">
          <Dumbbell className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight">GymCRM</h1>
          <p className="text-xs text-muted-foreground">Management System</p>
        </div>
      </div>
      <Separator />
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <Button
                key={item.id}
                variant={isActive ? 'secondary' : 'ghost'}
                className={`w-full justify-start gap-3 h-10 px-3 font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600/15'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => {
                  setActiveView(item.id);
                  onNavigate?.();
                }}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Button>
            );
          })}
        </nav>
      </ScrollArea>
      <div className="p-4">
        <Button
          className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={() => {
            setActiveView('members');
            setShowAddMemberModal(true);
            onNavigate?.();
          }}
        >
          <Plus className="w-4 h-4" />
          Add Member
        </Button>
      </div>
    </div>
  );
}

export function GymLayout() {
  const { theme, setTheme } = useTheme();
  const activeView = useGymStore((s) => s.activeView);
  const selectedMember = useGymStore((s) => s.selectedMember);
  const showRenewalModal = useGymStore((s) => s.showRenewalModal);
  const showAddMemberModal = useGymStore((s) => s.showAddMemberModal);
  const showEditMemberModal = useGymStore((s) => s.showEditMemberModal);

  const renderView = () => {
    if (selectedMember && activeView === 'members') {
      return <MemberProfile />;
    }
    switch (activeView) {
      case 'dashboard': return <DashboardView />;
      case 'members': return <MembersView />;
      case 'expenses': return <ExpensesView />;
      case 'search': return <SearchView />;
      case 'settings': return <SettingsView />;
      default: return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r bg-card">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="flex items-center justify-between h-14 px-4 lg:px-6 border-b bg-card shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SidebarContent />
              </SheetContent>
            </Sheet>
            <h2 className="text-sm font-semibold capitalize">{activeView}</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="h-9 w-9"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedMember ? 'profile' : activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="p-4 lg:p-6"
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Modals */}
      {showRenewalModal && <RenewalModal />}
      {showAddMemberModal && <AddMemberModal />}
      {showEditMemberModal && <EditMemberModal />}
    </div>
  );
}
