// src/admin/components/AdminSidebar.jsx
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const NAV = [
  { to: "/admin/dashboard",  icon: "▦",  label: "Dashboard"    },
  { to: "/admin/movies",     icon: "🎬",  label: "Movies"       },
  { to: "/admin/users",      icon: "👥",  label: "Users"        },
  { to: "/admin/watchrooms", icon: "📺",  label: "Watch Rooms"  },
  { to: "/admin/reviews",    icon: "⭐",  label: "Reviews"      },
  { to: "/admin/analytics",  icon: "📊",  label: "Analytics"    },
  { to: "/admin/settings",   icon: "⚙️",  label: "Settings"     },
];

export default function AdminSidebar({ isOpen, onClose }) {
  const location = useLocation();

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/[0.06]">
        <Link to="/" className="block">
          <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-purple-400 via-pink-400 to-purple-300 bg-clip-text text-transparent">
            CineVerse
          </h1>
          <p className="text-[10px] text-purple-400/60 uppercase tracking-[0.2em] mt-0.5 font-semibold">Admin Panel</p>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => {
          const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative ${
                active
                  ? "bg-purple-600/20 text-purple-300 shadow-[inset_0_1px_0_rgba(168,85,247,0.15)]"
                  : "text-gray-400 hover:text-white hover:bg-white/[0.05]"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 rounded-xl bg-purple-600/15 border border-purple-500/20"
                  transition={{ type: "spring", duration: 0.3 }}
                />
              )}
              <span className="text-base leading-none relative z-10">{item.icon}</span>
              <span className="relative z-10">{item.label}</span>
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-400 relative z-10" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/[0.06]">
        <Link
          to="/"
          className="flex items-center gap-2.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          <span>←</span>
          <span>Back to CineVerse</span>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 h-screen bg-[#09090f] border-r border-white/[0.06] fixed left-0 top-0 z-40">
        <SidebarContent />
      </aside>

      {/* Mobile overlay + drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 h-full w-72 bg-[#09090f] border-r border-white/[0.06] z-50 lg:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
