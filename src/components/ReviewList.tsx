import { useEffect, useState } from 'react';
import type { Tables } from '../lib/database.types';
import { supabase } from '../lib/supabase';
import StarRating from './StarRating';

// One review as this query returns it: a few columns from `reviews`, plus the
// reviewer's name pulled in from `profiles` (see the select below).
type ReviewRow = Pick<Tables<'reviews'>, 'id' | 'rating' | 'comment' | 'updated_at'> & {
    profiles: { display_name: string } | null;
};

type ReviewListProps = {
    recipeId: string;
    // A number the parent bumps after a save. It's in the effect's deps,
    // so a new number means "fetch the list again".
    refreshKey: number;
};

export default function ReviewList({ recipeId, refreshKey }: ReviewListProps) {
    // null = not loaded yet, [] = loaded and there are no reviews.
    const [reviews, setReviews] = useState<ReviewRow[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let ignore = false;

        supabase.from('reviews')
            // `profiles(display_name)` is a join: reviews.user_id is a foreign key
            // to profiles.id, so Supabase can fetch the matching profile row and
            // nest it under `profiles` on each review.
            .select('id, rating, comment, updated_at, profiles(display_name)')
            .eq('recipe_id', recipeId)
            .order('updated_at', { ascending: false })
            .then(({ data, error }) => {
                if (ignore) return;
                if (error) {
                    setError(error.message);
                    return;
                }
                setReviews(data);
            });

        return () => { ignore = true; };
    }, [recipeId, refreshKey]);

    if (error) return <p>Error loading reviews: {error}</p>;
    if (reviews === null) return <p>Loading reviews...</p>;
    if (reviews.length === 0) return <p>No reviews yet.</p>;

    return (
        <ul className="review-list">
            {reviews.map((review) => (
                <li key={review.id}>
                    <strong>{review.profiles?.display_name ?? 'Someone'}</strong>
                    {/* No onChange, so StarRating shows display-only stars. */}
                    <StarRating value={review.rating} />
                    {review.comment && <p>{review.comment}</p>}
                    <small>{new Date(review.updated_at).toLocaleDateString()}</small>
                </li>
            ))}
        </ul>
    );
}
