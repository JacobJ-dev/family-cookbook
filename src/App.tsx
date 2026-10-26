import { Link, Route, Routes } from 'react-router'
import { RequireAuth } from './auth/RequireAuth'
import LoginPage from './pages/LoginPage'
import { useAuth } from './auth/authContext'

function App() {
  const { profile, signOut } = useAuth()
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
            <Route path="/" element={<p>Recipes will appear here.</p>} />
          </Route>

          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
    </>
  )
}

export default App
