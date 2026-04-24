import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type UserRole =
  | 'superadmin'
  | 'admin'
  | 'waiter'
  | 'kitchen'
  | 'customer_host'
  | 'customer_guest';

export interface Profile {
  id: string;
  role: UserRole;
  name: string | null;
  created_at: string;
}

export interface DBMenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  emoji: string | null;
  available: boolean;
  position: number;
}

export interface DBOrder {
  id: string;
  customer_name: string;
  table_info: string | null;
  notes: string | null;
  total: number;
  status: string;
  created_at: string;
}

export interface DBOrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
}

export const ORDER_STATUSES: Record<string, string> = {
  pending:   'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready:     'Listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

export const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  preparing: 'bg-orange-50 text-orange-700 border-orange-200',
  ready:     'bg-green-50 text-green-700 border-green-200',
  delivered: 'bg-gray-50 text-gray-500 border-gray-200',
  cancelled: 'bg-red-50 text-red-500 border-red-200',
};
