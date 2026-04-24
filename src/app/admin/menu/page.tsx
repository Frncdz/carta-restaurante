'use client';

import { useEffect, useState } from 'react';
import { supabase, type DBMenuItem } from '@/lib/supabase';

const EMOJI_FALLBACK: Record<string, string> = {
  Entradas: '🍽️', Principales: '🍖', Postres: '🍮', Bebidas: '🥤',
};

export default function AdminMenu() {
  const [items, setItems] = useState<DBMenuItem[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from('menu_items').select('*').order('category').order('position');
    if (data) setItems(data);
  }

  useEffect(() => { load(); }, []);

  async function toggleAvailable(item: DBMenuItem) {
    setSaving(item.id);
    await supabase.from('menu_items').update({ available: !item.available }).eq('id', item.id);
    await load();
    setSaving(null);
  }

  async function updatePrice(id: string, price: number) {
    await supabase.from('menu_items').update({ price }).eq('id', id);
    await load();
  }

  const categories = [...new Set(items.map(i => i.category))];

  return (
    <div className="p-8">
      <h1 className="mb-6 text-xl font-semibold text-gray-900">Gestión de Menú</h1>

      {categories.map(cat => (
        <div key={cat} className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">{cat}</h2>
          <div className="space-y-2 max-w-2xl">
            {items.filter(i => i.category === cat).map(item => (
              <div
                key={item.id}
                className={`flex items-center gap-4 rounded-xl border p-4 transition-opacity ${item.available ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}
              >
                <span className="text-xl">{item.emoji ?? EMOJI_FALLBACK[item.category] ?? '🍽️'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.description}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400">$</span>
                    <input
                      type="number"
                      defaultValue={item.price}
                      onBlur={e => updatePrice(item.id, Number(e.target.value))}
                      className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-sm outline-none focus:border-gray-400"
                    />
                  </div>
                  <button
                    onClick={() => toggleAvailable(item)}
                    disabled={saving === item.id}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      item.available
                        ? 'bg-gray-900 text-white hover:bg-gray-700'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    {item.available ? 'Activo' : 'Oculto'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
