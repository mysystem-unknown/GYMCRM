'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, Mail, CheckCircle2 } from 'lucide-react';
import { fetchAPI } from '@/lib/api';
import { toast } from 'sonner';

export function ForgotPasswordView({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetLink, setResetLink] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Email is required');
      return;
    }
    setLoading(true);
    try {
      const result = await fetchAPI<{ resetLink?: string; message?: string; token?: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setSent(true);
      if (result.resetLink) {
        setResetLink(result.resetLink);
      }
      toast.success(result.message || 'Reset token generated');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Reset Password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your email to receive a password reset link
          </p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            {!sent ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email Address</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700">
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Send Reset Link
                </Button>
              </form>
            ) : (
              <div className="space-y-4 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <div>
                  <p className="font-medium">Check your email</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    If your email is registered, a reset link has been generated.
                    Contact your gym admin for the reset link.
                  </p>
                </div>
                {resetLink && (
                  <div className="bg-muted/50 rounded-lg p-3 text-left">
                    <p className="text-xs text-muted-foreground mb-1">Reset Link (share with user):</p>
                    <p className="text-xs break-all font-mono">{resetLink}</p>
                    <Button
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => { window.location.href = resetLink; }}
                    >
                      Use Reset Link
                    </Button>
                  </div>
                )}
                <Button variant="outline" className="w-full" onClick={onBack}>
                  Back to Sign In
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center">
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={onBack}>
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
          </Button>
        </div>
      </div>
    </div>
  );
}
