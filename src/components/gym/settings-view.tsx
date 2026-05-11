'use client';

import { useState, useEffect } from 'react';
import { fetchAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, Save, IndianRupee, Banknote, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

export function SettingsView() {
  const [openingCash, setOpeningCash] = useState('');
  const [openingUpi, setUpiUpi] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await fetchAPI<{ openingCashBalance: number; openingUpiBalance: number }>('/api/settings');
      setOpeningCash(String(data.openingCashBalance));
      setUpiUpi(String(data.openingUpiBalance));
    } catch {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetchAPI('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({
          openingCashBalance: parseFloat(openingCash) || 0,
          openingUpiBalance: parseFloat(openingUpi) || 0,
        }),
      });
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
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
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-emerald-500" />
                    Opening Cash Balance (₹)
                  </Label>
                  <Input
                    type="number"
                    value={openingCash}
                    onChange={(e) => setOpeningCash(e.target.value)}
                    placeholder="0"
                  />
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
                    value={openingUpi}
                    onChange={(e) => setUpiUpi(e.target.value)}
                    placeholder="0"
                  />
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
    </div>
  );
}
