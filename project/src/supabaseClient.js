import { createClient } from '@supabase/supabase-js';

// Supabase-URL und Public Anon Key werden über Vite-Umgebungsvariablen bereitgestellt
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
