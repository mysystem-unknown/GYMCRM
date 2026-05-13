'use client';

import { useEffect, useState } from 'react';
import { AuthGate } from '@/components/gym/auth-gate';

export default function Home() {
  return <AuthGate />;
}
