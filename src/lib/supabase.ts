import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Vite replaces import.meta.env.* with the values from .env.local at build time.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Fail loudly at startup instead of with confusing network errors later.
if (!url || !key) {
    throw new Error(
        'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local and fill them in.',
    );
}

// One shared client for the whole app. It stores the signed-in session in the
// browser and attaches the user's token to every request, which is how
// auth.uid() in our RLS policies knows who is asking.
// <Database> makes every query typed from our schema.
export const supabase = createClient<Database>(url, key);

// Only under `npm run dev`: lets us run test queries from the DevTools console.
// Vite removes this block from production builds.
if (import.meta.env.DEV) {
    window.supabase = supabase;
}
