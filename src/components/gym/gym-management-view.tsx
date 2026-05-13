'use client';

import { useState, useEffect } from 'react';
import { fetchAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Users, Building2, Loader2, Building, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { formatCurrency } from '@/lib/api';

interface GymData {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  plan: string;
  isActive: boolean;
  createdAt: string;
  owner?: { id: string; email: string; name: string | null; role: string };
  _count: { members: number; transactions: number; expenses: number };
}

export function GymManagementView() {
  const [gyms, setGyms] = useState<GymData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Create form
  const [gymName, setGymName] = useState('');
  const [gymAddress, setGymAddress] = useState('');
  const [gymPhone, setGymPhone] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');

  useEffect(() => {
    loadGyms();
  }, []);

  const loadGyms = async () => {
    setLoading(true);
    try {
      const result = await fetchAPI<{ gyms: GymData[] }>('/api/gyms');
      setGyms(result.gyms);
    } catch (err) {
      toast.error('Failed to load gyms');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gymName.trim() || !ownerEmail.trim() || !ownerPassword.trim()) {
      toast.error('Gym name, owner email, and password are required');
      return;
    }
    setCreating(true);
    try {
      await fetchAPI('/api/gyms', {
        method: 'POST',
        body: JSON.stringify({
          name: gymName.trim(),
          address: gymAddress.trim(),
          phone: gymPhone.trim(),
          ownerName: ownerName.trim(),
          ownerEmail: ownerEmail.trim().toLowerCase(),
          ownerPassword,
        }),
      });
      toast.success(`Gym "${gymName}" created successfully!`);
      setShowCreate(false);
      setGymName('');
      setGymAddress('');
      setGymPhone('');
      setOwnerName('');
      setOwnerEmail('');
      setOwnerPassword('');
      loadGyms();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create gym');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete gym "${name}"? This will remove ALL data including members, transactions, and expenses. This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await fetchAPI(`/api/gyms?id=${id}`, { method: 'DELETE' });
      toast.success(`Gym "${name}" deleted`);
      loadGyms();
    } catch {
      toast.error('Failed to delete gym');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gym Management</h1>
          <p className="text-sm text-muted-foreground">{gyms.length} gym{gyms.length !== 1 ? 's' : ''} registered</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4" /> Create New Gym
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : gyms.length === 0 ? (
        <Card className="p-12 text-center border-0 shadow-sm">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-medium">No Gyms Yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Create your first gym to get started.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {gyms.map((gym) => (
            <Card key={gym.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Building className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{gym.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(gym.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <Badge variant={gym.isActive ? 'default' : 'secondary'} className={gym.isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' : ''}>
                    {gym.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {gym.address && <p className="text-sm text-muted-foreground mb-2">{gym.address}</p>}
                {gym.phone && <p className="text-sm text-muted-foreground">{gym.phone}</p>}
                <div className="mt-3 pt-3 border-t space-y-1.5">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Owner:</span>
                    <span className="font-medium">{gym.owner?.name || gym.owner?.email || 'Unassigned'}</span>
                  </div>
                  {gym.owner?.email && (
                    <p className="text-xs text-muted-foreground ml-5.5">{gym.owner.email}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {gym._count.members} members</span>
                  <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {gym._count.transactions} transactions</span>
                  <span className="flex items-center gap-1"><Receipt className="w-3 h-3" /> {gym._count.expenses} expenses</span>
                </div>
                <div className="mt-3 pt-3 border-t flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={() => handleDelete(gym.id, gym.name)}
                    disabled={deleting === gym.id}
                  >
                    {deleting === gym.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-1" />}
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Gym Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Gym</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Gym Name *</Label>
                <Input value={gymName} onChange={(e) => setGymName(e.target.value)} placeholder="e.g., FitZone Gym" required />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={gymPhone} onChange={(e) => setGymPhone(e.target.value)} placeholder="Gym phone number" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={gymAddress} onChange={(e) => setGymAddress(e.target.value)} placeholder="Gym address" />
            </div>
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Gym Owner Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Owner Name</Label>
                  <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Owner name" />
                </div>
                <div className="space-y-2">
                  <Label>Owner Email *</Label>
                  <Input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="owner@email.com" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Owner Password *</Label>
                <Input type="password" value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} placeholder="Min 6 characters" required minLength={6} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={creating} className="bg-emerald-600 hover:bg-emerald-700">
                {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Create Gym
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
