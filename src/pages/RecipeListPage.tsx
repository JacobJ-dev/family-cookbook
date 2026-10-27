import { Link } from "react-router";
import type { Tables } from "../lib/database.types";
import { supabase } from "../lib/supabase";
import { useState, useEffect } from "react";

type RecipeSummary = Pick<Tables<'recipes'>, 'id' | 'title' | 'description' | 'category'>;

function RecipeListPage() {
    const [recipes, setRecipes] = useState<RecipeSummary[] | null>(null);
    const [error, setError] = useState<string | null>(null);

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
    if (recipes.length === 0) return <p>No recipes yet. Coming Soon!</p>;
    return (
        <div className="container">
            <h1>Recipes</h1>

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