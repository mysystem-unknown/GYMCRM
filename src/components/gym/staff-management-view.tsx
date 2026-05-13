'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createStaffSchema, type CreateStaffFormValues } from '@/lib/schemas';
import { fetchAPI } from '@/lib/api';
import { useGymStore } from '@/store/gym-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, UserCog, Shield, Users, Loader2, Mail, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  gymId: string | null;
  canRenewMemberships: boolean;
  createdAt: string;
}

export function StaffManagementView() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const user = useGymStore((s) => s.user);
  const activeGymId = useGymStore((s) => s.activeGymId);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateStaffFormValues>({
    resolver: zodResolver(createStaffSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'staff',
      canRenewMemberships: false,
    },
  });

  const newRole = watch('role');
  const newCanRenew = watch('canRenewMemberships');

  useEffect(() => {
    loadUsers();
  }, [activeGymId]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeGymId) params.set('gymId', activeGymId);
      const result = await fetchAPI<{ users: StaffUser[] }>(`/api/users?${params}`);
      setUsers(result.users);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: CreateStaffFormValues) => {
    if (!activeGymId) {
      toast.error('No gym selected. Please select a gym first.');
      return;
    }
    setCreating(true);
    try {
      await fetchAPI('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          email: data.email.trim().toLowerCase(),
          name: data.name.trim(),
          password: data.password,
          role: data.role,
          gymId: activeGymId,
          canRenewMemberships: data.canRenewMemberships,
        }),
      });
      toast.success(`Staff "${data.email}" created successfully!`);
      setShowCreate(false);
      reset();
      loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create staff');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleRenewal = async (userId: string, currentVal: boolean) => {
    try {
      await fetchAPI('/api/users', {
        method: 'PATCH',
        body: JSON.stringify({ id: userId, canRenewMemberships: !currentVal }),
      });
      toast.success(`Renewal permission ${!currentVal ? 'enabled' : 'disabled'}`);
      loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update permission');
    }
  };

  const handleToggleActive = async (userId: string, currentVal: boolean) => {
    try {
      await fetchAPI('/api/users', {
        method: 'PATCH',
        body: JSON.stringify({ id: userId, isActive: !currentVal }),
      });
      toast.success(`User ${!currentVal ? 'activated' : 'deactivated'}`);
      loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`Delete user "${email}"? This cannot be undone.`)) return;
    try {
      await fetchAPI(`/api/users?id=${id}`, { method: 'DELETE' });
      toast.success(`User "${email}" deleted`);
      loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const handleResetPassword = async (userId: string, email: string) => {
    const newPwd = prompt(`Enter new password for ${email} (min 6 characters):`);
    if (!newPwd || newPwd.length < 6) {
      if (newPwd !== null) toast.error('Password must be at least 6 characters');
      return;
    }
    setResettingId(userId);
    try {
      const resetResult = await fetchAPI<{ token: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      if (resetResult.token) {
        await fetchAPI('/api/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify({ token: resetResult.token, newPassword: newPwd }),
        });
        toast.success(`Password reset for ${email}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setResettingId(null);
    }
  };

  const isSuperAdmin = user?.role === 'super_admin';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Staff Management</h1>
          <p className="text-sm text-muted-foreground">{users.length} user{users.length !== 1 ? 's' : ''} in this gym</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4" /> Create Staff
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : users.length === 0 ? (
        <Card className="p-12 text-center border-0 shadow-sm">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-medium">No Staff Members</h3>
          <p className="text-sm text-muted-foreground mt-1">Create your first staff account to get started.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <Card key={u.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      u.role === 'admin'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}>
                      {u.role === 'admin' ? <Shield className="w-5 h-5" /> : <UserCog className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{u.name || u.email}</h3>
                        <Badge variant="outline" className={`text-xs ${
                          u.role === 'admin'
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {u.role === 'admin' ? 'Owner' : 'Staff'}
                        </Badge>
                        {!u.isActive && (
                          <Badge variant="outline" className="text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Mail className="w-3 h-3" /> {u.email}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:gap-4">
                    {/* Renewal Permission Toggle */}
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`renew-${u.id}`} className="text-xs text-muted-foreground whitespace-nowrap">
                        Allow Renewals
                      </Label>
                      <Switch
                        id={`renew-${u.id}`}
                        checked={u.canRenewMemberships}
                        onCheckedChange={() => handleToggleRenewal(u.id, u.canRenewMemberships)}
                        disabled={u.role === 'admin'}
                      />
                    </div>

                    {/* Active Toggle */}
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`active-${u.id}`} className="text-xs text-muted-foreground">
                        Active
                      </Label>
                      <Switch
                        id={`active-${u.id}`}
                        checked={u.isActive}
                        onCheckedChange={() => handleToggleActive(u.id, u.isActive)}
                      />
                    </div>

                    {/* Reset Password */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleResetPassword(u.id, u.email)}
                      disabled={resettingId === u.id}
                      title="Reset Password"
                    >
                      <KeyRound className="w-4 h-4" />
                    </Button>

                    {/* Delete */}
                    {isSuperAdmin && u.role !== 'admin' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700"
                        onClick={() => handleDelete(u.id, u.email)}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Staff Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Staff Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleCreate)} className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input {...register('name')} placeholder="Staff name" />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" {...register('email')} placeholder="staff@email.com" />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Password *</Label>
              <Input type="password" {...register('password')} placeholder="Min 6 characters" />
              {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
            </div>
            {isSuperAdmin && (
              <div className="space-y-2">
                <Label>Role</Label>
                <div className="flex gap-2">
                  <Button type="button" variant={newRole === 'staff' ? 'default' : 'outline'} size="sm" onClick={() => setValue('role', 'staff')} className={newRole === 'staff' ? 'bg-emerald-600' : ''}>
                    Staff
                  </Button>
                  <Button type="button" variant={newRole === 'admin' ? 'default' : 'outline'} size="sm" onClick={() => setValue('role', 'admin')} className={newRole === 'admin' ? 'bg-emerald-600' : ''}>
                    Gym Owner
                  </Button>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <Label htmlFor="new-can-renew" className="text-sm font-medium">Allow Membership Renewal</Label>
                <p className="text-xs text-muted-foreground">Staff can renew member plans</p>
              </div>
              <Controller
                control={control}
                name="canRenewMemberships"
                render={({ field }) => (
                  <Switch id="new-can-renew" checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={creating} className="bg-emerald-600 hover:bg-emerald-700">
                {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
