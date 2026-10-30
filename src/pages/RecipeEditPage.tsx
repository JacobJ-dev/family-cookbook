import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import type { Tables, TablesInsert } from '../lib/database.types';
import { supabase } from '../lib/supabase';

type Ingredient = {
    text: string;
    id: string;
};

// What the form holds while she types. Inputs always give us strings, even
// for numbers, and an empty box is '' (never null), so every text and number
// field is a string here. toForm/toRow convert to and from the database row.
type RecipeForm = {
    title: string;
    description: string;
    story: string;
    category: string;
    servings: string;
    prep_minutes: string;
    cook_minutes: string;
    ingredients: Ingredient[];
    steps: string[];
};

// The fields edited with a plain input or textarea (everything but the lists).
type TextField = Exclude<keyof RecipeForm, 'ingredients' | 'steps'>;

const emptyForm: RecipeForm = {
    title: '',
    description: '',
    story: '',
    category: '',
    servings: '',
    prep_minutes: '',
    cook_minutes: '',
    ingredients: [],
    steps: [],
};

function createIngredient(ingredientText : string): Ingredient {
    return {
        id: crypto.randomUUID(),
        text: ingredientText,
    };
}

// Database row → form: null becomes '' and numbers become text.
function toForm(recipe: Tables<'recipes'>): RecipeForm {
    return {
        title: recipe.title,
        description: recipe.description ?? '',
        story: recipe.story ?? '',
        category: recipe.category ?? '',
        servings: recipe.servings?.toString() ?? '',
        prep_minutes: recipe.prep_minutes?.toString() ?? '',
        cook_minutes: recipe.cook_minutes?.toString() ?? '',
        ingredients: recipe.ingredients.map((createIngredient)),
        steps: recipe.steps,
    };
}

// Form → what we send to the database. Blank boxes save as null, not '' or 0,
// so "not filled in" stays different from "0 minutes".
function toRow(form: RecipeForm): TablesInsert<'recipes'> {
    return {
        title: form.title.trim(),
        description: textOrNull(form.description),
        story: textOrNull(form.story),
        category: textOrNull(form.category),
        servings: numberOrNull(form.servings),
        prep_minutes: numberOrNull(form.prep_minutes),
        cook_minutes: numberOrNull(form.cook_minutes),
        ingredients: ingredientsToList(form.ingredients),
        steps: form.steps,
    };
}

function textOrNull(text: string): string | null {
    const trimmed = text.trim();
    return trimmed === '' ? null : trimmed;
}

function numberOrNull(text: string): number | null {
    return text.trim() === '' ? null : Number(text);
}

function ingredientsToList(ingredientList: Ingredient[]): string[] {
    const ingredients: string[] = ingredientList.map((ingredient) => {
        return ingredient.text;
    });
    return ingredients;
}


// One page for both routes: /recipes/new has no :id, /recipes/:id/edit does.
function RecipeEditPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [form, setForm] = useState<RecipeForm>(emptyForm);
    // Only an existing recipe has to load first; a new one starts empty.
    const [loading, setLoading] = useState(id !== undefined);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Edit mode: load the recipe and fill the form with it.
    useEffect(() => {
        if (!id) return;
        let ignore = false;
        supabase.from('recipes')
            .select('*')
            .eq('id', id)
            .maybeSingle()
            .then(({ data, error }) => {
                if (ignore) return;
                if (error) setLoadError(error.message);
                else if (data === null) setLoadError('This recipe could not be found.');
                else setForm(toForm(data));
                setLoading(false);
            });
        return () => { ignore = true; };
    }, [id]);

    // Copy the form and change one field. The (prev) => ... form always starts
    // from the latest state, even if React hasn't re-rendered yet.
    function setField(field: TextField, value: string) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    function setIngredient(id: string, value: string) {
        setForm((prev) => ({
             ...prev, 
             ingredients: prev.ingredients.map((ingredient) =>
                ingredient.id === id ? { ...ingredient, text: value } : ingredient 
            ),
        }));
    }

    function addIngredient() {
        const newIngredient = createIngredient("");
        setForm((prev) => ({
            ...prev,
            ingredients: [...prev.ingredients, newIngredient],
        }));
    }

    function removeIngredient(removedId: string) {
        setForm((prev) => ({
            ...prev,
            ingredients: prev.ingredients.filter((ingredient) =>
                ingredient.id !== removedId
            ),
        }));
    }




    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        // Without this the browser does its own old-style submit: a full page
        // reload that throws away our React state.
        event.preventDefault();

        const title = form.title.trim();
        if(title === ''){
            setSaveError('Please give the recipe a title.');
            return;
        }
        setSaving(true);
        setSaveError(null);

        const row = toRow(form);
        // .select('id').single() asks for the saved row back. For an insert
        // that's how we learn the new id. For an update it also catches the
        // silent RLS case: zero rows updated makes .single() return an error.
        const { data, error } = id
            ? await supabase.from('recipes').update(row).eq('id', id).select('id').single()
            : await supabase.from('recipes').insert(row).select('id').single();

        if (error) {
            setSaveError(`Could not save the recipe: ${error.message}`);
            setSaving(false);
            return;
        }
        // Back to the recipe, so she sees her change right away.
        navigate(`/recipes/${data.id}`);
    }

    if (loading) return <p>Loading…</p>;
    if (loadError) return <p>Error: {loadError}</p>;

    return (
        <div className="container">
            <h1>{id ? 'Edit recipe' : 'New recipe'}</h1>

            {/* Wrapping each input in its <label> links the two: clicking the
                text focuses the box, and screen readers announce the label. */}
            <form className="recipe-form" onSubmit={handleSubmit}>
                <label>
                    Title
                    <input
                        value={form.title}
                        onChange={(e) => setField('title', e.target.value)}
                        required
                        maxLength={200}
                    />
                </label>

                <label>
                    Short description
                    <input
                        value={form.description}
                        onChange={(e) => setField('description', e.target.value)}
                    />
                </label>

                <label>
                    The story behind it
                    <textarea
                        value={form.story}
                        onChange={(e) => setField('story', e.target.value)}
                        rows={4}
                    />
                </label>

                <label>
                    Category
                    <input
                        value={form.category}
                        onChange={(e) => setField('category', e.target.value)}
                        placeholder="e.g. Mains, Desserts"
                    />
                </label>

                {/* type="number" + min/step: the browser blocks negatives and
                    decimals before we submit. The database checks it again. */}
                <div className="form-row">
                    <label>
                        Servings
                        <input
                            type="number"
                            min={1}
                            step={1}
                            value={form.servings}
                            onChange={(e) => setField('servings', e.target.value)}
                        />
                    </label>
                    <label>
                        Prep minutes
                        <input
                            type="number"
                            min={0}
                            step={1}
                            value={form.prep_minutes}
                            onChange={(e) => setField('prep_minutes', e.target.value)}
                        />
                    </label>
                    <label>
                        Cook minutes
                        <input
                            type="number"
                            min={0}
                            step={1}
                            value={form.cook_minutes}
                            onChange={(e) => setField('cook_minutes', e.target.value)}
                        />
                    </label>
                </div>

                <h3>Ingredients</h3>
                <ul>
                    {form.ingredients.map((ingredient) => (
                        <li key={ingredient.id}>
                            <input
                                value={ingredient.text}
                                onChange={(e) => setIngredient(ingredient.id, e.target.value)}
                            />
                            <button type="button" onClick={() => removeIngredient(ingredient.id)}>X</button>
                            <button type="button"> Move up</button>
                        </li>
                    ))}
                </ul>
                <button type="button" onClick={addIngredient}>Add new ingredient</button>

                <h3>Steps</h3>
                <ol>
                    {form.steps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                    ))}
                </ol>

                {saveError && <p role="alert">{saveError}</p>}

                <div className="form-actions">
                    <button type="submit" className="button" disabled={saving}>
                        {saving ? 'Saving…' : 'Save recipe'}
                    </button>
                    <Link to={id ? `/recipes/${id}` : '/'}>Cancel</Link>
                </div>
            </form>
        </div>
    );
}

export default RecipeEditPage;
