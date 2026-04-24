'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase, type DBMenuItem } from '@/lib/supabase';
import { RoleGuard } from '@/components/RoleGuard';
import { useUserRole } from '@/hooks/useUserRole';
import { useCurrentUser } from '@/hooks/useCurrentUser';

const RESTAURANT = {
  name:      'La Trattoria',
  tagline:   'Cocina italiana auténtica',
  currency:  '$',
  whatsapp:  '5491112345678',
};

const EMOJI_FALLBACK: Record<string, string> = {
  Entradas: '🍽️', Principales: '🍖', Postres: '🍮', Bebidas: '🥤',
};

interface CartItem extends DBMenuItem { quantity: number }
interface OrderForm { name: string; notes: string }

function buildWhatsAppUrl(cart: CartItem[], form: OrderForm, tableId: string) {
  const lines = cart.map(i => `• ${i.name} x${i.quantity} — ${RESTAURANT.currency}${(i.price * i.quantity).toLocaleString()}`);
  const total  = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const msg    = [
    `🍽️ *Pedido — ${RESTAURANT.name}*`,
    `👤 ${form.name}`,
    `📍 Mesa ${tableId}`,
    '',
    ...lines,
    '',
    `*Total: ${RESTAURANT.currency}${total.toLocaleString()}*`,
    form.notes ? `\n📝 ${form.notes}` : null,
  ].filter(Boolean).join('\n');
  return `https://wa.me/${RESTAURANT.whatsapp}?text=${encodeURIComponent(msg)}`;
}

function TableContent() {
  const params              = useParams();
  const tableId             = params.id as string;
  const { user }            = useCurrentUser();
  const { role }            = useUserRole();
  const isHost              = role === 'customer_host';

  const [menu, setMenu]             = useState<DBMenuItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [activeCategory, setActive] = useState('');
  const [cart, setCart]             = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen]     = useState(false);
  const [form, setForm]             = useState<OrderForm>({ name: '', notes: '' });
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase.from('menu_items').select('*').eq('available', true).order('position');
        if (data && data.length > 0) {
          setMenu(data);
          setActive(data[0].category);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const categories    = [...new Set(menu.map(i => i.category))];
  const filteredMenu  = menu.filter(i => i.category === activeCategory);
  const totalItems    = cart.reduce((s, i) => s + i.quantity, 0);
  const totalPrice    = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const canOrder      = isHost && form.name.trim().length > 0 && cart.length > 0;

  const addToCart = (item: DBMenuItem) =>
    setCart(prev => prev.find(i => i.id === item.id)
      ? prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
      : [...prev, { ...item, quantity: 1 }]);

  const removeFromCart = (id: string) =>
    setCart(prev => {
      const e = prev.find(i => i.id === id);
      return e?.quantity === 1 ? prev.filter(i => i.id !== id) : prev.map(i => i.id === id ? { ...i, quantity: i.quantity - 1 } : i);
    });

  const handleOrder = async () => {
    if (!canOrder) return;
    setSaving(true);
    const { data: order } = await supabase.from('orders').insert({
      customer_name: form.name,
      table_info:    `Mesa ${tableId}`,
      notes:         form.notes || null,
      total:         totalPrice,
      status:        'pending',
    }).select().single();

    if (order) {
      await supabase.from('order_items').insert(
        cart.map(i => ({ order_id: order.id, menu_item_id: i.id, name: i.name, price: i.price, quantity: i.quantity }))
      );
    }
    setSaving(false);
    window.open(buildWhatsAppUrl(cart, form, tableId), '_blank');
    setCart([]);
    setForm({ name: '', notes: '' });
    setCartOpen(false);
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <p className="text-sm text-gray-400">Cargando menú…</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-white font-sans">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{RESTAURANT.name}</h1>
            <p className="text-xs text-gray-400">Mesa {tableId} · {isHost ? 'Host' : 'Invitado'}</p>
          </div>
          <button
            onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
          >
            🛒 Pedido
            {totalItems > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="border-b border-gray-100">
        <div className="mx-auto max-w-2xl px-4">
          <div className="scrollbar-hide flex gap-1 overflow-x-auto py-3">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActive(cat)}
                className={`whitespace-nowrap rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${activeCategory === cat ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-2xl px-4 py-6">
        <div className="space-y-2">
          {filteredMenu.map(item => {
            const cartItem = cart.find(i => i.id === item.id);
            return (
              <div key={item.id} className="flex items-center justify-between rounded-xl border border-gray-200 p-4 transition-all hover:border-gray-300 hover:bg-gray-50">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="text-2xl leading-none">{item.emoji ?? EMOJI_FALLBACK[item.category] ?? '🍽️'}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-gray-400">{item.description}</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">{RESTAURANT.currency}{item.price.toLocaleString()}</p>
                  </div>
                </div>
                <div className="ml-4 flex shrink-0 items-center gap-2">
                  {cartItem ? (
                    <>
                      <button onClick={() => removeFromCart(item.id)} className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 text-sm text-gray-600 hover:bg-gray-100">−</button>
                      <span className="w-5 text-center text-sm font-medium">{cartItem.quantity}</span>
                      <button onClick={() => addToCart(item)} className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-900 text-sm text-white hover:bg-gray-700">+</button>
                    </>
                  ) : (
                    <button onClick={() => addToCart(item)} className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700">Agregar</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {cartOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
          <div className="absolute bottom-0 right-0 top-0 flex w-full max-w-sm flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h2 className="font-semibold text-gray-900">Tu pedido</h2>
              <button onClick={() => setCartOpen(false)} className="text-xl text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {cart.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">Todavía no agregaste nada</p>
              ) : cart.map(item => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-400">{RESTAURANT.currency}{(item.price * item.quantity).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => removeFromCart(item.id)} className="flex h-6 w-6 items-center justify-center rounded border border-gray-300 text-xs text-gray-600 hover:bg-gray-100">−</button>
                    <span className="w-4 text-center text-sm">{item.quantity}</span>
                    <button onClick={() => addToCart(item)} className="flex h-6 w-6 items-center justify-center rounded bg-gray-900 text-xs text-white hover:bg-gray-700">+</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-3 border-t border-gray-200 p-5">
              {isHost ? (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Tu nombre *</label>
                    <input type="text" placeholder="ej. María García" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Notas</label>
                    <textarea placeholder="Alergias, preferencias…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="h-16 w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400" />
                  </div>
                </>
              ) : (
                <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500 text-center">Solo el host puede confirmar el pedido</p>
              )}
              <div className="flex items-center justify-between py-1">
                <span className="text-sm font-medium text-gray-700">Total</span>
                <span className="text-lg font-semibold text-gray-900">{RESTAURANT.currency}{totalPrice.toLocaleString()}</span>
              </div>
              {isHost && (
                <button onClick={handleOrder} disabled={!canOrder || saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-3 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed">
                  {saving ? 'Guardando…' : 'Enviar por WhatsApp →'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TablePage() {
  return (
    <RoleGuard allowedRoles={['customer_host', 'customer_guest']}>
      <TableContent />
    </RoleGuard>
  );
}
