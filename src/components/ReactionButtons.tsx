import { useEffect, useState } from 'react';
import { useAuth } from '../auth/authContext';
import { supabase } from '../lib/supabase';

// The database only knows `kind` as text (a check constraint, not an enum), so
// the generated types say `string`. This union lets TypeScript catch typos.
type Kind = 'favorite' | 'want_to_try';

// What users see. UI text uses British spelling ("Favourite"); the database value stays 'favorite'.
const LABELS: Record<Kind, string> = {
    favorite: 'Favourite',
    want_to_try: 'Want to try',
};

type ReactionButtonsProps = {
    recipeId: string;
};

export default function ReactionButtons({ recipeId }: ReactionButtonsProps) {
    const { profile } = useAuth();
    // Which reactions this user has on this recipe. null = not loaded yet.
    const [mine, setMine] = useState<Kind[] | null>(null);
    // The button whose click is waiting for the database (disabled meanwhile).
    const [busy, setBusy] = useState<Kind | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Load this user's reactions: 0, 1 or 2 rows, one per kind.
    useEffect(() => {
        const userId = profile?.id;
        if (!userId) return;
        let ignore = false;

        supabase.from('reactions')
            .select('kind')
            .eq('recipe_id', recipeId)
            .eq('user_id', userId)
            .then(({ data, error }) => {
                if (ignore) return;
                if (error) {
                    setError(error.message);
                    return;
                }
                // [{ kind: 'favorite' }] → ['favorite']
                setMine(data.map((row) => row.kind as Kind));
            });

        return () => { ignore = true; };
    }, [recipeId, profile?.id]);

    // A reaction is a row that exists or doesn't. There's nothing to update,
    // so "on" is an insert and "off" is a delete (the table has no update policy).
    async function toggle(kind: Kind) {
        if (!profile || mine === null) return;
        const isOn = mine.includes(kind);
        setBusy(kind);
        setError(null);

        const { error } = isOn
            ? await supabase.from('reactions')
                .delete()
                .eq('recipe_id', recipeId)
                .eq('user_id', profile.id)
                .eq('kind', kind)
            : await supabase.from('reactions')
                .insert({ recipe_id: recipeId, user_id: profile.id, kind });

        setBusy(null);
        if (error) {
            setError(error.message);
            return;
        }
        // Only change the screen once the database agreed:
        // off → remove it from the list (filter), on → add it ([...a, x]).
        setMine((prev) => {
            if (prev === null) return prev;
            return isOn ? prev.filter((k) => k !== kind) : [...prev, kind];
        });
    }

    if (mine === null && !error) return null;

    return (
        <div className="reaction-buttons">
            {(Object.keys(LABELS) as Kind[]).map((kind) => {
                const isOn = mine?.includes(kind) ?? false;
                return (
                    <button
                        type="button"
                        key={kind}
                        // aria-pressed marks a toggle's on/off state; the CSS uses it too.
                        aria-pressed={isOn}
                        disabled={busy !== null || mine === null}
                        onClick={() => toggle(kind)}
                    >
                        {isOn ? '✓ ' : ''}{LABELS[kind]}
                    </button>
                );
            })}
            {error && <p role="alert">Error: {error}</p>}
        </div>
    );
}
