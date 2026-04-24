'use client';

import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function UnauthorizedPage() {
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <p className="text-3xl mb-4">🚫</p>
        <h1 className="text-lg font-semibold text-gray-900 mb-2">Acceso denegado</h1>
        <p className="text-sm text-gray-400 mb-6">No tenés permiso para ver esta sección.</p>
        <button
          onClick={handleSignOut}
          className="w-full rounded-xl bg-gray-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700"
        >
          Volver al login
        </button>
      </div>
    </div>
  );
}
