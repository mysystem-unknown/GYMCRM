'use client';

import { useEffect, useState } from 'react';
import { LoginView } from './login-view';
import { GymLayout } from './gym-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { ResetPasswordView } from './reset-password-view';
import { useGymStore } from '@/store/gym-store';
import { fetchAPI } from '@/lib/api';
import { toast } from 'sonner';

export function AuthGate() {
  // REACTIVE subscription — re-renders when user changes in store
  const user = useGymStore((s) => s.user);
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

  // Fetch session on mount — only runs once
  useEffect(() => {
    const init = async () => {
      try {
        // Ensure super admin exists with correct password before anything else
        await fetch('/api/seed', { credentials: 'include' }).catch(() => {});

        const res = await fetch('/api/auth/session', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data) {
            console.log('[AuthGate] Session found:', data.email, data.role);
            setUser(data);

            // For super_admin, fetch gym list and auto-select first gym
            if (data.role === 'super_admin') {
              try {
                const result = await fetchAPI<{ gyms: { id: string; name: string; isActive: boolean }[] }>('/api/gyms');
                const gyms = result.gyms || [];
                setGymList(gyms);

                if (!data.gymId && gyms.length > 0) {
                  const activeGym = gyms.find(g => g.isActive) || gyms[0];
                  setActiveGymId(activeGym.id);
                } else if (!data.gymId && gyms.length === 0) {
                  toast.info('No gyms created yet. Go to "Gyms" to create your first gym.');
                }
              } catch (err) {
                console.error('[AuthGate] Failed to load gym list:', err);
                toast.error('Failed to load gym list. Please try refreshing.');
              }
            }
          } else {
            console.log('[AuthGate] No session found — showing login');
          }
        }
      } catch (err) {
        console.error('[AuthGate] Session fetch error:', err);
        setUser(null);
      } finally {
        setReady(true);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // This is now reactive — when login sets user in store, this re-renders
  if (!user) return <LoginView />;
  return <GymLayout user={user} />;
}
