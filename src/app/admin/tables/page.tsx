'use client';

import { useEffect, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '@/lib/supabase';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://carta-restaurante-sigma.vercel.app';

interface Table {
  id: string;
  number: number;
  label: string | null;
  active: boolean;
}

function QRModal({ table, onClose }: { table: Table; onClose: () => void }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const url = `${BASE_URL}/table/${table.number}`;

  const download = () => {
    const canvas = canvasRef.current?.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `mesa-${table.number}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xs rounded-2xl bg-white p-8 text-center shadow-2xl">
        <h2 className="mb-1 font-semibold text-gray-900">
          {table.label ?? `Mesa ${table.number}`}
        </h2>
        <p className="mb-5 text-xs text-gray-400">{url}</p>

        <div ref={canvasRef} className="flex justify-center mb-5">
          <QRCodeCanvas
            value={url}
            size={180}
            bgColor="#ffffff"
            fgColor="#111111"
            level="M"
            includeMargin
          />
        </div>

        <div className="space-y-2">
          <button
            onClick={download}
            className="w-full rounded-xl bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
          >
            Descargar PNG
          </button>
          <button
            onClick={onClose}
            className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminTables() {
  const [tables, setTables]         = useState<Table[]>([]);
  const [loading, setLoading]       = useState(true);
  const [label, setLabel]           = useState('');
  const [creating, setCreating]     = useState(false);
  const [selectedTable, setSelected] = useState<Table | null>(null);

  async function load() {
    const { data } = await supabase.from('tables').select('*').order('number');
    if (data) setTables(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createTable() {
    setCreating(true);
    const nextNumber = tables.length > 0 ? Math.max(...tables.map(t => t.number)) + 1 : 1;
    await supabase.from('tables').insert({
      number: nextNumber,
      label:  label.trim() || null,
      active: true,
    });
    setLabel('');
    await load();
    setCreating(false);
  }

  async function toggleActive(table: Table) {
    await supabase.from('tables').update({ active: !table.active }).eq('id', table.id);
    await load();
  }

  async function deleteTable(id: string) {
    await supabase.from('tables').delete().eq('id', id);
    await load();
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 text-xl font-semibold text-gray-900">Mesas</h1>

      {/* Crear nueva mesa */}
      <div className="mb-8 flex items-end gap-3 max-w-md">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Nombre opcional (ej. Terraza, VIP)
          </label>
          <input
            type="text"
            placeholder={`Mesa ${tables.length + 1}`}
            value={label}
            onChange={e => setLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createTable()}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"
          />
        </div>
        <button
          onClick={createTable}
          disabled={creating}
          className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-40 transition-colors"
        >
          {creating ? '…' : '+ Agregar'}
        </button>
      </div>

      {/* Lista de mesas */}
      {loading ? (
        <p className="text-sm text-gray-400">Cargando…</p>
      ) : tables.length === 0 ? (
        <p className="text-sm text-gray-400">No hay mesas todavía. Creá la primera.</p>
      ) : (
        <div className="space-y-2 max-w-xl">
          {tables.map(table => (
            <div
              key={table.id}
              className={`flex items-center justify-between rounded-xl border p-4 transition-opacity ${
                table.active ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'
              }`}
            >
              <div>
                <p className="font-medium text-gray-900 text-sm">
                  Mesa {table.number}
                  {table.label && <span className="ml-2 text-gray-400">· {table.label}</span>}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 font-mono">{table.id}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setSelected(table)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Ver QR
                </button>
                <button
                  onClick={() => toggleActive(table)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    table.active
                      ? 'bg-gray-900 text-white hover:bg-gray-700'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {table.active ? 'Activa' : 'Inactiva'}
                </button>
                <button
                  onClick={() => deleteTable(table.id)}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors px-1"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedTable && (
        <QRModal table={selectedTable} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
