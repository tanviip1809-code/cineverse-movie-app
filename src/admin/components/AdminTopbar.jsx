// src/admin/components/AdminTopbar.jsx
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const PAGE_TITLES = {
  "/admin/dashboard":  "Dashboard",
  "/admin/movies":     "Movie Management",
  "/admin/users":      "User Management",
  "/admin/watchrooms": "Watch Rooms",
  "/admin/reviews":    "Reviews",
  "/admin/analytics":  "Analytics",
  "/admin/settings":   "Settings",
};

export default function AdminTopbar({ onMenuClick }) {
  const location = useLocation();
  const { userProfile, user } = useAuth();

  const title = PAGE_TITLES[location.pathname] ?? "Admin";
  const name = userProfile?.username || user?.displayName || user?.email?.split("@")[0] || "Admin";
  const photo = userProfile?.photoURL || user?.photoURL || "";
  const initial = name.trim()[0]?.toUpperCase() ?? "A";

  return (
    <header className="h-16 flex items-center justify-between px-4 sm:px-6 bg-[#09090f]/95 backdrop-blur border-b border-white/[0.06] sticky top-0 z-30">
      {/* Left: hamburger + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden w-9 h-9 rounded-lg border border-white/[0.08] bg-white/[0.04] flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all"
          aria-label="Open sidebar"
        >
          <HamburgerIcon />
        </button>
        <div>
          <h2 className="text-white font-semibold text-base leading-none">{title}</h2>
          <p className="text-gray-500 text-[11px] mt-0.5 hidden sm:block">CineVerse Admin Panel</p>
        </div>
      </div>

      {/* Right: admin badge + avatar */}
      <div className="flex items-center gap-3">
        <span className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-purple-300 bg-purple-600/15 border border-purple-500/25 px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          Admin
        </span>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center overflow-hidden ring-2 ring-purple-500/30">
            {photo ? (
              <img src={photo} alt={name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
            ) : (
              <span className="text-white text-xs font-bold">{initial}</span>
            )}
          </div>
          <span className="hidden md:block text-sm text-gray-300 font-medium max-w-[120px] truncate">{name}</span>
        </div>
      </div>
    </header>
  );
}

function HamburgerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
