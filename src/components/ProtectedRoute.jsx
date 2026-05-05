// src/components/ProtectedRoute.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * ProtectedRoute — Wraps pages that require the user to be logged in.
 * - Shows a loader while Firebase resolves the auth state.
 * - Redirects to /login with { state: { from: location } } so Login can
 *   redirect back to the original URL after successful authentication.
 * - Renders children if authenticated.
 */
export function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-black">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-400 text-sm">Authenticating...</p>
                </div>
            </div>
        );
    }

    // Not logged in → send to login, preserving the intended destination
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
}

/**
 * PublicRoute — Wraps pages that should only be accessible when logged OUT.
 * - Redirects already-logged-in users to Home so they never see /login again.
 */
export function PublicRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-black">
                <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Already logged in → skip the login page
    if (user) {
        return <Navigate to="/" replace />;
    }

    return children;
}
