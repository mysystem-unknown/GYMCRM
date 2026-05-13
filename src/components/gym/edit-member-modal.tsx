'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { editMemberSchema, type EditMemberFormValues } from '@/lib/schemas';
import { fetchAPI } from '@/lib/api';
import { useGymStore } from '@/store/gym-store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export function EditMemberModal() {
  const selectedMember = useGymStore((s) => s.selectedMember);
  const setShowEditMemberModal = useGymStore((s) => s.setShowEditMemberModal);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<EditMemberFormValues>({
    resolver: zodResolver(editMemberSchema),
    defaultValues: {
      name: selectedMember?.name || '',
      phone: selectedMember?.phoneNumber || '',
      status: selectedMember?.status || 'Active',
      notes: selectedMember?.notes || '',
    },
  });

  if (!selectedMember) return null;

  const onSubmit = async (data: EditMemberFormValues) => {
    setLoading(true);
    try {
      await fetchAPI('/api/members', {
        method: 'PUT',
        body: JSON.stringify({
          id: selectedMember.id,
          name: data.name.trim(),
          phoneNumber: data.phone.trim(),
          status: data.status,
          notes: data.notes || '',
        }),
      });
      toast.success('Member updated successfully');
      setShowEditMemberModal(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update member');
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input {...register('name')} />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input {...register('phone')} />
            {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Expiring Soon">Expiring Soon</SelectItem>
                    <SelectItem value="Expired">Expired</SelectItem>
                    <SelectItem value="Refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.status && <p className="text-xs text-red-500">{errors.status.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Input {...register('notes')} placeholder="Any notes..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowEditMemberModal(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
