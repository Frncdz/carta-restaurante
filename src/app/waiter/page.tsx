'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, type DBOrder, STATUS_COLORS, ORDER_STATUSES } from '@/lib/supabase';
import { RoleGuard } from '@/components/RoleGuard';

export default function WaiterPage() {
  const [ready, setReady]       = useState<DBOrder[]>([]);
  const [delivered, setDelivered] = useState<DBOrder[]>([]);
  const router = useRouter();

  async function load() {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .in('status', ['ready', 'delivered'])
      .order('created_at', { ascending: false });
    if (data) {
      setReady(data.filter(o => o.status === 'ready'));
      setDelivered(data.filter(o => o.status === 'delivered').slice(0, 10));
    }
  }

  useEffect(() => {
    load();
    const sub = supabase
      .channel('waiter')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, load)
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, []);

  async function markDelivered(id: string) {
    await supabase.from('orders').update({ status: 'delivered' }).eq('id', id);
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return (
    <RoleGuard allowedRoles={['waiter']}>
      <div className="min-h-screen bg-gray-50">
        <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-gray-900">Mozo</h1>
            <p className="text-xs text-gray-400">{ready.length} pedido{ready.length !== 1 ? 's' : ''} para entregar</p>
          </div>
          <button onClick={handleSignOut} className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
            Salir
          </button>
        </header>

        <main className="p-6 space-y-8 max-w-xl">
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Listos para entregar</h2>
            {ready.length === 0 ? (
              <p className="text-sm text-gray-400">No hay pedidos listos</p>
            ) : (
              <div className="space-y-2">
                {ready.map(order => (
                  <div key={order.id} className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 p-4">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{order.customer_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{order.table_info ?? 'Sin mesa'} · ${order.total.toLocaleString()}</p>
                    </div>
                    <button
                      onClick={() => markDelivered(order.id)}
                      className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-700"
                    >
                      Entregar ✓
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Últimos entregados</h2>
            <div className="space-y-2">
              {delivered.map(order => (
                <div key={order.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 opacity-60">
                  <div>
                    <p className="text-sm text-gray-600">{order.customer_name}</p>
                    <p className="text-xs text-gray-400">{order.table_info ?? 'Sin mesa'}</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs ${STATUS_COLORS['delivered']}`}>
                    {ORDER_STATUSES['delivered']}
                  </span>
                </div>
              ))}
              {delivered.length === 0 && <p className="text-sm text-gray-400">Sin historial</p>}
            </div>
          </section>
        </main>
      </div>
    </RoleGuard>
  );
}
