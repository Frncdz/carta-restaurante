'use client';

import { useState } from 'react';

// ── CONFIGURACIÓN — editá estos valores para personalizar el restaurante ──────
const RESTAURANT = {
  name: 'La Trattoria',
  tagline: 'Cocina italiana auténtica',
  whatsapp: '5491112345678', // número sin + ni espacios
  currency: '$',
};

// ── MENÚ ──────────────────────────────────────────────────────────────────────
type Category = 'Entradas' | 'Principales' | 'Postres' | 'Bebidas';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: Category;
  emoji: string;
}

const MENU: MenuItem[] = [
  { id: '1', name: 'Bruschetta',        description: 'Pan tostado con tomate fresco, ajo y albahaca',       price: 1200, category: 'Entradas',   emoji: '🍞' },
  { id: '2', name: 'Carpaccio',         description: 'Láminas de carne con rúcula, parmesano y limón',       price: 1800, category: 'Entradas',   emoji: '🥩' },
  { id: '3', name: 'Tabla de fiambres', description: 'Selección de embutidos y quesos artesanales',          price: 2200, category: 'Entradas',   emoji: '🧀' },
  { id: '4', name: 'Pasta al Pomodoro', description: 'Tagliatelle con salsa de tomate fresco y albahaca',    price: 2800, category: 'Principales', emoji: '🍝' },
  { id: '5', name: 'Risotto al funghi', description: 'Arroz cremoso con hongos salteados y parmesano',       price: 3200, category: 'Principales', emoji: '🍚' },
  { id: '6', name: 'Milanesa napolitana', description: 'Ternera con salsa, jamón y mozzarella',              price: 3800, category: 'Principales', emoji: '🍖' },
  { id: '7', name: 'Tiramisú',          description: 'Clásico italiano con mascarpone y café',               price: 1400, category: 'Postres',    emoji: '☕' },
  { id: '8', name: 'Panna cotta',       description: 'Con coulis de frutos rojos',                           price: 1200, category: 'Postres',    emoji: '🍮' },
  { id: '9', name: 'Agua mineral',      description: 'Con o sin gas 500 ml',                                 price: 600,  category: 'Bebidas',    emoji: '💧' },
  { id: '10', name: 'Vino de la casa', description: 'Tinto o blanco, copa',                                  price: 1100, category: 'Bebidas',    emoji: '🍷' },
  { id: '11', name: 'Gaseosa',          description: 'Coca-Cola, Sprite o Fanta',                            price: 700,  category: 'Bebidas',    emoji: '🥤' },
];

const CATEGORIES: Category[] = ['Entradas', 'Principales', 'Postres', 'Bebidas'];

// ── TIPOS ─────────────────────────────────────────────────────────────────────
interface CartItem extends MenuItem {
  quantity: number;
}

interface OrderForm {
  name: string;
  table: string;
  notes: string;
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function buildWhatsAppUrl(cart: CartItem[], form: OrderForm, restaurant: typeof RESTAURANT) {
  const lines = cart.map(
    (i) => `• ${i.name} x${i.quantity} — ${restaurant.currency}${(i.price * i.quantity).toLocaleString()}`
  );
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  const message = [
    `🍽️ *Nuevo pedido — ${restaurant.name}*`,
    `👤 ${form.name}`,
    form.table ? `📍 ${form.table}` : null,
    '',
    ...lines,
    '',
    `*Total: ${restaurant.currency}${total.toLocaleString()}*`,
    form.notes ? `\n📝 ${form.notes}` : null,
  ]
    .filter((l) => l !== null)
    .join('\n');

  return `https://wa.me/${restaurant.whatsapp}?text=${encodeURIComponent(message)}`;
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
export default function RestaurantCard() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category>('Entradas');
  const [cartOpen, setCartOpen] = useState(false);
  const [form, setForm] = useState<OrderForm>({ name: '', table: '', notes: '' });

  const addToCart = (item: MenuItem) => {
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
  const filteredMenu = MENU.filter((i) => i.category === activeCategory);
  const canOrder = form.name.trim().length > 0 && cart.length > 0;

  const handleOrder = () => {
    if (!canOrder) return;
    window.open(buildWhatsAppUrl(cart, form, RESTAURANT), '_blank');
  };

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
            {CATEGORIES.map((cat) => (
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
            return (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-gray-200 p-4 transition-all hover:border-gray-300 hover:bg-gray-50"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="text-2xl leading-none">{item.emoji}</span>
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

      {/* CARRITO — PANEL LATERAL */}
      {cartOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setCartOpen(false)}
          />
          <div className="absolute bottom-0 right-0 top-0 flex w-full max-w-sm flex-col bg-white shadow-2xl">

            {/* Encabezado */}
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h2 className="font-semibold text-gray-900">Tu pedido</h2>
              <button
                onClick={() => setCartOpen(false)}
                className="text-xl text-gray-400 transition-colors hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Items */}
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

            {/* Formulario + Confirmar */}
            <div className="space-y-3 border-t border-gray-200 p-5">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Tu nombre *
                </label>
                <input
                  type="text"
                  placeholder="ej. María García"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition-colors focus:border-gray-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Mesa o tipo de entrega
                </label>
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
                disabled={!canOrder}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span>Enviar por WhatsApp</span>
                <span>→</span>
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
