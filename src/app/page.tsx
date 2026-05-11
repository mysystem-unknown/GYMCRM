'use client';

import { useEffect } from 'react';
import { GymLayout } from '@/components/gym/gym-layout';
import { useGymStore } from '@/store/gym-store';
import { toast } from 'sonner';

export default function Home() {
  const setActiveView = useGymStore((s) => s.setActiveView);

  useEffect(() => {
    // Seed database on first load
    fetch('/api/seed', { method: 'POST' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          toast.success('Database initialized with sample data');
          setActiveView('dashboard');
        }
      })
      .catch(() => {});
  }, []);

  return <GymLayout />;
}
