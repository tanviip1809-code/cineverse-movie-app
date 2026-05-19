// src/components/Navbar.jsx
import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ProfileDropdown from "./ProfileDropdown";
import { Shield, Menu, X, Search } from "lucide-react";

const API_KEY = import.meta.env.VITE_TMDB_API_KEY;

function Navbar() {
    const { user, userProfile } = useAuth();
    const [scroll, setScroll] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false); // mobile search toggle
    const debounceRef = useRef(null);
    const searchRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();

    // Close menu on route change
    useEffect(() => {
        setMenuOpen(false);
        setSearchOpen(false);
    }, [location.pathname]);

    // Lock body scroll when mobile menu is open
    useEffect(() => {
        document.body.style.overflow = menuOpen ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [menuOpen]);

    // ── Smart home navigation ──────────────────────────────────────────────
    const handleHomeClick = (e) => {
        e.preventDefault();
        setMenuOpen(false);
        if (location.pathname === "/") {
            window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
            navigate("/");
            window.scrollTo(0, 0);
        }
    };

    // ── Scroll shadow ──────────────────────────────────────────────────────
    useEffect(() => {
        const onScroll = () => setScroll(window.scrollY > 30);
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    // ── Debounced search ───────────────────────────────────────────────────
    const handleSearch = (value) => {
        setSearchQuery(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!value.trim()) { setSearchResults([]); return; }

        debounceRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await fetch(
                    `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(value)}`
                );
                const data = await res.json();
                setSearchResults(data.results || []);
            } catch (err) {
                console.error("Search error:", err);
            } finally {
                setSearching(false);
            }
        }, 400);
    };

    const clearSearch = () => {
        setSearchQuery("");
        setSearchResults([]);
    };

    const handleMovieClick = (movie) => {
        navigate(`/movie/${movie.id}`, { state: movie });
        clearSearch();
        setMenuOpen(false);
        setSearchOpen(false);
    };

    return (
        <>
            <div
                className={`fixed top-0 left-0 w-full z-50 backdrop-blur-xl border-b border-white/20 shadow-lg transition-colors duration-300 ${scroll ? "bg-black/90" : "bg-black/40"}`}
            >
                <div className="max-w-7xl mx-auto flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 gap-3">

                    {/* Logo */}
                    <a href="/" onClick={handleHomeClick} className="cursor-pointer shrink-0">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-wide bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">
                            CineVerse
                        </h1>
                    </a>

                    {/* Desktop Search Box */}
                    <div className="relative hidden md:block">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            placeholder="Search movies..."
                            className="bg-white/10 text-white px-4 py-2 rounded-full outline-none w-[180px] lg:w-[220px] focus:w-[280px] transition-all placeholder-gray-400 text-sm"
                        />
                        {searchQuery && (
                            <button
                                onClick={clearSearch}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                            >
                                ✕
                            </button>
                        )}
                        {searchQuery && (
                            <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[360px] bg-gray-900/95 border border-white/10 rounded-xl p-3 z-50 shadow-2xl">
                                {searching ? (
                                    <p className="text-gray-400 text-sm text-center py-2">Searching...</p>
                                ) : searchResults.length === 0 ? (
                                    <p className="text-gray-500 text-sm text-center py-2">No results found</p>
                                ) : (
                                    searchResults.slice(0, 6).map((movie) => (
                                        <div
                                            key={movie.id}
                                            onClick={() => handleMovieClick(movie)}
                                            className="flex items-center gap-3 p-2 hover:bg-white/10 cursor-pointer rounded-lg transition group"
                                        >
                                            <img
                                                src={movie.poster_path
                                                    ? `https://image.tmdb.org/t/p/w92${movie.poster_path}`
                                                    : "https://via.placeholder.com/46x69?text=?"
                                                }
                                                className="w-10 h-[60px] object-cover rounded"
                                                alt={movie.title}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white text-sm font-medium truncate group-hover:text-red-400 transition">
                                                    {movie.title || movie.name}
                                                </p>
                                                <p className="text-gray-500 text-xs">
                                                    {movie.release_date?.slice(0, 4) || "—"} &nbsp;⭐ {movie.vote_average?.toFixed(1)}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Desktop Nav Links */}
                    <div className="hidden md:flex items-center gap-4 lg:gap-6 text-sm font-medium text-gray-300">
                        {user && <ProfileDropdown />}

                        <span className="relative group cursor-pointer">
                            <a href="/" onClick={handleHomeClick} className="hover:text-white transition">Home</a>
                            <span className="absolute left-0 -bottom-1 w-0 h-[2px] bg-red-500 transition-all group-hover:w-full" />
                        </span>

                        <span className="relative group cursor-pointer">
                            <Link to="/my-list" className="hover:text-white transition">My List</Link>
                            <span className="absolute left-0 -bottom-1 w-0 h-[2px] bg-purple-500 transition-all group-hover:w-full" />
                        </span>

                        {userProfile?.role === "admin" && (
                            <Link
                                to="/admin/dashboard"
                                className="flex items-center gap-1.5 text-xs font-semibold text-purple-300 bg-purple-600/20 border border-purple-500/30 px-3 py-1.5 rounded-full hover:bg-purple-600/30 transition"
                            >
                                <Shield size={12} />
                                Admin
                            </Link>
                        )}
                    </div>

                    {/* Mobile right controls */}
                    <div className="flex md:hidden items-center gap-2">
                        {/* Mobile search toggle */}
                        <button
                            onClick={() => setSearchOpen(v => !v)}
                            className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition"
                            aria-label="Search"
                        >
                            <Search size={16} />
                        </button>

                        {/* Profile avatar (compact, mobile) */}
                        {user && (
                            <div className="flex items-center">
                                <ProfileDropdown />
                            </div>
                        )}

                        {/* Hamburger */}
                        <button
                            onClick={() => setMenuOpen(v => !v)}
                            className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition"
                            aria-label="Open menu"
                        >
                            {menuOpen ? <X size={18} /> : <Menu size={18} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Search Bar — expanded */}
                {searchOpen && (
                    <div className="md:hidden px-4 pb-3 relative">
                        <div className="relative">
                            <input
                                ref={searchRef}
                                autoFocus
                                type="text"
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                placeholder="Search movies..."
                                className="w-full bg-white/10 text-white px-4 py-2.5 rounded-full outline-none placeholder-gray-400 text-sm pr-10"
                            />
                            {searchQuery && (
                                <button
                                    onClick={clearSearch}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                        {searchQuery && (
                            <div className="absolute left-4 right-4 top-full mt-1 bg-gray-900/98 border border-white/10 rounded-xl p-3 z-50 shadow-2xl max-h-[50vh] overflow-y-auto">
                                {searching ? (
                                    <p className="text-gray-400 text-sm text-center py-2">Searching...</p>
                                ) : searchResults.length === 0 ? (
                                    <p className="text-gray-500 text-sm text-center py-2">No results found</p>
                                ) : (
                                    searchResults.slice(0, 6).map((movie) => (
                                        <div
                                            key={movie.id}
                                            onClick={() => handleMovieClick(movie)}
                                            className="flex items-center gap-3 p-2 hover:bg-white/10 cursor-pointer rounded-lg transition group"
                                        >
                                            <img
                                                src={movie.poster_path
                                                    ? `https://image.tmdb.org/t/p/w92${movie.poster_path}`
                                                    : "https://via.placeholder.com/46x69?text=?"
                                                }
                                                className="w-9 h-[54px] object-cover rounded"
                                                alt={movie.title}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white text-sm font-medium truncate group-hover:text-red-400 transition">
                                                    {movie.title || movie.name}
                                                </p>
                                                <p className="text-gray-500 text-xs">
                                                    {movie.release_date?.slice(0, 4) || "—"} &nbsp;⭐ {movie.vote_average?.toFixed(1)}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Mobile Drawer Overlay ──────────────────────────────────────────── */}
            {menuOpen && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setMenuOpen(false)}
                />
            )}

            {/* ── Mobile Drawer Panel ────────────────────────────────────────────── */}
            <div
                className={`fixed top-0 right-0 h-full w-72 max-w-[85vw] bg-[#0a0a12] border-l border-white/[0.06] z-50 md:hidden flex flex-col
                    transition-transform duration-300 ease-out
                    ${menuOpen ? "translate-x-0" : "translate-x-full"}`}
            >
                {/* Drawer header */}
                <div className="flex items-center justify-between px-5 py-5 border-b border-white/[0.06]">
                    <h2 className="text-lg font-bold bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">
                        CineVerse
                    </h2>
                    <button
                        onClick={() => setMenuOpen(false)}
                        className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Nav links */}
                <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                    <MobileNavItem
                        icon="🏠"
                        label="Home"
                        onClick={(e) => { handleHomeClick(e); setMenuOpen(false); }}
                        href="/"
                    />
                    <MobileNavItem
                        icon="❤️"
                        label="My List"
                        onClick={() => { navigate("/my-list"); setMenuOpen(false); }}
                    />
                    <MobileNavItem
                        icon="👤"
                        label="Profile"
                        onClick={() => { navigate("/profile"); setMenuOpen(false); }}
                    />
                    {userProfile?.role === "admin" && (
                        <MobileNavItem
                            icon="🛡️"
                            label="Admin Panel"
                            onClick={() => { navigate("/admin/dashboard"); setMenuOpen(false); }}
                            highlight
                        />
                    )}
                </nav>

                {/* Drawer footer */}
                <div className="px-5 py-5 border-t border-white/[0.06] text-xs text-gray-600 text-center">
                    CineVerse © {new Date().getFullYear()}
                </div>
            </div>
        </>
    );
}

function MobileNavItem({ icon, label, onClick, href, highlight }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 text-left
                ${highlight
                    ? "bg-purple-600/20 text-purple-300 border border-purple-500/25 hover:bg-purple-600/30"
                    : "text-gray-300 hover:text-white hover:bg-white/[0.05]"
                }`}
        >
            <span className="text-base">{icon}</span>
            <span>{label}</span>
        </button>
    );
}

export default Navbar;