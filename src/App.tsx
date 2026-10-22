import { Link, Route, Routes } from 'react-router'

function App() {
  return (
    <>
      <header className="app-header">
        <Link to="/">Family Cookbook</Link>
      </header>

      <main>
        {/* Each <Route> maps a URL to a page. We'll add login, recipe and editor pages here. */}
        <Routes>
          <Route path="/" element={<p>Recipes will appear here.</p>} />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
    </>
  )
}

export default App
