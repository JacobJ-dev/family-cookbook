import { Link, Route, Routes } from 'react-router';
import { RequireAuth } from './auth/RequireAuth';
import { RequireEditor } from './auth/RequireEditor';
import LoginPage from './pages/LoginPage';
import RecipeListPage from './pages/RecipeListPage';
import RecipeDetailPage from './pages/RecipeDetailPage';
import RecipeEditPage from './pages/RecipeEditPage';
import { useAuth } from './auth/authContext';


function App() {
    const { profile, signOut } = useAuth();

    
    return (
        <>
            <header className="app-header">
                <Link to="/">Family Cookbook</Link>
                {profile && (
                    <span>
                    Signed in as {profile.display_name} <button onClick={signOut}>Sign Out</button>
                    </span>
                )}
            </header>

            <main>
                {/* Each <Route> maps a URL to a page. */}
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    {/* Everything nested here requires being signed in. */}
                    <Route element={<RequireAuth />}>
                        <Route path="/" element={<RecipeListPage />} />
                        <Route path="/recipes/:id" element={<RecipeDetailPage />} />

                        {/* Editor-only. React Router ranks routes by how specific
                            they are, so /recipes/new wins over /recipes/:id. */}
                        <Route element={<RequireEditor />}>
                            <Route path="/recipes/new" element={<RecipeEditPage />} />
                            <Route path="/recipes/:id/edit" element={<RecipeEditPage />} />
                        </Route>
                    </Route>

                    <Route path="*" element={<p>Page not found.</p>} />
                </Routes>
            </main>
        </>
    );
}

export default App;
