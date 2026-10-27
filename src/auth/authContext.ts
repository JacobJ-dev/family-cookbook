import { createContext, useContext } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Database } from '../lib/database.types';

// A row from the profiles table, straight from the generated types.
export type Profile = Database['public']['Tables']['profiles']['Row'];

// Everything a component can ask about the current user.
export type AuthState = {
    session: Session | null; // null = signed out
    profile: Profile | null; // their display_name and role
    loading: boolean; // true until we know who (if anyone) is signed in
    signOut: () => Promise<void>;
};

// Context is React's way to share a value with every component below a
// provider, without passing it as a prop through each level.
export const AuthContext = createContext<AuthState | null>(null);

// The hook components use: const { profile } = useAuth()
export function useAuth(): AuthState {
    const auth = useContext(AuthContext);
    if (!auth) {
        // Only happens if a component is rendered outside <AuthProvider>.
        throw new Error('useAuth must be used inside <AuthProvider>');
    }
    return auth;
}
