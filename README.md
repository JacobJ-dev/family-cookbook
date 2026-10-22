# Family Cookbook

An online family cookbook. One editor adds recipes, and invited family members browse, rate, comment and mark favorites. Over time it shows which recipes the family loves most, for a printed cookbook.

## Stack
- React + TypeScript, built with Vite
- React Router for pages
- Supabase for the database (Postgres + Row Level Security), magic-link sign-in and photo storage

## Getting started
```bash
npm install
cp .env.example .env.local   # then fill in your Supabase URL and anon key
npm run dev                  # http://localhost:5173
```

## Scripts
| command | what it does |
|---|---|
| `npm run dev` | start the dev server with hot reload |
| `npm run build` | type-check (`tsc -b`) and build to `dist/` |
| `npm run lint` | run oxlint |
| `npm run preview` | serve the built `dist/` locally |
