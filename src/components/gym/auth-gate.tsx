'use client';

import { useEffect, useState } from 'react';
import { LoginView } from './login-view';
import { GymLayout } from './gym-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { ResetPasswordView } from './reset-password-view';
import { useGymStore } from '@/store/gym-store';

export function AuthGate() {
  const setUser = useGymStore((s) => s.setUser);
  const [ready, setReady] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reset')) {
      setResetToken(params.get('reset'));
    }
  }, []);

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setUser(data);
        setReady(true);
      })
      .catch(() => {
        setUser(null);
        setReady(true);
      });
  }, [setUser]);

  if (resetToken) {
    return <ResetPasswordView token={resetToken} onBack={() => { window.location.search = ''; }} />;
  }

  if (!ready) {
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

  const user = useGymStore.getState().user;
  if (!user) return <LoginView onLogin={() => window.location.reload()} />;
  return <GymLayout user={user} />;
}
