import { createClient } from '@supabase/supabase-js';

const supabaseOrigin = new URL(import.meta.env.VITE_SUPABASE_URL).origin;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseOrigin, supabaseAnonKey);
