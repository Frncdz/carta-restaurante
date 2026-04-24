'use client';

import { useEffect, useState } from 'react';
import { supabase, type DBMenuItem } from '@/lib/supabase';

// ── CONFIGURACIÓN — editá estos valores para personalizar el restaurante ──────
const RESTAURANT = {
  name: 'La Trattoria',
  tagline: 'Cocina italiana auténtica',
  whatsapp: '5491112345678',
  currency: '$',
};

const EMOJI_FALLBACK: Record<string, string> = {
  Entradas: '🍽️',
  Principales: '🍖',
  Postres: '🍮',
  Bebidas: '🥤',
};

// ── TIPOS ─────────────────────────────────────────────────────────────────────
interface CartItem extends DBMenuItem {
  quantity: number;
}

interface OrderForm {
  name: string;
  table: string;
  notes: string;
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function buildWhatsAppUrl(cart: CartItem[], form: OrderForm) {
  const lines = cart.map(
    (i) => `• ${i.name} x${i.quantity} — ${RESTAURANT.currency}${(i.price * i.quantity).toLocaleString()}`
  );
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  const message = [
    `🍽️ *Nuevo pedido — ${RESTAURANT.name}*`,
    `👤 ${form.name}`,
    form.table ? `📍 ${form.table}` : null,
    '',
    ...lines,
    '',
    `*Total: ${RESTAURANT.currency}${total.toLocaleString()}*`,
    form.notes ? `\n📝 ${form.notes}` : null,
  ]
    .filter((l) => l !== null)
    .join('\n');

  return `https://wa.me/${RESTAURANT.whatsapp}?text=${encodeURIComponent(message)}`;
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
export default function RestaurantCard() {
  const [menu, setMenu] = useState<DBMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [cartOpen, setCartOpen] = useState(false);
  const [form, setForm] = useState<OrderForm>({ name: '', table: '', notes: '' });
  const [saving, setSaving] = useState(false);

  // Cargar menú desde Supabase
  useEffect(() => {
    async function loadMenu() {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('available', true)
        .order('position');

      if (!error && data) {
        setMenu(data);
        const firstCategory = data[0]?.category ?? '';
        setActiveCategory(firstCategory);
      }
      setLoading(false);
    }
    loadMenu();
  }, []);

  const categories = [...new Set(menu.map((i) => i.category))];
  const filteredMenu = menu.filter((i) => i.category === activeCategory);

  const addToCart = (item: DBMenuItem) => {
    setCart((prev) => {
      const exists = prev.find((i) => i.id === item.id);
      if (exists) return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => {
      const exists = prev.find((i) => i.id === id);
      if (exists?.quantity === 1) return prev.filter((i) => i.id !== id);
      return prev.map((i) => (i.id === id ? { ...i, quantity: i.quantity - 1 } : i));
    });
  };

  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const canOrder = form.name.trim().length > 0 && cart.length > 0;

  const handleOrder = async () => {
    if (!canOrder) return;
    setSaving(true);

    // Guardar pedido en Supabase
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        customer_name: form.name,
        table_info: form.table || null,
        notes: form.notes || null,
        total: totalPrice,
        status: 'pending',
      })
      .select()
      .single();

    if (!error && order) {
      await supabase.from('order_items').insert(
        cart.map((item) => ({
          order_id: order.id,
          menu_item_id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        }))
      );
    }

    setSaving(false);
    // Abrir WhatsApp con el resumen
    window.open(buildWhatsAppUrl(cart, form), '_blank');
    setCart([]);
    setForm({ name: '', table: '', notes: '' });
    setCartOpen(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-gray-400">Cargando menú…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* HEADER */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{RESTAURANT.name}</h1>
            <p className="text-sm text-gray-400">{RESTAURANT.tagline}</p>
          </div>
          <button
            onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
          >
            <span>🛒</span>
            <span>Pedido</span>
            {totalItems > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* CATEGORÍAS */}
      <div className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-2xl px-4">
          <div className="scrollbar-hide flex gap-1 overflow-x-auto py-3">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeCategory === cat
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ITEMS DEL MENÚ */}
      <main className="mx-auto max-w-2xl px-4 py-6">
        <div className="space-y-2">
          {filteredMenu.map((item) => {
            const cartItem = cart.find((i) => i.id === item.id);
            const emoji = item.emoji ?? EMOJI_FALLBACK[item.category] ?? '🍽️';
            return (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-gray-200 p-4 transition-all hover:border-gray-300 hover:bg-gray-50"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="text-2xl leading-none">{emoji}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-gray-400">{item.description}</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {RESTAURANT.currency}{item.price.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="ml-4 flex shrink-0 items-center gap-2">
                  {cartItem ? (
                    <>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 text-sm text-gray-600 transition-colors hover:bg-gray-100"
                      >
                        −
                      </button>
                      <span className="w-5 text-center text-sm font-medium text-gray-900">
                        {cartItem.quantity}
                      </span>
                      <button
                        onClick={() => addToCart(item)}
                        className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-900 text-sm text-white transition-colors hover:bg-gray-700"
                      >
                        +
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => addToCart(item)}
                      className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-700"
                    >
                      Agregar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* CARRITO */}
      {cartOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setCartOpen(false)}
          />
          <div className="absolute bottom-0 right-0 top-0 flex w-full max-w-sm flex-col bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h2 className="font-semibold text-gray-900">Tu pedido</h2>
              <button
                onClick={() => setCartOpen(false)}
                className="text-xl text-gray-400 transition-colors hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {cart.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">
                  Todavía no agregaste nada
                </p>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-400">
                        {RESTAURANT.currency}{(item.price * item.quantity).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="flex h-6 w-6 items-center justify-center rounded border border-gray-300 text-xs text-gray-600 transition-colors hover:bg-gray-100"
                      >
                        −
                      </button>
                      <span className="w-4 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        onClick={() => addToCart(item)}
                        className="flex h-6 w-6 items-center justify-center rounded bg-gray-900 text-xs text-white transition-colors hover:bg-gray-700"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-3 border-t border-gray-200 p-5">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Tu nombre *</label>
                <input
                  type="text"
                  placeholder="ej. María García"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition-colors focus:border-gray-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Mesa o tipo de entrega</label>
                <input
                  type="text"
                  placeholder="ej. Mesa 4 / Para llevar / Delivery"
                  value={form.table}
                  onChange={(e) => setForm((f) => ({ ...f, table: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition-colors focus:border-gray-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Notas</label>
                <textarea
                  placeholder="Alergias, preferencias, puntos de cocción…"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="h-16 w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition-colors focus:border-gray-400"
                />
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-sm font-medium text-gray-700">Total</span>
                <span className="text-lg font-semibold text-gray-900">
                  {RESTAURANT.currency}{totalPrice.toLocaleString()}
                </span>
              </div>

              <button
                onClick={handleOrder}
                disabled={!canOrder || saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? 'Guardando…' : 'Enviar por WhatsApp →'}
              </button>

              {!canOrder && cart.length > 0 && (
                <p className="text-center text-xs text-gray-400">Ingresá tu nombre para continuar</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
