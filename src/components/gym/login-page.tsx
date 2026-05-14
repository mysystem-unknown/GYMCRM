'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dumbbell, Eye, EyeOff, Loader2, Phone, Mail, BookOpen, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useGymStore } from '@/store/gym-store';
import { ForgotPasswordView } from './forgot-password-view';
import { HowToUseView } from './how-to-use-view';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'login' | 'forgot' | 'howto'>('login');

  // Get store actions for direct state update after login
  const setUser = useGymStore((s) => s.setUser);
  const setGymList = useGymStore((s) => s.setGymList);
  const setActiveGymId = useGymStore((s) => s.setActiveGymId);

  if (view === 'forgot') return <ForgotPasswordView onBack={() => setView('login')} />;
  if (view === 'howto') return <HowToUseView onBack={() => setView('login')} />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Email and password are required');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Invalid email or password');
        return;
      }

      // Login succeeded — update store directly
      console.log('[LoginPage] Success, updating store:', data.user?.email, data.user?.role);
      setUser(data.user);

      // For super_admin, fetch gym list immediately
      if (data.user?.role === 'super_admin') {
        try {
          const gymsRes = await fetch('/api/gyms', { credentials: 'include' });
          if (gymsRes.ok) {
            const gymsData = await gymsRes.json();
            const gyms = gymsData.gyms || [];
            setGymList(gyms);
            if (!data.user.gymId && gyms.length > 0) {
              const activeGym = gyms.find((g: { isActive: boolean }) => g.isActive) || gyms[0];
              setActiveGymId(activeGym.id);
            }
          }
        } catch (err) {
          console.error('[LoginPage] Failed to fetch gym list:', err);
        }
      }

      toast.success('Welcome back!');
    } catch (err) {
      console.error('[LoginPage] Request failed:', err);
      toast.error('Login failed. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
            <Dumbbell className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">GymCRM</h1>
          <p className="text-sm text-muted-foreground">Gym Management System</p>
        </div>

        {/* Login Card */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Sign in to your account</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Button
                    type="button"
                    variant="link"
                    className="px-0 h-auto text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setView('forgot')}
                  >
                    Forgot password?
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                  </Button>
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* How to use */}
        <div className="flex justify-center">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => setView('howto')}>
            <BookOpen className="w-3.5 h-3.5" /> How to use this CRM?
          </Button>
        </div>

        {/* Contact for account */}
        <Card className="border-0 shadow-sm bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
              <div className="text-sm space-y-1">
                <p className="font-medium">Want your own Gym CRM?</p>
                <p className="text-muted-foreground">Contact us to set up your gym management system:</p>
                <div className="flex flex-col gap-1 mt-2">
                  <a href="tel:+919306512832" className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 hover:underline">
                    <Phone className="w-3 h-3" /> +91 93065 12832
                  </a>
                  <a href="mailto:0110aryantiwari@gmail.com" className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 hover:underline">
                    <Mail className="w-3 h-3" /> 0110aryantiwari@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
