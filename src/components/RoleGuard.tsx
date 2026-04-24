'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUserRole, type UserRole } from '@/hooks/useUserRole';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user, loading: userLoading } = useCurrentUser();
  const { role, loading: roleLoading } = useUserRole();
  const router = useRouter();

  useEffect(() => {
    if (userLoading || roleLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (!role || !allowedRoles.includes(role)) { router.replace('/unauthorized'); }
  }, [user, role, userLoading, roleLoading, router, allowedRoles]);

  if (userLoading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-gray-400">Verificando acceso…</p>
      </div>
    );
  }

  if (!user || !role || !allowedRoles.includes(role)) return null;

  return <>{children}</>;
}
