'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { fetchAPI } from '@/lib/api';
import { useGymStore } from '@/store/gym-store';
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

const addMemberSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(10, 'Phone must be at least 10 characters'),
  membershipPlan: z.string().min(1, 'Plan is required'),
  paymentMode: z.string().min(1, 'Payment mode is required'),
  amount: z.coerce.number().min(0, 'Amount must be non-negative'),
  joinDate: z.date({ required_error: 'Join date is required' }),
});

type AddMemberFormValues = z.infer<typeof addMemberSchema>;

export function AddMemberModal() {
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const setShowAddMemberModal = useGymStore((s) => s.setShowAddMemberModal);
  const activeGymId = useGymStore((s) => s.activeGymId);

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
      membershipPlan: '1 Month',
      paymentMode: 'UPI',
      amount: 1500,
    },
  });

  const selectedPlan = planOptions.find(p => p.label === watch('membershipPlan'));
  const joinDate = watch('joinDate');
  const amount = watch('amount');

  const expiryDate = joinDate
    ? new Date(new Date(joinDate).setMonth(joinDate.getMonth() + (selectedPlan?.months || 1)))
    : null;

  const onSubmit = async (data: AddMemberFormValues) => {
    if (!activeGymId) {
      toast.error('No gym selected. Please select a gym first.');
      return;
    }
    setLoading(true);
    try {
      await fetchAPI('/api/members', {
        method: 'POST',
        body: JSON.stringify({
          gymId: activeGymId,
          name: data.name.trim(),
          phoneNumber: data.phone.trim(),
          membershipPlan: data.membershipPlan,
          durationMonths: selectedPlan?.months || 1,
          planPrice: selectedPlan?.price || 0,
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
    const p = planOptions.find(o => o.label === val);
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Plan</Label>
              <Controller
                control={control}
                name="membershipPlan"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={handlePlanChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {planOptions.map(p => (
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
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
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
