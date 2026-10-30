import { Link } from "react-router";
import type { Tables } from "../lib/database.types";
import { supabase } from "../lib/supabase";
import { useState, useEffect } from "react";
import { useAuth } from '../auth/authContext';

type RecipeSummary = Pick<Tables<'recipes'>, 'id' | 'title' | 'description' | 'category'>;

function RecipeListPage() {
    const [recipes, setRecipes] = useState<RecipeSummary[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { profile } = useAuth();
    const isEditor = profile?.role === 'editor';

    useEffect(() => {
        let ignore = false;
        supabase.from('recipes')
        .select('id, title, description, category')
        .order('title')
        .then(({ data, error}) => {
            if (ignore) return;
            if (error) setError(error.message);
            else setRecipes(data);
        });
        return () => { ignore = true };
    }, []);

    if (error) return <p>Error: {error}</p>;
    if (recipes === null) return <p>Loading...</p>;
    return (
        <div className="container">
            <h1>Recipes</h1>
            {isEditor && <Link to="/recipes/new" className="button">New recipe</Link>}
            {recipes.length === 0 && <p>No recipes yet. Coming Soon!</p>}

            <ul>
                {recipes.map((recipe) => (
                    <li key={recipe.id}>
                        <Link to={`/recipes/${recipe.id}`}>{recipe.title}</Link>
                        {recipe.category && <p>{recipe.category}</p>}
                        {recipe.description && <p>{recipe.description}</p>}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default RecipeListPage;