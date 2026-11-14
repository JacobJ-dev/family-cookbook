import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { Tables } from '../lib/database.types';
import { supabase } from '../lib/supabase';

// STATE: sort column (starts as Recipe title) and direction (starts A–Z / ascending).
//        rows stays exactly as loaded; sorting never changes it.
// EVENTS: When she clicks a header:
//   - same column as now → flip the direction
//   - different column → set the column; numbers start highest first, Recipe starts A–Z
// RENDER: Make a sorted copy with rows.toSorted(...) and keep it in a plain variable
//         (sortedRows), not state, so no setRows and no render loop.
//   - unrated (null average) always goes to the bottom, whatever the direction
//   - numbers: compare with subtraction (b - a for highest first)
//   - titles: compare with localeCompare
//   The table's .map uses sortedRows instead of rows.
// PREDICTIONS: Favourites clicked → most favourites (Pot Roast) at the top; ties keep A–Z order.
//   Favourites again → order flips, Pot Roast at the bottom.
//   Reviews clicked → most reviews (Pot Roast) at the top.

// One row of the recipe_stats view. The generated type marks every column
// as nullable, because Postgres doesn't track which view columns can't be
// null. So the table below still has to handle null for each one.
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
        if(sortColumn === header) {
            setIsAscending((prev) => !prev);
            return;
        }
        setSortColumn(header);
        setIsAscending(true);
    }

    if (error) return <p>Error loading stats: {error}</p>;
    if (rows === null) return <p>Loading...</p>;

    return (
        <div className="container">
            <h1>Statistics</h1>
            {rows.length === 0 && <p>No recipes yet.</p>}
            <p>{sortColumn} {isAscending ? '▲' : '▼'}</p>

            <table className="stats-table">
                <thead>
                    <tr>
                        <th><button type="button" onClick={() => setColumn('title')}>Recipe</button></th>
                        <th><button type="button" onClick={() => setColumn('avg_rating')}>Average rating</button></th>
                        <th><button type="button" onClick={() => setColumn('review_count')}>Reviews</button></th>
                        <th><button type="button" onClick={() => setColumn('favorite_count')}>Favourites</button></th>
                        <th><button type="button" onClick={() => setColumn('want_to_try_count')}>Want to try</button></th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
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
