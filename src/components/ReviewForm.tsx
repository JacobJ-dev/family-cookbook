// ReviewForm plan. Lines marked [C] were filled in by Claude; the rest is the developer's.
//
// PROPS
//   recipeId: string
// FROM useAuth
//   const { profile } = useAuth(); profile.id is the user's id. Read it, don't copy it into state.
// STATE (only what this component owns)
//   rating: number (starts at 0 = "no stars picked yet")
//   comment: string (starts at '')
//   status: 'loading' | 'idle' | 'saving' | 'saved' | 'error' (starts at 'loading')
//     [C] 'idle' = loaded, user is editing
//   errorMessage: string | null (holds error.message to show the user)
// LOAD: useEffect with an ignore flag (same pattern as RecipeDetailPage)
//   [C] deps: [recipeId, profile?.id]. If there's no profile yet, return early.
//   query: reviews, select rating + comment, filter recipe_id = recipeId and user_id = profile.id, maybeSingle()
//   if a row came back: set rating; set comment only if it isn't null (otherwise the default '' stays)
//   if null came back: leave the defaults (this user hasn't reviewed it yet)
//   if error: set errorMessage, status 'error'
//   then: status 'idle'
// SAVE (when the button is clicked)
//   check first: rating between 1 and 5 (the UI keeps it <= 5; the DB check constraint is the real guard)
//   while saving: status 'saving', show "Saving…", and the button is disabled so a double click can't save twice
//   row sent: { recipe_id: recipeId, user_id: profile.id, rating, comment }
//   [C] onConflict: 'recipe_id,user_id'. Those columns decide "same review", so Postgres updates
//       the existing row instead of inserting (without it: unique violation 23505).
//   user_id: sent explicitly from profile. [C] Because the insert policy checks user_id = auth.uid(),
//       sending it shows that in the code, and onConflict needs both columns to match.
//   on success: status 'saved', show "Review saved!"
//   on error: status 'error', show "Error: " + errorMessage
// STAR CLICK
//   StarRating calls onChange(n) → my handler sets rating to n → ReviewForm re-renders → StarRating gets the new value
// PREDICTION (check in testing)
//   after saving twice: still one row. Upsert updates the existing row (it doesn't replace it),
//   so id and created_at stay the same, and updated_at changes.

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../auth/authContext";
import { supabase } from "../lib/supabase";
import StarRating from "./StarRating";

type ReviewProps = {
    recipeId: string;
    // Optional: called after a successful save, so the page can refresh the review list.
    onSaved?: () => void;
}

function ReviewForm({recipeId, onSaved}: ReviewProps){
    const { profile } = useAuth();
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [status, setStatus] = useState<'loading' | 'saving' | 'saved' | 'error' | 'idle'>('loading');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        const id = profile?.id;
        if(!id) return;
        let ignore = false;

        supabase.from('reviews')
        .select('rating, comment')
        .eq('recipe_id', recipeId)
        .eq('user_id', id)
        .maybeSingle()
        .then(({data, error}) => {
            if (ignore) return;
            if (error) {
                setErrorMessage(error.message);
                setStatus('error');
                return;
            }

            if (data) {
                setRating(data.rating);
                if(data.comment != null){
                    setComment(data.comment);
                }
            }
            setStatus('idle');
        });

        return () => { ignore = true};
    }, [recipeId, profile?.id]);

    async function saveReview(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if(!profile){
            return;
        }

        if(rating < 1 || rating > 5){
            setErrorMessage('Please enter a rating.');
            setStatus('error');
            return;
        }

        setStatus('saving');

        const { error } = await supabase.from('reviews')
        .upsert({recipe_id: recipeId, user_id: profile.id, rating: rating, comment: comment},
            { onConflict: 'recipe_id,user_id'});

        if(error) {
            setErrorMessage(error.message);
            setStatus('error');
            return;
        }

        setStatus('saved');
        onSaved?.();
    }

    if (status === 'loading') return <p> Loading...</p>;

    return (
        <div>
            <h3>Review</h3>

            <form className="review-form" onSubmit={saveReview}>
                <p>Rating</p>
                <StarRating value={rating} onChange={setRating} />

                <label>
                    Comment:
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                    />
                </label>

                {status === 'error' && <p role="alert">{errorMessage}</p>}
                {status === 'saved' && <p>Review Saved!</p>}

                <div className="form-actions">
                    <button type="submit" className="button" disabled={status === 'saving'}>
                        {status === 'saving' ? 'Saving...' : 'Save review'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default ReviewForm;
