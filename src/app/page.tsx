'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUserRole, type UserRole } from '@/hooks/useUserRole';

const ROLE_REDIRECTS: Record<UserRole, string> = {
  superadmin:     '/superadmin',
  admin:          '/admin',
  waiter:         '/waiter',
  kitchen:        '/kitchen',
  customer_host:  '/table',
  customer_guest: '/table',
};

export default function RootPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const { role, loading: roleLoading } = useUserRole();
  const router = useRouter();

  useEffect(() => {
    if (userLoading || roleLoading) return;
    if (!user) { router.replace('/login'); return; }
    const dest = role ? ROLE_REDIRECTS[role] : '/unauthorized';
    router.replace(dest);
  }, [user, role, userLoading, roleLoading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <p className="text-sm text-gray-400">Cargando…</p>
    </div>
  );
}
