import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
