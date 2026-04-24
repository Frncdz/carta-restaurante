'use client';

import { useEffect, useState } from 'react';
import { supabase, type DBOrder, ORDER_STATUSES, STATUS_COLORS } from '@/lib/supabase';

const ALL_STATUSES = Object.keys(ORDER_STATUSES);

export default function AdminOrders() {
  const [orders, setOrders] = useState<DBOrder[]>([]);
  const [filter, setFilter] = useState('all');

  async function load() {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setOrders(data);
  }

  useEffect(() => {
    load();
    const sub = supabase
      .channel('admin-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, load)
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, []);

  async function updateStatus(id: string, status: string) {
    await supabase.from('orders').update({ status }).eq('id', id);
  }

  const visible = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  return (
    <div className="p-8">
      <h1 className="mb-4 text-xl font-semibold text-gray-900">Pedidos</h1>

      <div className="mb-6 flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${filter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Todos ({orders.length})
        </button>
        {ALL_STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${filter === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {ORDER_STATUSES[s]} ({orders.filter(o => o.status === s).length})
          </button>
        ))}
      </div>

      <div className="space-y-2 max-w-2xl">
        {visible.map(order => (
          <div key={order.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-gray-900 text-sm">{order.customer_name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {order.table_info ?? 'Sin mesa'} · ${order.total.toLocaleString()} · {new Date(order.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </p>
                {order.notes && <p className="text-xs text-gray-500 mt-1 italic">"{order.notes}"</p>}
              </div>
              <select
                value={order.status}
                onChange={e => updateStatus(order.id, e.target.value)}
                className={`shrink-0 rounded-lg border px-2 py-1.5 text-xs font-medium outline-none ${STATUS_COLORS[order.status]}`}
              >
                {ALL_STATUSES.map(s => (
                  <option key={s} value={s}>{ORDER_STATUSES[s]}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
        {visible.length === 0 && (
          <p className="text-sm text-gray-400">No hay pedidos en este estado</p>
        )}
      </div>
    </div>
  );
}
