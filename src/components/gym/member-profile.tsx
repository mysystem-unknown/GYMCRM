'use client';

import { useState, useEffect } from 'react';
import { useGymStore } from '@/store/gym-store';
import { fetchAPI, formatCurrency, formatDate, getStatusColor } from '@/lib/api';
import type { Transaction } from '@/types/gym';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft, User, Phone, Calendar, CreditCard, RefreshCw,
  AlertCircle, History, Clock,
} from 'lucide-react';
import { toast } from 'sonner';

export function MemberProfile() {
  const selectedMember = useGymStore((s) => s.selectedMember);
  const setSelectedMember = useGymStore((s) => s.setSelectedMember);
  const setShowRenewalModal = useGymStore((s) => s.setShowRenewalModal);
  const user = useGymStore((s) => s.user);
  const canRenew = user?.role === 'admin' || user?.role === 'super_admin' || user?.canRenewMemberships === true;
  const activeGymId = useGymStore((s) => s.activeGymId);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedMember) {
      loadTransactions();
    }
  }, [selectedMember, activeGymId]);

  const loadTransactions = async () => {
    if (!selectedMember) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeGymId) params.set('gymId', activeGymId);
      params.set('memberId', selectedMember.id);
      params.set('limit', '100');
      const result = await fetchAPI<{ transactions: Transaction[] }>(`/api/transactions?${params}`);
      setTransactions(result.transactions);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedMember) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back button */}
      <Button variant="ghost" size="sm" className="gap-2" onClick={() => setSelectedMember(null)}>
        <ArrowLeft className="w-4 h-4" /> Back to Members
      </Button>

      {/* Header Card */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold">{selectedMember.name}</h1>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedMember.status)}`}>
                  {selectedMember.status}
                </span>
              </div>
              <p className="text-emerald-100 text-sm">{selectedMember.memberId}</p>
            </div>
            <div className="flex gap-2">
              {canRenew && (
                <Button variant="secondary" size="sm" className="gap-1" onClick={() => setShowRenewalModal(true)}>
                  <RefreshCw className="w-3.5 h-3.5" /> Renew
                </Button>
              )}
            </div>
          </div>
        </div>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <InfoItem icon={Phone} label="Phone" value={selectedMember.phoneNumber} />
            <InfoItem icon={Calendar} label="Join Date" value={formatDate(selectedMember.joinDate)} />
            <InfoItem icon={Clock} label="Expiry Date" value={formatDate(selectedMember.expiryDate)} />
            <InfoItem icon={CreditCard} label="Plan" value={selectedMember.membershipPlan} />
          </div>
        </CardContent>
      </Card>

      {/* Payment Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Payment" value={formatCurrency(selectedMember.totalPayment)} color="text-emerald-600 dark:text-emerald-400" />
        <StatCard title="Total Cash" value={formatCurrency(selectedMember.totalCash)} color="text-teal-600 dark:text-teal-400" />
        <StatCard title="Total UPI" value={formatCurrency(selectedMember.totalUpi)} color="text-violet-600 dark:text-violet-400" />
        <StatCard title="Pending" value={formatCurrency(selectedMember.pendingPayment)} color={selectedMember.pendingPayment > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'} />
      </div>

      {selectedMember.refundAmount > 0 && (
        <Card className="border-0 shadow-sm border-l-4 border-l-sky-500">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-sky-500" />
            <div>
              <p className="text-sm font-medium">Refund Amount</p>
              <p className="text-lg font-bold text-sky-600 dark:text-sky-400">{formatCurrency(selectedMember.refundAmount)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedMember.notes && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Notes</p>
            <p className="text-sm">{selectedMember.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="w-4 h-4" /> Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">No payment history</p>
          ) : (
            <div className="space-y-2">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      t.paymentMode === 'Cash'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                        : 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400'
                    }`}>
                      {t.paymentMode === 'Cash' ? '₹' : '📱'}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t.plan} - {t.duration} month{t.duration > 1 ? 's' : ''}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(t.paymentDate)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(t.amount)}</p>
                    <Badge variant="secondary" className="text-xs">{t.paymentMode}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function StatCard({ title, value, color }: { title: string; value: string; color: string }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
