'use client';

import { useEffect, useState } from 'react';
import { supabase, type UserRole } from '@/lib/supabase';
import { useCurrentUser } from './useCurrentUser';

export type { UserRole };

export function useUserRole() {
  const { user, loading: userLoading } = useCurrentUser();
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userLoading) return;

    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setRole((data?.role as UserRole) ?? null);
        setLoading(false);
      });
  }, [user, userLoading]);

  return { role, loading };
}
