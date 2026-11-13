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
