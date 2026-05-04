// src/components/Navbar.jsx
import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ProfileDropdown from "./ProfileDropdown";

const API_KEY = "fdb19de6314c42882e0e5c538a4a2588";

function Navbar() {
    const { user } = useAuth();
    const [scroll, setScroll] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const debounceRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();

    // ── Smart home navigation ──────────────────────────────────────────────
    const handleHomeClick = (e) => {
        e.preventDefault();
        if (location.pathname === "/") {
            // Already home — just scroll to top, no re-render
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

        if (!value.trim()) {
            setSearchResults([]);
            return;
        }

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
        navigate(`/movie/${movie.id}`, { state: movie }); // pass state → instant render
        clearSearch();
    };


    return (
        <div
            className={`fixed top-0 left-0 w-full z-50 backdrop-blur-xl border-b border-white/20 shadow-lg transition-colors duration-300 ${scroll ? "bg-black/90" : "bg-black/40"
                }`}
        >
            <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-4">

                {/* Logo */}
                <a href="/" onClick={handleHomeClick} className="cursor-pointer">
                    <h1 className="text-2xl font-bold tracking-wide bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">
                        CineVerse
                    </h1>
                </a>

                {/* Search Box */}
                <div className="relative">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder="Search movies..."
                        className="bg-white/10 text-white px-4 py-2 rounded-full outline-none w-[200px] focus:w-[280px] transition-all placeholder-gray-400 text-sm"
                    />

                    {/* Clear button */}
                    {searchQuery && (
                        <button
                            onClick={clearSearch}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                            ✕
                        </button>
                    )}

                    {/* Dropdown Results */}
                    {searchQuery && (
                        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[380px] bg-gray-900/95 border border-white/10 rounded-xl p-3 z-50 shadow-2xl">
                            {searching ? (
                                <p className="text-gray-400 text-sm text-center py-2">
                                    Searching...
                                </p>
                            ) : searchResults.length === 0 ? (
                                <p className="text-gray-500 text-sm text-center py-2">
                                    No results found
                                </p>
                            ) : (
                                searchResults.slice(0, 6).map((movie) => (
                                    <div
                                        key={movie.id}
                                        onClick={() => handleMovieClick(movie)}
                                        className="flex items-center gap-3 p-2 hover:bg-white/10 cursor-pointer rounded-lg transition group"
                                    >
                                        <img
                                            src={
                                                movie.poster_path
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

                {/* Nav Links + User */}
                <div className="flex items-center gap-6 text-sm font-medium text-gray-300">

                    {/* Profile dropdown */}
                    {user && <ProfileDropdown />}

                    <span className="relative group cursor-pointer">
                        <a href="/" onClick={handleHomeClick} className="hover:text-white transition">Home</a>
                        <span className="absolute left-0 -bottom-1 w-0 h-[2px] bg-red-500 transition-all group-hover:w-full" />
                    </span>

                    <span className="relative group cursor-pointer">
                        <Link to="/my-list" className="hover:text-white transition">My List</Link>
                        <span className="absolute left-0 -bottom-1 w-0 h-[2px] bg-purple-500 transition-all group-hover:w-full" />
                    </span>

                </div>
            </div>
        </div>
    );
}

export default Navbar;