'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { RoleGuard } from '@/components/RoleGuard';

interface SystemStats {
  total_orders: number;
  total_revenue: number;
  pending_orders: number;
}

export default function SuperAdminPage() {
  const [stats, setStats] = useState<SystemStats>({ total_orders: 0, total_revenue: 0, pending_orders: 0 });
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('orders').select('total, status');
      if (data) {
        setStats({
          total_orders:   data.length,
          total_revenue:  data.reduce((s, o) => s + o.total, 0),
          pending_orders: data.filter(o => o.status === 'pending').length,
        });
      }
    }
    load();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return (
    <RoleGuard allowedRoles={['superadmin']}>
      <div className="min-h-screen bg-gray-50">
        <header className="border-b border-gray-200 bg-white px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">SuperAdmin</h1>
            <p className="text-xs text-gray-400">Vista global del sistema</p>
          </div>
          <button onClick={handleSignOut} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Cerrar sesión
          </button>
        </header>

        <main className="p-8">
          <div className="grid grid-cols-3 gap-4 max-w-2xl">
            {[
              { label: 'Total pedidos',  value: stats.total_orders },
              { label: 'Pedidos pendientes', value: stats.pending_orders },
              { label: 'Revenue total',  value: `$${stats.total_revenue.toLocaleString()}` },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-5">
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </main>
      </div>
    </RoleGuard>
  );
}
