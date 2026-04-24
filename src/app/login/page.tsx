'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, type UserRole } from '@/lib/supabase';

const ROLE_REDIRECTS: Record<UserRole, string> = {
  superadmin:     '/superadmin',
  admin:          '/admin',
  waiter:         '/waiter',
  kitchen:        '/kitchen',
  customer_host:  '/table',
  customer_guest: '/table',
};

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError('Email o contraseña incorrectos');
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .single();

    const dest = ROLE_REDIRECTS[profile?.role as UserRole] ?? '/unauthorized';
    router.replace(dest);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-gray-900">Iniciar sesión</h1>
        <p className="mb-6 text-sm text-gray-400">Accedé a tu panel según tu rol</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition-colors focus:border-gray-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Contraseña</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition-colors focus:border-gray-400"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gray-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-40"
          >
            {loading ? 'Ingresando…' : 'Ingresar →'}
          </button>
        </form>
      </div>
    </div>
  );
}
