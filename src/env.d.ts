// Tells TypeScript about our custom globals. A .d.ts file contains only types:
// it produces no JavaScript.

// The variables we read from .env.local (Vite only exposes ones prefixed VITE_).
interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
}

// Dev-only handle for testing queries in the browser console (see src/lib/supabase.ts).
interface Window {
    supabase?: import('@supabase/supabase-js').SupabaseClient<import('./lib/database.types').Database>;
}
