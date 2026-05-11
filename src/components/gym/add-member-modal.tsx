'use client';

import { useState } from 'react';
import { fetchAPI } from '@/lib/api';
import { useGymStore } from '@/store/gym-store';
import type { Member } from '@/types/gym';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

const planOptions = [
  { label: '1 Month', months: 1, price: 1500 },
  { label: '3 Months', months: 3, price: 3500 },
  { label: '6 Months', months: 6, price: 4500 },
  { label: '1 Year', months: 12, price: 8000 },
];

export function AddMemberModal() {
  const [open, setOpen] = useState(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [plan, setPlan] = useState('1 Month');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [amount, setAmount] = useState('1500');
  const [joinDate, setJoinDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const setShowAddMemberModal = useGymStore((s) => s.setShowAddMemberModal);

  const selectedPlan = planOptions.find((p) => p.label === plan);
  const expiryDate = new Date(joinDate);
  expiryDate.setMonth(expiryDate.getMonth() + (selectedPlan?.months || 1));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Name is required'); return; }
    if (!phone.trim()) { toast.error('Phone number is required'); return; }

    setLoading(true);
    try {
      await fetchAPI('/api/members', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          phoneNumber: phone.trim(),
          membershipPlan: plan,
          durationMonths: selectedPlan?.months || 1,
          planPrice: selectedPlan?.price || 0,
          paymentMode,
          amount: parseFloat(amount) || 0,
          joinDate: joinDate.toISOString(),
        }),
      });
      toast.success(`Member "${name}" added successfully!`);
      setOpen(false);
      setShowAddMemberModal(false);
    } catch {
      toast.error('Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChange = (val: string) => {
    setPlan(val);
    const p = planOptions.find((o) => o.label === val);
    if (p) setAmount(String(p.price));
  };

  return (
    <Dialog open={open} onOpenChange={() => { setOpen(false); setShowAddMemberModal(false); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Member name" required />
          </div>
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select value={plan} onValueChange={handlePlanChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {planOptions.map((p) => (
                    <SelectItem key={p.label} value={p.label}>{p.label} - ₹{p.price}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Mode</Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Join Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(joinDate, 'dd MMM yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={joinDate} onSelect={(d) => d && setJoinDate(d)} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Expiry Date: <span className="font-medium text-foreground">{format(expiryDate, 'dd MMM yyyy')}</span>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setOpen(false); setShowAddMemberModal(false); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
              {loading ? 'Adding...' : 'Add Member'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
