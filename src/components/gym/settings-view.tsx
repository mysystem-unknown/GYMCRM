'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { settingsSchema, type SettingsFormValues } from '@/lib/schemas';
import { useGymStore } from '@/store/gym-store';
import { fetchAPI } from '@/lib/api';
import { exportToCSV } from '@/lib/export';
import { formatDate } from '@/lib/api';
import type { Member } from '@/types/gym';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, Save, Banknote, Smartphone, Download, Database } from 'lucide-react';
import { toast } from 'sonner';

export function SettingsView() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const activeGymId = useGymStore((s) => s.activeGymId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      openingCashBalance: 0,
      openingUpiBalance: 0,
    },
  });

  useEffect(() => {
    loadSettings();
  }, [activeGymId]);

  const loadSettings = async () => {
    try {
      const params = new URLSearchParams();
      if (activeGymId) params.set('gymId', activeGymId);
      const data = await fetchAPI<{ openingCashBalance: number; openingUpiBalance: number }>(`/api/settings?${params}`);
      reset({
        openingCashBalance: data.openingCashBalance,
        openingUpiBalance: data.openingUpiBalance,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: SettingsFormValues) => {
    setSaving(true);
    try {
      await fetchAPI('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({
          gymId: activeGymId,
          openingCashBalance: data.openingCashBalance,
          openingUpiBalance: data.openingUpiBalance,
        }),
      });
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleExportAll = async () => {
    if (!activeGymId) {
      toast.error('No gym selected. Please select a gym first.');
      return;
    }
    setExporting(true);
    try {
      toast.loading('Exporting all data as JSON...');
      const params = new URLSearchParams();
      params.set('gymId', activeGymId);
      const res = await fetch(`/api/export?${params}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Export failed' }));
        throw new Error(errData.error || 'Export failed');
      }
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `gymcrm-backup-${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Full backup downloaded!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleExportMembersCSV = async () => {
    if (!activeGymId) {
      toast.error('No gym selected. Please select a gym first.');
      return;
    }
    try {
      toast.loading('Exporting members as CSV...');
      const params = new URLSearchParams();
      params.set('gymId', activeGymId);
      params.set('limit', '1000');
      const result = await fetchAPI<{ members: Member[] }>(`/api/members?${params}`);
      const data = result.members;
      if (data.length === 0) {
        toast.error('No members to export');
        return;
      }
      const exportData = data.map(m => ({
        'Member ID': m.memberId, 'Name': m.name, 'Phone': m.phoneNumber,
        'Join Date': formatDate(m.joinDate), 'Expiry Date': formatDate(m.expiryDate),
        'Plan': m.membershipPlan, 'Cash': m.currentCashPayment, 'UPI': m.currentUpiPayment,
        'Total': m.totalPayment, 'Pending': m.pendingPayment, 'Status': m.status,
      }));
      exportToCSV(exportData, 'gym-members.csv');
      toast.success(`${data.length} members exported as CSV`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'CSV export failed');
    }
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure opening balances and preferences</p>
      </div>

      {loading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-4 h-4" /> Opening Balances
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(handleSave)} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-emerald-500" />
                    Opening Cash Balance (₹)
                  </Label>
                  <Input
                    type="number"
                    {...register('openingCashBalance', { valueAsNumber: true })}
                    placeholder="0"
                  />
                  {errors.openingCashBalance && <p className="text-xs text-red-500">{errors.openingCashBalance.message}</p>}
                  <p className="text-xs text-muted-foreground">
                    The initial cash balance before any transactions
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-violet-500" />
                    Opening UPI Balance (₹)
                  </Label>
                  <Input
                    type="number"
                    {...register('openingUpiBalance', { valueAsNumber: true })}
                    placeholder="0"
                  />
                  {errors.openingUpiBalance && <p className="text-xs text-red-500">{errors.openingUpiBalance.message}</p>}
                  <p className="text-xs text-muted-foreground">
                    The initial UPI balance before any transactions
                  </p>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">How balances are calculated:</p>
                <p className="text-xs text-muted-foreground">
                  Final Cash Balance = Opening Cash + Total Cash Received - Cash Expenses
                </p>
                <p className="text-xs text-muted-foreground">
                  Final UPI Balance = Opening UPI + Total UPI Received - UPI Expenses
                </p>
                <p className="text-xs text-muted-foreground">
                  Total Balance = Cash Balance + UPI Balance
                </p>
              </div>

              <Button type="submit" disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2">
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Export Section */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="w-4 h-4" /> Data Export
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              Export your gym data for backup or migration. All exports include data for your current gym.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleExportAll}
              disabled={exporting}
            >
              <Download className="w-4 h-4" />
              Export All Data (JSON Backup)
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleExportMembersCSV}
            >
              <Download className="w-4 h-4" />
              Export Members (CSV)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
