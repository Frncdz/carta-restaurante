'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function SignOutPage() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.signOut().then(() => router.replace('/login'));
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <p className="text-sm text-gray-400">Cerrando sesión…</p>
    </div>
  );
}
