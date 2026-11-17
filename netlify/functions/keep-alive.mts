// Scheduled Netlify function: once a day, call the keep_alive() database
// function so the Supabase free tier sees activity and doesn't pause.
// See supabase/migrations/20261118120000_keep_alive.sql for the database side.
//
// It runs on Netlify's servers, not in a browser, so there's no supabase-js
// client here: one plain fetch to Supabase's REST endpoint for database functions.

// Netlify reads this export: "@daily" runs it once a day (midnight UTC).
// Scheduled functions only run on the published site, not on deploy previews.
export const config = {
    schedule: '@daily',
};

export default async function keepAlive(): Promise<Response> {
    // The same values the site is built with, set in Netlify's environment variables.
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
        throw new Error('keep-alive: missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY');
    }

    // Database functions are called at /rest/v1/rpc/<name> with a POST.
    // The publishable key goes in the apikey header; with no signed-in user,
    // Supabase runs the request as the anon role.
    const response = await fetch(`${url}/rest/v1/rpc/keep_alive`, {
        method: 'POST',
        headers: { apikey: key, 'Content-Type': 'application/json' },
        body: '{}',
    });

    // A paused project or a wrong key lands here. Throwing marks the run as
    // failed in Netlify's function logs.
    if (!response.ok) {
        throw new Error(`keep-alive: ${response.status} ${await response.text()}`);
    }

    // keep_alive() returns the timestamp it just wrote, e.g. "2026-11-18T00:00:01.23+00:00".
    const lastPing = await response.json();
    console.log(`keep-alive: last_ping = ${lastPing}`);
    return new Response(`ok ${lastPing}`);
}
