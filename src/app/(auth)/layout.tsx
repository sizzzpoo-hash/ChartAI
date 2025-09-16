
"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { AppLayout } from '@/components/app-layout';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    // You can replace this with a beautiful loading skeleton component
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return <AppLayout>{children}</AppLayout>;
}
