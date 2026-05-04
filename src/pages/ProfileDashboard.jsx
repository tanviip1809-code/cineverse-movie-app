// src/pages/ProfileDashboard.jsx
import { useState, useEffect, useRef } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../hooks/useWishlist";
import { useNavigate } from "react-router-dom";
import UpdateProfileModal from "../components/UpdateProfileModal";
import toast from "react-hot-toast";

const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const IMG = "https://image.tmdb.org/t/p/w300";

// ─── helpers ──────────────────────────────────────────────────────────────────
function Avatar({ photoURL, initial, size = 96 }) {
    const [err, setErr] = useState(false);
    return (
        <div
            style={{ width: size, height: size }}
            className="rounded-full bg-gradient-to-br from-indigo-600 to-violet-700 ring-4 ring-white/10 overflow-hidden flex items-center justify-center shrink-0"
        >
            {photoURL && !err ? (
                <img src={photoURL} alt={initial} className="w-full h-full object-cover"
                    onError={() => setErr(true)} />
            ) : (
                <span className="font-bold text-white" style={{ fontSize: size * 0.38 }}>
                    {initial}
                </span>
            )}
        </div>
    );
}

function SectionTitle({ icon, label }) {
    return (
        <h2 className="flex items-center gap-2.5 text-white text-lg font-bold mb-5">
            <span className="text-indigo-400">{icon}</span>{label}
        </h2>
    );
}

function StatCard({ icon, label, value, loading }) {
    return (
        <div className="flex-1 min-w-[140px] bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-2
            hover:bg-white/[0.06] hover:border-indigo-500/30 hover:shadow-[0_0_24px_rgba(99,102,241,0.12)]
            transition-all duration-300 group">
            <span className="text-2xl">{icon}</span>
            {loading ? (
                <div className="h-7 w-12 bg-white/10 rounded animate-pulse" />
            ) : (
                <p className="text-3xl font-bold text-white">{value}</p>
            )}
            <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
        </div>
    );
}

function MovieCard({ movie, onRemove, showProgress, progress = 40 }) {
    const navigate = useNavigate();
    return (
        <div
            className="relative min-w-[140px] max-w-[140px] group cursor-pointer"
            onClick={() => navigate(`/movie/${movie.id}`, { state: movie })}
        >
            <div className="rounded-xl overflow-hidden ring-1 ring-white/10 group-hover:ring-indigo-500/50 transition-all duration-300">
                <img
                    src={movie.poster_path ? `${IMG}${movie.poster_path}` : "https://via.placeholder.com/140x210?text=No+Image"}
                    alt={movie.title}
                    loading="lazy"
                    className="w-full h-[210px] object-cover group-hover:scale-105 transition-transform duration-300"
                />
            </div>
            {showProgress && (
                <div className="mt-1.5 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                        style={{ width: `${progress}%` }} />
                </div>
            )}
            <p className="mt-1.5 text-[11px] text-gray-400 truncate">{movie.title || movie.name}</p>
            {showProgress && (
                <button
                    onClick={e => { e.stopPropagation(); navigate(`/movie/${movie.id}`, { state: movie }); }}
                    className="mt-1 w-full text-[10px] py-1 rounded-lg bg-indigo-600/70 hover:bg-indigo-600 text-white transition"
                >
                    ▶ Resume
                </button>
            )}
            {onRemove && (
                <button
                    onClick={e => { e.stopPropagation(); onRemove(movie.id); }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 text-gray-400 hover:text-white hover:bg-black flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all"
                >
                    ✕
                </button>
            )}
        </div>
    );
}

function HScroll({ children }) {
    const ref = useRef(null);
    const scroll = dir => ref.current?.scrollBy({ left: dir === "l" ? -400 : 400, behavior: "smooth" });
    return (
        <div className="relative">
            <button onClick={() => scroll("l")}
                className="absolute left-0 top-0 bottom-0 z-10 w-10 bg-gradient-to-r from-[#080810] to-transparent flex items-center justify-center text-white/40 hover:text-white transition">
                ‹
            </button>
            <div ref={ref} className="flex gap-4 overflow-x-auto scroll-smooth pb-2" style={{ scrollbarWidth: "none" }}>
                {children}
            </div>
            <button onClick={() => scroll("r")}
                className="absolute right-0 top-0 bottom-0 z-10 w-10 bg-gradient-to-l from-[#080810] to-transparent flex items-center justify-center text-white/40 hover:text-white transition">
                ›
            </button>
        </div>
    );
}

function LogoutModal({ onConfirm, onCancel }) {
    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0f0f15] border border-white/10 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl"
                style={{ animation: "modalPop 0.2s cubic-bezier(0.16,1,0.3,1) both" }}>
                <div className="text-5xl mb-4">👋</div>
                <h3 className="text-white text-xl font-bold mb-2">Sign out?</h3>
                <p className="text-gray-500 text-sm mb-7">You'll need to log back in to access your profile.</p>
                <div className="flex gap-3">
                    <button onClick={onCancel}
                        className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 text-sm transition">
                        Cancel
                    </button>
                    <button onClick={onConfirm}
                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-sm hover:opacity-90 transition">
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function ProfileDashboard() {
    const { user, userProfile } = useAuth();
    const { wishlist, wishlistLoading, removeFromWishlist } = useWishlist();
    const navigate = useNavigate();

    const [showEditModal, setShowEditModal] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [continueWatching, setContinueWatching] = useState([]);
    const [recentMovies, setRecentMovies] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [recsLoading, setRecsLoading] = useState(true);

    // ── Derived user data ──────────────────────────────────────────────────────
    const displayName = userProfile?.username || user?.displayName || user?.email?.split("@")[0] || "User";
    const displayEmail = userProfile?.email || user?.email || "";
    const photoURL = userProfile?.photoURL || user?.photoURL || "";
    const initial = displayName.trim()[0]?.toUpperCase() ?? "?";

    // ── Load localStorage data ─────────────────────────────────────────────────
    useEffect(() => {
        setContinueWatching(JSON.parse(localStorage.getItem("continueWatching")) || []);
        setRecentMovies(JSON.parse(localStorage.getItem("recent")) || []);
    }, []);

    // ── Fetch recommendations based on wishlist / recent ──────────────────────
    useEffect(() => {
        const seedMovies = [...wishlist, ...recentMovies].slice(0, 3);
        if (seedMovies.length === 0) { setRecsLoading(false); return; }

        setRecsLoading(true);
        const randomSeed = seedMovies[Math.floor(Math.random() * seedMovies.length)];

        fetch(`https://api.themoviedb.org/3/movie/${randomSeed.id}/recommendations?api_key=${API_KEY}`)
            .then(r => r.json())
            .then(d => setRecommendations(d.results?.slice(0, 12) || []))
            .catch(() => setRecommendations([]))
            .finally(() => setRecsLoading(false));
    }, [wishlist.length, recentMovies.length]); // eslint-disable-line

    const handleRemoveFromWishlist = async (id) => {
        await removeFromWishlist(id);
        toast.success("Removed from My List");
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate("/login");
        } catch {
            toast.error("Logout failed. Try again.");
        }
    };

    return (
        <div className="min-h-screen bg-[#080810] text-white"
            style={{ animation: "fadeIn 0.5s ease both" }}>
            <div className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-28 pb-20 space-y-16">

                {/* ── SECTION 1: USER HEADER ──────────────────────────────── */}
                <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
                    {/* Avatar with hover edit overlay */}
                    <div className="relative group cursor-pointer" onClick={() => setShowEditModal(true)}>
                        <Avatar photoURL={photoURL} initial={initial} size={100} />
                        <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                            <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                        </div>
                    </div>

                    <div className="flex-1 text-center sm:text-left">
                        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">{displayName}</h1>
                        <p className="text-gray-500 mt-1 text-sm">{displayEmail}</p>
                    </div>

                    <button
                        onClick={() => setShowEditModal(true)}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold
                            hover:from-indigo-500 hover:to-violet-500 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]
                            transition-all duration-200"
                    >
                        ✏️ Edit Profile
                    </button>
                </div>

                {/* ── SECTION 2: STATS ────────────────────────────────────── */}
                <div>
                    <SectionTitle icon="📊" label="Your Stats" />
                    <div className="flex flex-wrap gap-4">
                        <StatCard icon="🎬" label="Watched" value={recentMovies.length} loading={false} />
                        <StatCard icon="❤️" label="Wishlist" value={wishlistLoading ? "—" : wishlist.length} loading={wishlistLoading} />
                        <StatCard icon="⏱️" label="Continue Watching" value={continueWatching.length} loading={false} />
                    </div>
                </div>

                {/* ── SECTION 3: CONTINUE WATCHING ────────────────────────── */}
                {continueWatching.length > 0 && (
                    <div>
                        <SectionTitle icon="▶️" label="Continue Watching" />
                        <HScroll>
                            {continueWatching.map(movie => (
                                <MovieCard key={movie.id} movie={movie} showProgress progress={Math.floor(Math.random() * 60) + 20} />
                            ))}
                        </HScroll>
                    </div>
                )}

                {/* ── SECTION 4: WISHLIST ──────────────────────────────────── */}
                <div>
                    <SectionTitle icon="❤️" label="My List" />
                    {wishlistLoading ? (
                        <div className="flex gap-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="min-w-[140px] h-[210px] bg-white/5 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : wishlist.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3
                            bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                            <span className="text-5xl">🎬</span>
                            <p className="text-gray-400">Your wishlist is empty.</p>
                            <p className="text-gray-600 text-sm">Browse movies and click ❤️ to save them here.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                            {wishlist.map(movie => (
                                <MovieCard key={movie.id} movie={movie} onRemove={handleRemoveFromWishlist} />
                            ))}
                        </div>
                    )}
                </div>

                {/* ── SECTION 5: RECOMMENDATIONS ──────────────────────────── */}
                {(recommendations.length > 0 || recsLoading) && (
                    <div>
                        <SectionTitle icon="⭐" label="Recommended For You" />
                        {recsLoading ? (
                            <div className="flex gap-4">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="min-w-[140px] h-[210px] bg-white/5 rounded-xl animate-pulse" />
                                ))}
                            </div>
                        ) : (
                            <HScroll>
                                {recommendations.map(movie => (
                                    <MovieCard key={movie.id} movie={movie} />
                                ))}
                            </HScroll>
                        )}
                    </div>
                )}

                {/* ── SECTION 6: ACCOUNT SETTINGS ─────────────────────────── */}
                <div>
                    <SectionTitle icon="⚙️" label="Account Settings" />
                    <div className="bg-white/[0.025] border border-white/[0.07] rounded-2xl p-6 flex flex-col sm:flex-row
                        items-start sm:items-center justify-between gap-4">
                        <div>
                            <p className="text-white font-medium">Profile Information</p>
                            <p className="text-gray-500 text-sm mt-1">
                                Update your username, email, password, and profile photo.
                            </p>
                        </div>
                        <button
                            onClick={() => setShowEditModal(true)}
                            className="px-5 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.1]
                                text-gray-300 text-sm font-medium hover:bg-white/10 hover:text-white
                                hover:border-indigo-500/40 transition-all duration-200 whitespace-nowrap"
                        >
                            Open Settings →
                        </button>
                    </div>
                </div>

                {/* ── SECTION 7: LOGOUT ────────────────────────────────────── */}
                <div className="pt-4 border-t border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-gray-600 text-sm">Signed in as <span className="text-gray-400">{displayEmail}</span></p>
                    <button
                        onClick={() => setShowLogoutModal(true)}
                        className="px-6 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm font-medium
                            hover:border-white/20 hover:text-white transition-all duration-200 flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Sign Out
                    </button>
                </div>

            </div>

            {/* ── Modals ─────────────────────────────────────────────────────── */}
            {showEditModal && <UpdateProfileModal onClose={() => setShowEditModal(false)} />}
            {showLogoutModal && (
                <LogoutModal
                    onConfirm={handleLogout}
                    onCancel={() => setShowLogoutModal(false)}
                />
            )}
        </div>
    );
}
