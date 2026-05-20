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
import { Loader2, AlertCircle } from 'lucide-react';

export function EditMemberModal() {
  const selectedMember = useGymStore((s) => s.selectedMember);
  const setShowEditMemberModal = useGymStore((s) => s.setShowEditMemberModal);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<EditMemberFormValues>({
    resolver: zodResolver(editMemberSchema),
    defaultValues: {
      name: selectedMember?.name || '',
      phone: selectedMember?.phoneNumber || '',
      status: selectedMember?.status || 'Active',
      notes: selectedMember?.notes || '',
      refundAmount: selectedMember?.refundAmount || 0,
    },
  });

  if (!selectedMember) return null;

  const watchedStatus = watch('status');
  const showRefundInput = watchedStatus === 'Refunded';

  const onSubmit = async (data: EditMemberFormValues) => {
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        id: selectedMember.id,
        name: data.name.trim(),
        phoneNumber: data.phone.trim(),
        status: data.status,
        notes: data.notes || '',
      };

      // When refunding, require a refund amount and adjust pending payment
      if (data.status === 'Refunded') {
        const refundAmt = data.refundAmount || 0;
        body.refundAmount = refundAmt;
        // Reduce pending payment by the refund amount, but don't go below 0
        const newPending = Math.max(0, (selectedMember.pendingPayment || 0) - refundAmt);
        body.pendingPayment = newPending;
      }

      await fetchAPI('/api/members', {
        method: 'PUT',
        body: JSON.stringify(body),
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

          {/* Show refund amount input when status is Refunded */}
          {showRefundInput && (
            <div className="space-y-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <Label className="text-amber-800 dark:text-amber-300 text-sm font-medium">
                  Refund Amount (₹)
                </Label>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">
                Enter the amount being refunded to this member. Pending payment will be adjusted automatically.
                {selectedMember.pendingPayment > 0 && (
                  <span className="block mt-1">Current pending: ₹{selectedMember.pendingPayment.toLocaleString()}</span>
                )}
              </p>
              <Input
                type="number"
                min={0}
                step={1}
                {...register('refundAmount', { valueAsNumber: true })}
                placeholder="Enter refund amount"
                className="bg-white dark:bg-card"
              />
              {errors.refundAmount && <p className="text-xs text-red-500">{errors.refundAmount.message}</p>}
            </div>
          )}

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
