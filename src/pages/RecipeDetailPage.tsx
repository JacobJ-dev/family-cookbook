import { Link, useParams } from "react-router";
import type { Tables } from "../lib/database.types";
import { supabase } from "../lib/supabase";
import { useEffect, useState } from "react";

function RecipeDetailPage() {
    const { id } = useParams();
    const [recipe, setRecipe] = useState<Tables<'recipes'> | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loadingDone, setLoadingDone] = useState(false);

    useEffect(() => {
        if(!id) return;
        let ignore = false;        
        supabase.from('recipes')
        .select('*')
        .eq('id', id)
        .maybeSingle()
        .then(({data, error}) => {
            if (ignore) return;
            if (error) setError(error.message);
            else{
                setRecipe(data);
                setLoadingDone(true);
            } 
        });
        
        return () => { ignore = true};
    }, [id]);

    if (error) return <p>Error: {error}</p>;
    if (!loadingDone) return <p>Loading...</p>;
    if (recipe === null) return <p>No recipe found for: {id}</p>;

    return (
        <div className="container">
            <h1> {recipe.title} </h1>           
            {recipe.description && <p>{recipe.description}</p>}
            {recipe.story && <p>{recipe.story}</p>}

            <h3> The recipe </h3>            
            {recipe.category && <p>{recipe.category}</p>}
            {recipe.servings !== null && <p>Servings: {recipe.servings}</p>}
            {recipe.prep_minutes !== null && <p>Prep Minutes: {recipe.prep_minutes}</p>}
            {recipe.cook_minutes !== null && <p>Cook Minutes: {recipe.cook_minutes}</p>}

            <h3>Ingredients</h3>
            <ul>
                {recipe.ingredients.map((ingredient, idx) => (
                    <li key={idx}>{ingredient}</li>
                ))}
            </ul>

            <h3>Steps</h3>
            <ol>
                {recipe.steps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                ))}
            </ol>
            <Link to="/">Return back to Recipe List</Link>
        </div>
        
    );
}

export default RecipeDetailPage;