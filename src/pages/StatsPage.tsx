import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { Tables } from '../lib/database.types';
import { supabase } from '../lib/supabase';

type StatsRow = Tables<'recipe_stats'>;

export default function StatsPage() {
    // null = not loaded yet, [] = loaded and there are no recipes.
    const [rows, setRows] = useState<StatsRow[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [sortColumn, setSortColumn] = useState<keyof StatsRow>('title');
    const [isAscending, setIsAscending] = useState(true);

    useEffect(() => {
        let ignore = false;

        supabase.from('recipe_stats')
            .select('*')
            .order('title')
            .then(({ data, error }) => {
                if (ignore) return;
                if (error) {
                    setError(error.message);
                    return;
                }
                setRows(data);
            });

        return () => { ignore = true; };
    }, []);

    function setColumn(header: keyof StatsRow) {
        if (sortColumn === header) {
            setIsAscending((prev) => !prev);
            return;
        }
        setSortColumn(header);
        if (header === 'title') {
            setIsAscending(true);
            return;
        }

        setIsAscending(false);
    }

    function displayColumnInfo(header: keyof StatsRow): string{
        if (sortColumn === header) {
            return isAscending ? '▲' : '▼';
        }
        return "";
    }

    if (error) return <p>Error loading stats: {error}</p>;
    if (rows === null) return <p>Loading...</p>;

    const sortedRows = rows.toSorted((a, b) => {
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];

        // Unrated rows return early, so the direction flip never moves them to the top.
        if (aValue === null && bValue !== null) return 1;
        if (aValue !== null && bValue === null) return -1;
        if (aValue === null && bValue === null) return 0;

        let compareValue = 0;

        if (typeof aValue === 'string' && typeof bValue === 'string'){
            compareValue = aValue.localeCompare(bValue);
        }

        if (typeof aValue === 'number' && typeof bValue === 'number'){
            compareValue = aValue - bValue;
        }

        compareValue = isAscending ? compareValue : -compareValue;

        return compareValue;
    });

    return (
        <div className="container">
            <h1>Statistics</h1>
            {rows.length === 0 && <p>No recipes yet.</p>}

            <table className="stats-table">
                <thead>
                    <tr>
                        <th><button type="button" onClick={() => setColumn('title')}>Recipe {displayColumnInfo('title')}</button></th>
                        <th><button type="button" onClick={() => setColumn('avg_rating')}>Average rating {displayColumnInfo('avg_rating')}</button></th>
                        <th><button type="button" onClick={() => setColumn('review_count')}>Reviews {displayColumnInfo('review_count')}</button></th>
                        <th><button type="button" onClick={() => setColumn('favorite_count')}>Favourites {displayColumnInfo('favorite_count')}</button></th>
                        <th><button type="button" onClick={() => setColumn('want_to_try_count')}>Want to try {displayColumnInfo('want_to_try_count')}</button></th>
                    </tr>
                </thead>
                <tbody>
                    {sortedRows.map((row) => (
                        <tr key={row.recipe_id}>
                            <td><Link to={`/recipes/${row.recipe_id}`}>{row.title}</Link></td>
                            {/* No reviews yet: show a dash, not 0, because nobody rated it 0. */}
                            <td>{row.avg_rating ?? '–'}</td>
                            <td>{row.review_count ?? 0}</td>
                            <td>{row.favorite_count ?? 0}</td>
                            <td>{row.want_to_try_count ?? 0}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
