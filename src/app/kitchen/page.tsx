'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, type DBOrder, ORDER_STATUSES, STATUS_COLORS } from '@/lib/supabase';
import { RoleGuard } from '@/components/RoleGuard';

const QUEUE_STATUSES = ['pending', 'confirmed', 'preparing'];

const NEXT_STATUS: Record<string, string> = {
  pending:  'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
};

const NEXT_LABEL: Record<string, string> = {
  pending:   'Confirmar',
  confirmed: 'Iniciar',
  preparing: 'Listo ✓',
};

export default function KitchenPage() {
  const [orders, setOrders] = useState<DBOrder[]>([]);
  const router = useRouter();

  async function load() {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .in('status', QUEUE_STATUSES)
      .order('created_at');
    if (data) setOrders(data);
  }

  useEffect(() => {
    load();
    const sub = supabase
      .channel('kitchen')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, load)
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, []);

  async function advance(order: DBOrder) {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    await supabase.from('orders').update({ status: next }).eq('id', order.id);
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return (
    <RoleGuard allowedRoles={['kitchen']}>
      <div className="min-h-screen bg-gray-50">
        <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-gray-900">Cocina</h1>
            <p className="text-xs text-gray-400">{orders.length} pedido{orders.length !== 1 ? 's' : ''} en cola</p>
          </div>
          <button onClick={handleSignOut} className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
            Salir
          </button>
        </header>

        <main className="p-6">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-3xl mb-3">✅</p>
              <p className="text-sm text-gray-400">No hay pedidos en cola</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {orders.map(order => (
                <div key={order.id} className="rounded-xl border border-gray-200 bg-white p-5 flex flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{order.customer_name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{order.table_info ?? 'Sin mesa'}</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                      {ORDER_STATUSES[order.status]}
                    </span>
                  </div>

                  {order.notes && (
                    <p className="rounded-lg bg-yellow-50 px-3 py-2 text-xs text-yellow-700 border border-yellow-200">
                      📝 {order.notes}
                    </p>
                  )}

                  <p className="text-xs text-gray-400">
                    {new Date(order.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </p>

                  {NEXT_STATUS[order.status] && (
                    <button
                      onClick={() => advance(order)}
                      className="w-full rounded-xl bg-gray-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700"
                    >
                      {NEXT_LABEL[order.status]}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </RoleGuard>
  );
}
