import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { AuthContext, type Profile } from './authContext';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [sessionChecked, setSessionChecked] = useState(false);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [profileLoadedFor, setProfileLoadedFor] = useState<string | null>(null);

    // Effect 1: follow the session.
    // onAuthStateChange fires once immediately with the current session
    // (restored from the browser), then again on every sign-in / sign-out.
    // It also handles the magic link: when you land back on the site with a
    // token in the URL, supabase-js exchanges it and fires SIGNED_IN.
    useEffect(() => {
        const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
            // Keep this callback synchronous: Supabase warns that awaiting other
            // supabase calls in here can deadlock. Effect 2 does the fetching.
            setSession(newSession);
            setSessionChecked(true);
        });
        // Cleanup: stop listening when the provider unmounts.
        return () => data.subscription.unsubscribe();
    }, []);

    // Effect 2: whenever the signed-in user changes, load their profile row.
    // RLS allows it because we're signed in ("Signed-in users can read profiles").
    const userId = session?.user.id ?? null;
    useEffect(() => {
        if (!userId) return;
        // If the user changes before the request finishes, ignore the stale answer.
        let ignore = false;
        supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()
            .then(({ data, error }) => {
                if (ignore) return;
                if (error) console.error('Could not load profile:', error.message);
                setProfile(data);
                setProfileLoadedFor(userId);
            });
        return () => {
            ignore = true;
        }
    }, [userId]);

    const value = {
        session,
        // Only hand out a profile that belongs to the current user. After sign-out
        // the old one is still in state for a moment, but this hides it.
        profile: userId && profile?.id === userId ? profile : null,
        // Loading until the session is known and, if signed in, their profile fetch finished.
        loading: !sessionChecked || (userId !== null && profileLoadedFor !== userId),
        signOut: async () => {
            // Clears the stored session; onAuthStateChange then fires with null.
            await supabase.auth.signOut();
        },
    };

    return <AuthContext value={value}>{children}</AuthContext>;
}
