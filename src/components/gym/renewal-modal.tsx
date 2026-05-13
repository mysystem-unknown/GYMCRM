'use client';

import { useState } from 'react';
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
  const [plan, setPlan] = useState('1 Month');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [amount, setAmount] = useState('1500');
  const [renewalDate, setRenewalDate] = useState<Date | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  if (!selectedMember) return null;

  const selectedPlan = planOptions.find((p) => p.label === plan);
  const currentExpiry = new Date(selectedMember.expiryDate);
  const now = new Date();
  const baseDate = currentExpiry > now ? currentExpiry : (renewalDate || now);
  const newExpiry = new Date(baseDate);
  newExpiry.setMonth(newExpiry.getMonth() + (selectedPlan?.months || 1));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(amount) || 0;
    if (amountNum <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }
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
          paymentMode,
          amount: amountNum,
          plan,
          duration: selectedPlan?.months || 1,
          paymentDate: (renewalDate || new Date()).toISOString(),
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
    setPlan(val);
    const p = planOptions.find((o) => o.label === val);
    if (p) setAmount(String(p.price));
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>New Plan</Label>
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
                  <SelectItem value="Cash">💵 Cash</SelectItem>
                  <SelectItem value="UPI">📱 UPI</SelectItem>
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
              <Label>Renewal Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {renewalDate ? format(renewalDate, 'dd MMM yyyy') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={renewalDate} onSelect={(d) => d && setRenewalDate(d)} />
                </PopoverContent>
              </Popover>
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
