'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, CheckCircle2, Dumbbell, Lock } from 'lucide-react';
import { fetchAPI } from '@/lib/api';
import { toast } from 'sonner';

export function ResetPasswordView({ token, onBack }: { token: string; onBack: () => void }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await fetchAPI('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      });
      setDone(true);
      toast.success('Password reset successfully! You can now sign in.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 mb-4">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Set New Password</h1>
        </div>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            {!done ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confirm Password</Label>
                  <Input
                    type="password"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700">
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Reset Password
                </Button>
              </form>
            ) : (
              <div className="space-y-4 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <p className="font-medium">Password Reset Successfully</p>
                <p className="text-sm text-muted-foreground">You can now sign in with your new password.</p>
                <Button className="w-full" onClick={onBack}>
                  Go to Sign In
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
