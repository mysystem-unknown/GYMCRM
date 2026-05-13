'use client';

import { useEffect, useState } from 'react';
import { LoginView } from './login-view';
import { GymLayout } from './gym-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { ResetPasswordView } from './reset-password-view';
import { useGymStore } from '@/store/gym-store';
import { fetchAPI } from '@/lib/api';

export function AuthGate() {
  const setUser = useGymStore((s) => s.setUser);
  const setGymList = useGymStore((s) => s.setGymList);
  const setActiveGymId = useGymStore((s) => s.setActiveGymId);
  const [ready, setReady] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reset')) {
      setResetToken(params.get('reset'));
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setUser(data);

            // For super_admin, fetch gym list and auto-select first gym
            if (data.role === 'super_admin') {
              try {
                const result = await fetchAPI<{ gyms: { id: string; name: string; isActive: boolean }[] }>('/api/gyms');
                const gyms = result.gyms || [];
                setGymList(gyms);
                // Auto-select first active gym if no active gym is set
                if (!data.gymId && gyms.length > 0) {
                  const activeGym = gyms.find(g => g.isActive) || gyms[0];
                  setActiveGymId(activeGym.id);
                }
              } catch {
                // Gym list fetch failed, but user is still logged in
              }
            }
          }
        }
      } catch {
        setUser(null);
      } finally {
        setReady(true);
      }
    };
    init();
  }, [setUser, setGymList, setActiveGymId]);

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
