'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { supabase, type DBMenuItem } from '@/lib/supabase';

// ── CONFIG ────────────────────────────────────────────────────────────────────
const RESTAURANT = {
  name:     'La Trattoria',
  currency: '$',
  whatsapp: '5491112345678',
};
const EMOJI_FALLBACK: Record<string, string> = {
  Entradas: '🍽️', Principales: '🍖', Postres: '🍮', Bebidas: '🥤',
};

// ── TIPOS ─────────────────────────────────────────────────────────────────────
type TableState =
  | 'loading'
  | 'open_form'    // no hay sesión → formulario "abrir mesa"
  | 'join_form'    // hay sesión → formulario "unirse"
  | 'waiting'      // guest esperando aprobación
  | 'rejected'     // guest rechazado o expulsado
  | 'host_active'  // vista host
  | 'guest_active' // vista guest aprobado

interface Session      { id: string; table_id: string; host_name: string; status: string }
interface Participant  { id: string; session_id: string; guest_name: string; status: string }
interface LocalData    { sessionId: string; role: 'host' | 'guest'; name: string; participantId?: string }
interface CartItem extends DBMenuItem { quantity: number }

// ── COMPONENTE ────────────────────────────────────────────────────────────────
export default function TablePage() {
  const params    = useParams();
  const tableId   = params.id as string;
  const storageKey = `tabla_${tableId}`;

  const [state, setState]               = useState<TableState>('loading');
  const [session, setSession]           = useState<Session | null>(null);
  const [localData, setLocalData]       = useState<LocalData | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);

  const [menu, setMenu]                 = useState<DBMenuItem[]>([]);
  const [menuLoading, setMenuLoading]   = useState(true);
  const [activeCategory, setActive]     = useState('');
  const [cart, setCart]                 = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen]         = useState(false);
  const [guestsOpen, setGuestsOpen]     = useState(false);
  const [notes, setNotes]               = useState('');
  const [name, setName]                 = useState('');
  const [formLoading, setFormLoading]   = useState(false);

  // Cargar menú
  useEffect(() => {
    supabase.from('menu_items').select('*').eq('available', true).order('position')
      .then(({ data }) => {
        if (data?.length) { setMenu(data); setActive(data[0].category); }
        setMenuLoading(false);
      });
  }, []);

  // Cargar participantes (para host)
  const loadParticipants = useCallback(async (sessionId: string) => {
    const { data } = await supabase
      .from('session_participants').select('*')
      .eq('session_id', sessionId).order('created_at');
    if (data) setParticipants(data);
  }, []);

  // Inicializar estado de la mesa
  useEffect(() => {
    async function init() {
      const stored = localStorage.getItem(storageKey);

      if (stored) {
        const local: LocalData = JSON.parse(stored);
        const { data: s } = await supabase
          .from('table_sessions').select('*')
          .eq('id', local.sessionId).eq('status', 'active').single();

        if (s) {
          setSession(s);
          setLocalData(local);
          if (local.role === 'host') {
            setState('host_active');
            loadParticipants(local.sessionId);
          } else if (local.participantId) {
            const { data: p } = await supabase
              .from('session_participants').select('*')
              .eq('id', local.participantId).single();
            if (p?.status === 'approved')                      setState('guest_active');
            else if (p?.status === 'rejected' || p?.status === 'kicked') setState('rejected');
            else                                                setState('waiting');
          }
          return;
        }
        localStorage.removeItem(storageKey);
      }

      // ¿Hay sesión activa en esta mesa?
      const { data: active } = await supabase
        .from('table_sessions').select('*')
        .eq('table_id', tableId).eq('status', 'active').single();

      if (active) { setSession(active); setState('join_form'); }
      else        { setState('open_form'); }
    }
    init();
  }, [tableId, storageKey, loadParticipants]);

  // Realtime HOST: nuevos guests
  useEffect(() => {
    if (state !== 'host_active' || !localData?.sessionId) return;
    const sub = supabase.channel(`host-${localData.sessionId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'session_participants',
        filter: `session_id=eq.${localData.sessionId}`,
      }, () => loadParticipants(localData.sessionId))
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, [state, localData, loadParticipants]);

  // Realtime GUEST: cambio de estado propio
  useEffect(() => {
    if (!['waiting', 'guest_active'].includes(state) || !localData?.participantId) return;
    const sub = supabase.channel(`guest-${localData.participantId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'session_participants',
        filter: `id=eq.${localData.participantId}`,
      }, ({ new: p }) => {
        const updated = p as Participant;
        if (updated.status === 'approved')                            setState('guest_active');
        else if (updated.status === 'rejected' || updated.status === 'kicked') setState('rejected');
      })
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, [state, localData]);

  // Abrir mesa como HOST
  const openTable = async () => {
    if (!name.trim()) return;
    setFormLoading(true);
    const { data: s } = await supabase
      .from('table_sessions')
      .insert({ table_id: tableId, host_name: name.trim(), status: 'active' })
      .select().single();
    if (s) {
      const local: LocalData = { sessionId: s.id, role: 'host', name: name.trim() };
      localStorage.setItem(storageKey, JSON.stringify(local));
      setLocalData(local); setSession(s);
      setState('host_active'); loadParticipants(s.id);
    }
    setFormLoading(false);
  };

  // Unirse como GUEST
  const joinTable = async () => {
    if (!name.trim() || !session) return;
    setFormLoading(true);
    const { data: p } = await supabase
      .from('session_participants')
      .insert({ session_id: session.id, guest_name: name.trim(), status: 'pending' })
      .select().single();
    if (p) {
      const local: LocalData = { sessionId: session.id, role: 'guest', name: name.trim(), participantId: p.id };
      localStorage.setItem(storageKey, JSON.stringify(local));
      setLocalData(local); setState('waiting');
    }
    setFormLoading(false);
  };

  const updateParticipant = (id: string, status: string) =>
    supabase.from('session_participants').update({ status }).eq('id', id);

  const leaveTable = () => { localStorage.removeItem(storageKey); window.location.reload(); };

  // Cart
  const addToCart = (item: DBMenuItem) =>
    setCart(prev => prev.find(i => i.id === item.id)
      ? prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
      : [...prev, { ...item, quantity: 1 }]);

  const removeFromCart = (id: string) =>
    setCart(prev => {
      const e = prev.find(i => i.id === id);
      return e?.quantity === 1 ? prev.filter(i => i.id !== id) : prev.map(i => i.id === id ? { ...i, quantity: i.quantity - 1 } : i);
    });

  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const categories = [...new Set(menu.map(i => i.category))];
  const filtered   = menu.filter(i => i.category === activeCategory);
  const pending    = participants.filter(p => p.status === 'pending');
  const approved   = participants.filter(p => p.status === 'approved');
  const isHost     = state === 'host_active';

  const submitOrder = async () => {
    if (!localData || !cart.length) return;
    const { data: order } = await supabase.from('orders').insert({
      customer_name: localData.name, table_info: `Mesa ${tableId}`,
      notes: notes || null, total: totalPrice, status: 'pending',
    }).select().single();
    if (order) {
      await supabase.from('order_items').insert(
        cart.map(i => ({ order_id: order.id, menu_item_id: i.id, name: i.name, price: i.price, quantity: i.quantity }))
      );
    }
    const lines = cart.map(i => `• ${i.name} x${i.quantity} — ${RESTAURANT.currency}${(i.price * i.quantity).toLocaleString()}`);
    const msg = [`🍽️ *${RESTAURANT.name}*`, `👤 ${localData.name}`, `📍 Mesa ${tableId}`, '', ...lines, '', `*Total: ${RESTAURANT.currency}${totalPrice.toLocaleString()}*`, notes ? `\n📝 ${notes}` : null].filter(Boolean).join('\n');
    window.open(`https://wa.me/${RESTAURANT.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');
    setCart([]); setNotes(''); setCartOpen(false);
  };

  // ── RENDERS DE ESTADO ─────────────────────────────────────────────────────

  if (state === 'loading') return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <p className="text-sm text-gray-400">Cargando…</p>
    </div>
  );

  if (state === 'open_form') return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <p className="mb-3 text-2xl">🍽️</p>
        <h1 className="mb-1 text-xl font-semibold text-gray-900">Mesa {tableId}</h1>
        <p className="mb-6 text-sm text-gray-400">Sos el primero. Abrí la mesa con tu nombre.</p>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Tu nombre</label>
            <input autoFocus type="text" placeholder="ej. María" value={name}
              onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && openTable()}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400" />
          </div>
          <button onClick={openTable} disabled={!name.trim() || formLoading}
            className="w-full rounded-xl bg-gray-900 py-3 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-40">
            {formLoading ? 'Abriendo…' : 'Abrir mesa →'}
          </button>
        </div>
      </div>
    </div>
  );

  if (state === 'join_form') return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <p className="mb-3 text-2xl">👋</p>
        <h1 className="mb-1 text-xl font-semibold text-gray-900">Mesa {tableId}</h1>
        <p className="mb-1 text-sm text-gray-400">Abierta por <span className="font-medium text-gray-700">{session?.host_name}</span></p>
        <p className="mb-6 text-sm text-gray-400">El host tiene que aceptarte para entrar.</p>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Tu nombre</label>
            <input autoFocus type="text" placeholder="ej. Juan" value={name}
              onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && joinTable()}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400" />
          </div>
          <button onClick={joinTable} disabled={!name.trim() || formLoading}
            className="w-full rounded-xl bg-gray-900 py-3 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-40">
            {formLoading ? 'Enviando solicitud…' : 'Pedir acceso →'}
          </button>
        </div>
      </div>
    </div>
  );

  if (state === 'waiting') return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mb-4 animate-pulse text-3xl">⏳</div>
        <h1 className="mb-2 text-lg font-semibold text-gray-900">Esperando acceso</h1>
        <p className="text-sm text-gray-400">
          <span className="font-medium text-gray-700">{session?.host_name}</span> tiene que aceptarte.
        </p>
        <button onClick={leaveTable} className="mt-6 text-xs text-gray-400 hover:text-gray-600 transition-colors">
          Cancelar y salir
        </button>
      </div>
    </div>
  );

  if (state === 'rejected') return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <p className="mb-4 text-3xl">🚫</p>
        <h1 className="mb-2 text-lg font-semibold text-gray-900">Sin acceso</h1>
        <p className="mb-6 text-sm text-gray-400">El host no te aceptó o te removió de la mesa.</p>
        <button onClick={leaveTable} className="w-full rounded-xl bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-700">
          Intentar de nuevo
        </button>
      </div>
    </div>
  );

  // ── VISTA PRINCIPAL (host o guest aprobado) ───────────────────────────────
  return (
    <div className="min-h-screen bg-white font-sans">

      {/* HEADER */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{RESTAURANT.name}</h1>
            <p className="text-xs text-gray-400">
              Mesa {tableId} · {isHost ? `Host: ${localData?.name}` : `Invitado: ${localData?.name}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isHost && (
              <button onClick={() => setGuestsOpen(true)}
                className="relative rounded-lg border border-gray-200 px-3 py-2 text-sm transition-colors hover:bg-gray-50">
                👥
                {pending.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                    {pending.length}
                  </span>
                )}
              </button>
            )}
            <button onClick={() => setCartOpen(true)}
              className="relative flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700">
              🛒
              {totalItems > 0 && (
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* CATEGORÍAS */}
      <div className="border-b border-gray-100">
        <div className="mx-auto max-w-2xl px-4">
          <div className="scrollbar-hide flex gap-1 overflow-x-auto py-3">
            {categories.map(cat => (
              <button key={cat} onClick={() => setActive(cat)}
                className={`whitespace-nowrap rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${activeCategory === cat ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MENÚ */}
      <main className="mx-auto max-w-2xl px-4 py-6">
        {menuLoading ? <p className="text-sm text-gray-400">Cargando menú…</p> : (
          <div className="space-y-2">
            {filtered.map(item => {
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
        )}
      </main>

      {/* CARRITO */}
      {cartOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
          <div className="absolute bottom-0 right-0 top-0 flex w-full max-w-sm flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h2 className="font-semibold text-gray-900">Tu pedido</h2>
              <button onClick={() => setCartOpen(false)} className="text-xl text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {cart.length === 0
                ? <p className="py-8 text-center text-sm text-gray-400">Todavía no agregaste nada</p>
                : cart.map(item => (
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
                ))
              }
            </div>
            <div className="space-y-3 border-t border-gray-200 p-5">
              {isHost ? (
                <>
                  <textarea placeholder="Notas: alergias, preferencias…" value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="h-16 w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400" />
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm font-medium text-gray-700">Total</span>
                    <span className="text-lg font-semibold text-gray-900">{RESTAURANT.currency}{totalPrice.toLocaleString()}</span>
                  </div>
                  <button onClick={submitOrder} disabled={!cart.length}
                    className="w-full rounded-xl bg-gray-900 py-3 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-40">
                    Enviar pedido por WhatsApp →
                  </button>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm font-medium text-gray-700">Total</span>
                    <span className="text-lg font-semibold text-gray-900">{RESTAURANT.currency}{totalPrice.toLocaleString()}</span>
                  </div>
                  <p className="rounded-lg bg-gray-50 px-3 py-2 text-center text-xs text-gray-500">
                    Solo el host puede confirmar el pedido
                  </p>
                </div>
              )}
              <button onClick={leaveTable} className="w-full text-center text-xs text-gray-400 hover:text-gray-600 transition-colors">
                Salir de la mesa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GESTIÓN DE GUESTS (solo host) */}
      {guestsOpen && isHost && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setGuestsOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Participantes</h2>
              <button onClick={() => setGuestsOpen(false)} className="text-xl text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {pending.length > 0 && (
              <div className="mb-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Solicitudes ({pending.length})</p>
                <div className="space-y-2">
                  {pending.map(p => (
                    <div key={p.id} className="flex items-center justify-between rounded-xl border border-yellow-200 bg-yellow-50 p-3">
                      <p className="text-sm font-medium text-gray-900">{p.guest_name}</p>
                      <div className="flex gap-2">
                        <button onClick={() => updateParticipant(p.id, 'rejected')}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                          Rechazar
                        </button>
                        <button onClick={() => updateParticipant(p.id, 'approved')}
                          className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700">
                          Aceptar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {approved.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">En la mesa ({approved.length})</p>
                <div className="space-y-2">
                  {approved.map(p => (
                    <div key={p.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3">
                      <p className="text-sm text-gray-700">{p.guest_name}</p>
                      <button onClick={() => updateParticipant(p.id, 'kicked')}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors">
                        Expulsar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!pending.length && !approved.length && (
              <p className="py-4 text-center text-sm text-gray-400">No hay invitados todavía</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
