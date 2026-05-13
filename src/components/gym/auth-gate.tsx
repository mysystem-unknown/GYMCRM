'use client';

import { useEffect, useState, useCallback } from 'react';
import { LoginView } from './login-view';
import { GymLayout } from './gym-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { ResetPasswordView } from './reset-password-view';

// Simple auth check without next-auth SessionProvider (avoids Turbopack Context issue)
function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.ok ? res.json() : null)
      .then(data => { setUser(data); setLoading(false); })
      .catch(() => { setUser(null); setLoading(false); });
  }, []);

  return { user, loading, setUser };
}

export function AuthGate() {
  const { user, loading } = useAuth();
  const [resetToken, setResetToken] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reset')) {
      setResetToken(params.get('reset'));
    }
  }, []);

  if (resetToken) {
    return <ResetPasswordView token={resetToken} onBack={() => { window.location.search = ''; }} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <Skeleton className="h-12 w-12 rounded-lg mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
          <Skeleton className="h-3 w-24 mx-auto" />
        </div>
      </div>
    );
  }

  if (!user) return <LoginView onLogin={() => window.location.reload()} />;
  return <GymLayout user={user} />;
}
