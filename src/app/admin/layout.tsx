'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { RoleGuard } from '@/components/RoleGuard';
import { supabase } from '@/lib/supabase';

const NAV = [
  { label: 'Dashboard', href: '/admin',         icon: '📊' },
  { label: 'Mesas',     href: '/admin/tables',   icon: '🪑' },
  { label: 'Pedidos',   href: '/admin/orders',   icon: '📋' },
  { label: 'Menú',      href: '/admin/menu',     icon: '🍽️' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="flex min-h-screen bg-gray-50">
        <aside className="flex w-52 shrink-0 flex-col border-r border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-5">
            <p className="text-sm font-semibold text-gray-900">Panel Admin</p>
          </div>
          <nav className="flex-1 space-y-1 p-3">
            {NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  pathname === item.href
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
          <div className="border-t border-gray-100 p-3">
            <button
              onClick={handleSignOut}
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              Cerrar sesión
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </RoleGuard>
  );
}
