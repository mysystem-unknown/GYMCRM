'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addMemberSchema, type AddMemberFormValues } from '@/lib/schemas';
import { fetchAPI } from '@/lib/api';
import { useGymStore } from '@/store/gym-store';
import type { GymPlan } from '@/types/gym';
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

interface PlanOption {
  label: string;
  months: number;
  days: number;
  price: number;
  planId: string;
}

export function AddMemberModal() {
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [customPlans, setCustomPlans] = useState<GymPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const setShowAddMemberModal = useGymStore((s) => s.setShowAddMemberModal);
  const activeGymId = useGymStore((s) => s.activeGymId);

  // Fetch custom plans
  useEffect(() => {
    if (!activeGymId) {
      setPlansLoading(false);
      return;
    }
    setPlansLoading(true);
    fetchAPI<{ plans: GymPlan[] }>(`/api/plans?gymId=${activeGymId}`)
      .then((res) => setCustomPlans(res.plans.filter((p) => p.isActive)))
      .catch(() => {})
      .finally(() => setPlansLoading(false));
  }, [activeGymId]);

  // Merge all database plans (defaults are auto-seeded by the API)
  const allPlanOptions = useMemo<PlanOption[]>(() => {
    return customPlans.map((p) => ({
      label: p.name,
      months: Math.round(p.durationDays / 30.44),
      days: p.durationDays,
      price: p.price,
      planId: p.id,
    }));
  }, [customPlans]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AddMemberFormValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: {
      name: '',
      phone: '',
      membershipPlan: allPlanOptions[0]?.label || '',
      paymentMode: 'UPI',
      amount: allPlanOptions[0]?.price || 0,
      joinDate: new Date(),
    },
  });

  const selectedPlan = allPlanOptions.find((p) => p.label === watch('membershipPlan'));
  const joinDate = watch('joinDate');
  const amount = watch('amount');

  const expiryDate = useMemo(() => {
    if (!joinDate || !selectedPlan) return null;
    const d = new Date(joinDate);
    d.setDate(d.getDate() + selectedPlan.days);
    return d;
  }, [joinDate, selectedPlan]);

  const onSubmit = async (data: AddMemberFormValues) => {
    if (!activeGymId) {
      toast.error('No gym selected. Please select a gym first.');
      return;
    }
    if (!selectedPlan) {
      toast.error('Please select a plan.');
      return;
    }
    setLoading(true);
    try {
      const durationMonths = selectedPlan.days > 0
        ? Math.round(selectedPlan.days / 30.44)
        : selectedPlan.months;

      await fetchAPI('/api/members', {
        method: 'POST',
        body: JSON.stringify({
          gymId: activeGymId,
          name: data.name.trim(),
          phoneNumber: data.phone.trim(),
          membershipPlan: data.membershipPlan,
          durationMonths,
          durationDays: selectedPlan.days,
          planPrice: selectedPlan.price,
          planId: selectedPlan.planId || undefined,
          paymentMode: data.paymentMode,
          amount: data.amount,
          joinDate: data.joinDate.toISOString(),
        }),
      });
      toast.success(`Member "${data.name}" added successfully!`);
      setOpen(false);
      setShowAddMemberModal(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChange = (val: string) => {
    setValue('membershipPlan', val);
    const p = allPlanOptions.find((o) => o.label === val);
    if (p) setValue('amount', p.price);
  };

  return (
    <Dialog open={open} onOpenChange={() => { setOpen(false); setShowAddMemberModal(false); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input {...register('name')} placeholder="Member name" />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input {...register('phone')} placeholder="Phone number" />
            {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Plan</Label>
              <Controller
                control={control}
                name="membershipPlan"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={handlePlanChange}>
                    <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                    <SelectContent>
                      {allPlanOptions
                        .map((p) => (
                          <SelectItem key={p.label} value={p.label}>
                            {p.label} - ₹{p.price}
                            <span className="text-muted-foreground ml-1 text-xs">({p.days}d)</span>
                          </SelectItem>
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
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.paymentMode && <p className="text-xs text-red-500">{errors.paymentMode.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input type="number" {...register('amount', { valueAsNumber: true })} />
              {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Join Date</Label>
              <Controller
                control={control}
                name="joinDate"
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, 'dd MMM yyyy') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(d) => d && field.onChange(d)}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.joinDate && <p className="text-xs text-red-500">{errors.joinDate.message}</p>}
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Expiry Date: <span className="font-medium text-foreground">{expiryDate ? format(expiryDate, 'dd MMM yyyy') : 'Select a date'}</span>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setOpen(false); setShowAddMemberModal(false); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
