'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dumbbell, Loader2, Shield, Database, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { fetchAPI } from '@/lib/api';

export function SetupPage() {
  const [gymName, setGymName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await fetchAPI('/api/seed', { method: 'POST' });
      toast.success(result.message || 'System initialized successfully!');
      // Reload page to go to login
      setTimeout(() => window.location.reload(), 800);
    } catch (err: any) {
      toast.error(err.message || 'Failed to initialize system');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
            <Dumbbell className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">GymCRM</h1>
          <p className="text-sm text-muted-foreground">Gym Management System</p>
        </div>

        {/* Setup Card */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              First-Time Setup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSetup} className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium">System will create a Super Admin account:</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <code className="bg-background px-2 py-0.5 rounded text-xs">0110aryantiwari@gmail.com</code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Password</span>
                    <code className="bg-background px-2 py-0.5 rounded text-xs">Aryan@121</code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Role</span>
                    <code className="bg-background px-2 py-0.5 rounded text-xs">super_admin</code>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gymName">Your Gym Name (optional)</Label>
                <Input
                  id="gymName"
                  placeholder="e.g., FitZone Gym"
                  value={gymName}
                  onChange={(e) => setGymName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  You can create gym(s) after signing in
                </p>
              </div>

              <Button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
                Initialize System
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Security notice */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>Data is stored securely. You can manage gyms after setup.</span>
        </div>
      </div>
    </div>
  );
}
