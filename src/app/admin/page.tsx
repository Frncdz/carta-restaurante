'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const STATS_CONFIG = [
  { key: 'pending',   label: 'Pendientes', color: 'border-yellow-200 bg-yellow-50' },
  { key: 'preparing', label: 'Preparando', color: 'border-orange-200 bg-orange-50' },
  { key: 'ready',     label: 'Listos',     color: 'border-green-200 bg-green-50'  },
  { key: 'delivered', label: 'Entregados', color: 'border-gray-200 bg-gray-50'    },
];

export default function AdminDashboard() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [revenue, setRevenue] = useState(0);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('orders').select('status, total');
      if (!data) return;
      const c: Record<string, number> = {};
      let rev = 0;
      data.forEach(o => {
        c[o.status] = (c[o.status] ?? 0) + 1;
        if (o.status === 'delivered') rev += o.total;
      });
      setCounts(c);
      setRevenue(rev);
    }
    load();

    const sub = supabase
      .channel('admin-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, load)
      .subscribe();

    return () => { sub.unsubscribe(); };
  }, []);

  return (
    <div className="p-8">
      <h1 className="mb-6 text-xl font-semibold text-gray-900">Dashboard</h1>

      <div className="mb-8 grid grid-cols-2 gap-4 max-w-md">
        {STATS_CONFIG.map(s => (
          <div key={s.key} className={`rounded-xl border p-5 ${s.color}`}>
            <p className="text-2xl font-bold text-gray-900">{counts[s.key] ?? 0}</p>
            <p className="mt-1 text-sm text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 max-w-md">
        <p className="text-xs text-gray-400 mb-1">Revenue entregado</p>
        <p className="text-3xl font-bold text-gray-900">${revenue.toLocaleString()}</p>
      </div>
    </div>
  );
}
