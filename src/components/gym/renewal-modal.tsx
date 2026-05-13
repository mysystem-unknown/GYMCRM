'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { renewalSchema, type RenewalFormValues } from '@/lib/schemas';
import { useGymStore } from '@/store/gym-store';
import { fetchAPI } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const planOptions = [
  { label: '1 Month', months: 1, price: 1500 },
  { label: '3 Months', months: 3, price: 3500 },
  { label: '6 Months', months: 6, price: 4500 },
  { label: '1 Year', months: 12, price: 8000 },
];

export function RenewalModal() {
  const selectedMember = useGymStore((s) => s.selectedMember);
  const setShowRenewalModal = useGymStore((s) => s.setShowRenewalModal);
  const activeGymId = useGymStore((s) => s.activeGymId);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RenewalFormValues>({
    resolver: zodResolver(renewalSchema),
    defaultValues: {
      membershipPlan: '1 Month',
      paymentMode: 'UPI',
      amount: 1500,
      renewalDate: undefined,
    },
  });

  const plan = watch('membershipPlan');
  const amount = watch('amount');
  const renewalDate = watch('renewalDate');

  if (!selectedMember) return null;

  const selectedPlan = planOptions.find((p) => p.label === plan);
  const currentExpiry = new Date(selectedMember.expiryDate);
  const now = new Date();
  const baseDate = currentExpiry > now ? currentExpiry : (renewalDate || now);
  const newExpiry = new Date(baseDate);
  newExpiry.setMonth(newExpiry.getMonth() + (selectedPlan?.months || 1));

  const onSubmit = async (data: RenewalFormValues) => {
    if (!activeGymId) {
      toast.error('No gym selected. Please select a gym first.');
      return;
    }
    setLoading(true);
    try {
      await fetchAPI('/api/transactions', {
        method: 'POST',
        body: JSON.stringify({
          gymId: activeGymId,
          memberId: selectedMember.id,
          paymentMode: data.paymentMode,
          amount: data.amount,
          plan: data.membershipPlan,
          duration: selectedPlan?.months || 1,
          paymentDate: (data.renewalDate || new Date()).toISOString(),
        }),
      });
      toast.success(`${selectedMember.name}'s membership renewed until ${format(newExpiry, 'dd MMM yyyy')}!`);
      setShowRenewalModal(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Renewal failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChange = (val: string) => {
    setValue('membershipPlan', val);
    const p = planOptions.find((o) => o.label === val);
    if (p) setValue('amount', p.price);
  };

  return (
    <Dialog open onOpenChange={() => setShowRenewalModal(false)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Renew Membership</DialogTitle>
        </DialogHeader>

        {/* Member Info */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Member</span>
            <span className="font-medium">{selectedMember.name} ({selectedMember.memberId})</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Current Plan</span>
            <span className="font-medium">{selectedMember.membershipPlan}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Current Expiry</span>
            <span className="font-medium">{format(new Date(selectedMember.expiryDate), 'dd MMM yyyy')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Paid</span>
            <span className="font-medium">₹{selectedMember.totalPayment.toLocaleString()}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>New Plan</Label>
              <Controller
                control={control}
                name="membershipPlan"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={handlePlanChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {planOptions.map((p) => (
                        <SelectItem key={p.label} value={p.label}>{p.label} - ₹{p.price}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.membershipPlan && <p className="text-xs text-red-500">{errors.membershipPlan.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Payment Mode</Label>
              <Controller
                control={control}
                name="paymentMode"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">💵 Cash</SelectItem>
                      <SelectItem value="UPI">📱 UPI</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.paymentMode && <p className="text-xs text-red-500">{errors.paymentMode.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input type="number" {...register('amount', { valueAsNumber: true })} />
              {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Renewal Date</Label>
              <Controller
                control={control}
                name="renewalDate"
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, 'dd MMM yyyy') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={field.value} onSelect={(d) => d && field.onChange(d)} />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.renewalDate && <p className="text-xs text-red-500">{errors.renewalDate.message}</p>}
            </div>
          </div>

          {/* New Expiry Preview */}
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
            <p className="text-sm text-emerald-800 dark:text-emerald-300">
              New expiry date: <span className="font-bold">{format(newExpiry, 'dd MMM yyyy')}</span>
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowRenewalModal(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Renew Membership
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
