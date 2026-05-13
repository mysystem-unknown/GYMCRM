'use client';

import { useGymStore } from '@/store/gym-store';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  LogOut,
  Building2,
  BookOpen,
  Download,
  Shield,
  UserCog,
} from 'lucide-react';
import { DashboardView } from './dashboard-view';
import { MembersView } from './members-view';
import { ExpensesView } from './expenses-view';
import { SearchView } from './search-view';
import { SettingsView } from './settings-view';
import { HowToUseView } from './how-to-use-view';
import { GymManagementView } from './gym-management-view';
import { StaffManagementView } from './staff-management-view';
import { MemberProfile } from './member-profile';
import { RenewalModal } from './renewal-modal';
import { AddMemberModal } from './add-member-modal';
import { EditMemberModal } from './edit-member-modal';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface UserData {
  id: string;
  email: string;
  name: string | null;
  role: string;
  gymId: string | null;
  gymName: string | null;
  gymSlug: string | null;
  canRenewMemberships: boolean;
}

interface UserProps {
  user: UserData;
}

type ViewId = 'dashboard' | 'members' | 'expenses' | 'search' | 'settings' | 'how-to-use' | 'gym-management' | 'staff-management';

const allNavItems: { id: ViewId; label: string; icon: React.ElementType; roles: string[] }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin', 'admin', 'staff'] },
  { id: 'members', label: 'Members', icon: Users, roles: ['super_admin', 'admin', 'staff'] },
  { id: 'expenses', label: 'Expenses', icon: Receipt, roles: ['super_admin', 'admin', 'staff'] },
  { id: 'search', label: 'Search', icon: Search, roles: ['super_admin', 'admin', 'staff'] },
  { id: 'settings', label: 'Settings', icon: Settings, roles: ['super_admin', 'admin'] },
  { id: 'gym-management', label: 'Gyms', icon: Building2, roles: ['super_admin'] },
  { id: 'staff-management', label: 'Staff', icon: UserCog, roles: ['super_admin', 'admin'] },
];

function getNavItems(role: string) {
  return allNavItems.filter(item => item.roles.includes(role));
}

function SidebarContent({ user, onExport, onSignOut, onHowToUse, onNavigate }: {
  user: UserData;
  onExport: () => void;
  onSignOut: () => void;
  onHowToUse: () => void;
  onNavigate?: () => void;
}) {
  const activeView = useGymStore((s) => s.activeView);
  const setActiveView = useGymStore((s) => s.setActiveView);
  const setShowAddMemberModal = useGymStore((s) => s.setShowAddMemberModal);
  const navItems = getNavItems(user.role);
  const isAdmin = user.role === 'admin' || user.role === 'super_admin';

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
                onClick={() => { setActiveView(item.id); onNavigate?.(); }}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Button>
            );
          })}
        </nav>
      </ScrollArea>
      <Separator />
      <div className="p-3 space-y-2">
        {isAdmin && (
          <>
            <Button className="w-full justify-start gap-2 h-9 text-sm" variant="ghost" onClick={() => { onExport(); onNavigate?.(); }}>
              <Download className="w-4 h-4" /> Export Excel
            </Button>
            <Button className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { setActiveView('members'); setShowAddMemberModal(true); onNavigate?.(); }}>
              <Plus className="w-4 h-4" /> Add Member
            </Button>
          </>
        )}
      </div>
      <Separator />
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-emerald-600 text-white text-xs">{user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="flex-1 justify-start gap-1.5 text-xs h-8" onClick={onHowToUse}>
            <BookOpen className="w-3 h-3" /> Help
          </Button>
          <Button variant="ghost" size="sm" className="flex-1 justify-start gap-1.5 text-xs h-8 text-red-500 hover:text-red-700" onClick={onSignOut}>
            <LogOut className="w-3 h-3" /> Logout
          </Button>
        </div>
      </div>
    </div>
  );
}

export function GymLayout({ user }: UserProps) {
  const { theme, setTheme } = useTheme();
  const activeView = useGymStore((s) => s.activeView);
  const selectedMember = useGymStore((s) => s.selectedMember);
  const showRenewalModal = useGymStore((s) => s.showRenewalModal);
  const showAddMemberModal = useGymStore((s) => s.showAddMemberModal);
  const showEditMemberModal = useGymStore((s) => s.showEditMemberModal);
  const setShowHowToUse = useGymStore((s) => s.setShowHowToUse);

  const isSuperAdmin = user.role === 'super_admin';
  const isAdmin = user.role === 'admin' || isSuperAdmin;
  const userInitial = user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U';

  const handleExport = async () => {
    try {
      toast.loading('Exporting Excel...');
      const params = new URLSearchParams();
      if (user.gymId) params.set('gymId', user.gymId);
      params.set('format', 'xlsx');
      const res = await fetch(`/api/export?${params}`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'gymcrm-backup.xlsx';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Excel backup downloaded!');
    } catch {
      toast.error('Export failed');
    }
  };

  const handleSignOut = async () => {
    await fetch('/api/auth/signout', { method: 'POST' });
    window.location.href = '/';
  };

  const renderView = () => {
    if (selectedMember && activeView === 'members') return <MemberProfile />;
    if (useGymStore.getState().showHowToUse) return <HowToUseView onBack={() => setShowHowToUse(false)} />;
    switch (activeView) {
      case 'dashboard': return <DashboardView />;
      case 'members': return <MembersView />;
      case 'expenses': return <ExpensesView />;
      case 'search': return <SearchView />;
      case 'settings': return isAdmin ? <SettingsView /> : <div className="text-muted-foreground p-8">Access denied</div>;
      case 'gym-management': return isSuperAdmin ? <GymManagementView /> : <div className="text-muted-foreground p-8">Access denied</div>;
      case 'staff-management': return isAdmin ? <StaffManagementView /> : <div className="text-muted-foreground p-8">Access denied</div>;
      default: return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r bg-card">
        <SidebarContent
          user={user}
          onExport={handleExport}
          onSignOut={handleSignOut}
          onHowToUse={() => setShowHowToUse(true)}
        />
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between h-14 px-4 lg:px-6 border-b bg-card shrink-0">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SidebarContent
                  user={user}
                  onExport={handleExport}
                  onSignOut={handleSignOut}
                  onHowToUse={() => setShowHowToUse(true)}
                  onNavigate={() => {}}
                />
              </SheetContent>
            </Sheet>
            <h2 className="text-sm font-semibold capitalize">{activeView.replace('-', ' ')}</h2>
            {isSuperAdmin && (
              <Badge variant="outline" className="text-xs gap-1">
                <Shield className="w-3 h-3" /> Super Admin
              </Badge>
            )}
            {user.role === 'admin' && (
              <Badge variant="outline" className="text-xs gap-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                Gym Owner
              </Badge>
            )}
            {user.role === 'staff' && (
              <Badge variant="outline" className="text-xs gap-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                Staff
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-emerald-600 text-white text-xs">{userInitial}</AvatarFallback>
            </Avatar>
          </div>
        </header>
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
      {showRenewalModal && <RenewalModal />}
      {showAddMemberModal && <AddMemberModal />}
      {showEditMemberModal && <EditMemberModal />}
    </div>
  );
}
