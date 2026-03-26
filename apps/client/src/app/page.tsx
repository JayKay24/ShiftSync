'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function Index() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === 'Admin' || user.role === 'Manager') {
        router.push('/dashboard/manager');
      } else {
        router.push('/dashboard/staff');
      }
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-primary shadow-lg">
        <span className="text-3xl font-bold text-primary-foreground">S</span>
      </div>
      <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
        Welcome to ShiftSync
      </h1>
      <p className="mb-8 max-w-lg text-lg text-slate-600">
        Effortless shift scheduling and management for Coastal Eats. 
        Streamline your workflow with real-time sync and labor compliance.
      </p>
      <div className="flex gap-4">
        <Button size="lg" onClick={() => router.push('/login')}>
          Sign In
        </Button>
      </div>
    </div>
  );
}
