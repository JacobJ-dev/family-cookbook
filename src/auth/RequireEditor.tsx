import { Navigate, Outlet } from 'react-router';
import { useAuth } from './authContext';

// A layout route for editor-only pages. Nest it inside <RequireAuth />:
// by the time this renders, RequireAuth has already waited for loading and
// sent signed-out users to /login, so the only question left is the role.
//
// Like RequireAuth, this is user experience, not security. A family member
// who got past it would still be stopped by the recipes and storage policies.
export function RequireEditor() {
    const { profile } = useAuth();

    // Not the editor (or the profile failed to load): back to the recipe list.
    if (profile?.role !== 'editor') return <Navigate to="/" replace />;

    return <Outlet />;
}
