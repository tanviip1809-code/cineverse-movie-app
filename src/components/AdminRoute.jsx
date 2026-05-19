// src/components/AdminRoute.jsx
// Guards admin routes using VITE_ADMIN_EMAIL env check (via AuthContext.isAdmin).
// No Firestore role document required — much simpler and more reliable.
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#06060f]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-purple-600 border-t-transparent animate-spin" />
          <p className="text-gray-400 text-sm tracking-wide">Verifying access…</p>
        </div>
      </div>
    );
  }

  // Not logged in at all
  if (!user) return <Navigate to="/login" replace />;

  // Logged in but not the admin email
  if (!isAdmin) return <Navigate to="/" replace />;

  return children;
}
