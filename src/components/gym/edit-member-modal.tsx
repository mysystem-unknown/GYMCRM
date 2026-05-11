'use client';

import { useState } from 'react';
import { fetchAPI } from '@/lib/api';
import { useGymStore } from '@/store/gym-store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export function EditMemberModal() {
  const selectedMember = useGymStore((s) => s.selectedMember);
  const setShowEditMemberModal = useGymStore((s) => s.setShowEditMemberModal);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState(selectedMember?.name || '');
  const [phone, setPhone] = useState(selectedMember?.phoneNumber || '');
  const [status, setStatus] = useState(selectedMember?.status || 'Active');
  const [notes, setNotes] = useState(selectedMember?.notes || '');

  if (!selectedMember) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetchAPI('/api/members', {
        method: 'PUT',
        body: JSON.stringify({
          id: selectedMember.id,
          name,
          phoneNumber: phone,
          status,
          notes,
        }),
      });
      toast.success('Member updated successfully');
      setShowEditMemberModal(false);
    } catch {
      toast.error('Failed to update member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => setShowEditMemberModal(false)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Member - {selectedMember.memberId}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Expiring Soon">Expiring Soon</SelectItem>
                <SelectItem value="Expired">Expired</SelectItem>
                <SelectItem value="Refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowEditMemberModal(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
