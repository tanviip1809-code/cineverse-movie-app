// src/pages/MovieDetails.jsx
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useWishlist } from "../hooks/useWishlist";
import { useTrailer } from "../hooks/useTrailer";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE = "https://api.themoviedb.org/3";

function MovieDetails() {
    const { id } = useParams();                    // always reliable
    const { state: stateMovie } = useLocation();   // populated only when navigated with state

    // ── Core state ────────────────────────────────────────────────────────────
    const [movie, setMovie] = useState(stateMovie || null); // pre-fill if available
    const [cast, setCast] = useState([]);
    const [recommended, setRecommended] = useState([]);
    const [showTrailer, setShowTrailer] = useState(false);
    const { trailer, loading: trailerLoading, error: trailerError, fetchTrailer } = useTrailer();
    const [rating, setRating] = useState(0);
    const [pageLoading, setPageLoading] = useState(!stateMovie); // skip fetch if state exists

    const navigate = useNavigate();
    const { user, userProfile } = useAuth();
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
    const isInList = movie ? isInWishlist(movie.id) : false;
    const [partyLoading, setPartyLoading] = useState(false);

    // ── Fetch movie details by ID (runs whenever URL id changes) ─────────────
    useEffect(() => {
        if (!id) return;

        // If we already have state data for this exact movie, skip the fetch
        if (stateMovie && String(stateMovie.id) === String(id)) {
            setMovie(stateMovie);
            setPageLoading(false);
            return;
        }

        setPageLoading(true);
        fetch(`${BASE}/movie/${id}?api_key=${API_KEY}`)
            .then((res) => {
                if (!res.ok) throw new Error("Movie not found");
                return res.json();
            })
            .then((data) => {
                setMovie(data);
                setPageLoading(false);
            })
            .catch((err) => {
                console.error("Failed to fetch movie:", err);
                setPageLoading(false);
            });
    }, [id]); // re-run if user navigates to a different movie

    // ── Fetch cast + recommendations once movie is loaded ────────────────────
    useEffect(() => {
        if (!movie?.id) return;

        // Cast
        fetch(`${BASE}/movie/${movie.id}/credits?api_key=${API_KEY}`)
            .then((r) => r.json())
            .then((d) => setCast(d.cast?.slice(0, 6) || []));

        // Recommendations
        fetch(`${BASE}/movie/${movie.id}/recommendations?api_key=${API_KEY}`)
            .then((r) => r.json())
            .then((d) => setRecommended(d.results?.slice(0, 10) || []));

        // Rating from localStorage
        const ratings = JSON.parse(localStorage.getItem("ratings")) || {};
        setRating(ratings[movie.id] || 0);

        // Recent history
        let recent = JSON.parse(localStorage.getItem("recent")) || [];
        recent = [movie, ...recent.filter((m) => m.id !== movie.id)].slice(0, 10);
        localStorage.setItem("recent", JSON.stringify(recent));
    }, [movie?.id]);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleTrailer = async () => {
        await fetchTrailer(movie?.id);
        setShowTrailer(true);
    };

    const handleToggleList = async () => {
        if (isInList) {
            await removeFromWishlist(movie.id);
            toast.error("Removed from My List ❌");
        } else {
            await addToWishlist(movie);
            toast.success("Added to My List ❤️");
        }
    };

    const handlePlay = () => {
        const continueWatching = JSON.parse(localStorage.getItem("continueWatching")) || [];
        const updated = [
            { ...movie, lastWatched: Date.now() },
            ...continueWatching.filter((item) => item.id !== movie.id),
        ];
        localStorage.setItem("continueWatching", JSON.stringify(updated));
    };

    const handleStarRating = (star) => {
        setRating(star);
        const ratings = JSON.parse(localStorage.getItem("ratings")) || {};
        ratings[movie.id] = star;
        localStorage.setItem("ratings", JSON.stringify(ratings));
    };

    // ── Create Watch Party room ────────────────────────────────────────────────
    const handleWatchParty = async () => {
        if (!movie) return;

        // ── Guard 1: must be authenticated ──────────────────────────────────
        const uid = user?.uid;
        if (!uid) {
            toast.error("Please log in to start a Watch Party.");
            return;
        }

        setPartyLoading(true);
        try {
            // ── Fetch trailer key (reuse already-loaded one if available) ────
            let trailerKey = trailer?.key ?? null;
            if (!trailerKey) {
                const res = await fetch(`${BASE}/movie/${movie.id}/videos?api_key=${API_KEY}`);
                const data = await res.json();
                const t = data.results?.find(v => v.type === "Trailer" && v.site === "YouTube");
                trailerKey = t?.key ?? "";
            }

            // ── Generate unique room ID ──────────────────────────────────────
            const roomId = (typeof crypto.randomUUID === "function")
                ? crypto.randomUUID().replace(/-/g, "").slice(0, 16)
                : Math.random().toString(36).slice(2, 18);

            const displayName =
                userProfile?.username || user?.displayName ||
                user?.email?.split("@")[0] || "Host";
            const photoURL = userProfile?.photoURL || user?.photoURL || "";

            // ── Write room document ──────────────────────────────────────────
            await setDoc(doc(db, "rooms", roomId), {
                roomId,
                movieId:     movie.id,
                movieTitle:  movie.title || movie.name || "Unknown",
                trailerKey:  trailerKey,
                hostUid:     uid,
                isPlaying:   false,
                currentTime: 0,
                syncedAt:    Date.now(),
                createdAt:   serverTimestamp(),
            });

            // ── Write host as first member (uid is guaranteed non-null here) ─
            await setDoc(doc(db, "rooms", roomId, "members", uid), {
                uid,
                displayName,
                photoURL,
                joinedAt: serverTimestamp(),
            });

            toast.success("Watch Party created! Share the link 🎉");
            navigate(`/watch/${roomId}`);
        } catch (err) {
            // Surface the real Firebase error for easy diagnosis
            const reason = err?.code ? `[${err.code}] ${err.message}` : (err?.message ?? "Unknown error");
            console.error("Watch Party creation failed:", err);
            toast.error(`Room creation failed: ${reason}`);
        } finally {
            setPartyLoading(false);
        }
    };


    // ── Loading state ─────────────────────────────────────────────────────────
    if (pageLoading) {
        return (
            <div className="bg-black min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-400">Loading movie...</p>
                </div>
            </div>
        );
    }

    if (!movie) {
        return (
            <div className="bg-black min-h-screen flex items-center justify-center flex-col gap-4">
                <p className="text-white text-2xl">Movie not found</p>
                <button
                    onClick={() => navigate("/")}
                    className="bg-red-600 px-4 py-2 rounded text-white hover:bg-red-700"
                >
                    ← Back to Home
                </button>
            </div>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="bg-black text-white min-h-screen">

            {/* Banner */}
            <div className="relative h-[70vh]">
                <img
                    src={
                        movie.backdrop_path
                            ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
                            : `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                    }
                    alt={movie.title}
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

                {/* Title overlay on banner */}
                <div className="absolute bottom-10 left-10">
                    <h1 className="text-5xl font-bold drop-shadow-lg">
                        {movie.title || movie.name}
                    </h1>
                    <p className="text-yellow-400 mt-2 text-lg">
                        ⭐ {movie.vote_average?.toFixed(1)}
                        {movie.release_date && (
                            <span className="text-gray-400 ml-4 text-sm">
                                {movie.release_date.slice(0, 4)}
                            </span>
                        )}
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="px-10 py-8 space-y-6 max-w-5xl">

                {/* Overview */}
                <p className="text-gray-300 text-base leading-relaxed">
                    {movie.overview || "No description available."}
                </p>

                {/* Cast */}
                {cast.length > 0 && (
                    <div>
                        <h3 className="font-semibold text-gray-200 mb-1">Cast</h3>
                        <p className="text-gray-400 text-sm">{cast.map((c) => c.name).join(", ")}</p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-4 mt-2">
                    <button
                        onClick={handlePlay}
                        className="bg-white text-black px-6 py-2 rounded font-semibold hover:bg-gray-200 transition"
                    >
                        ▶ Play
                    </button>

                    <button
                        onClick={handleTrailer}
                        className="bg-gray-700 px-5 py-2 rounded flex items-center gap-2 hover:bg-gray-600 transition"
                    >
                        🎬 Trailer
                    </button>

                    <button
                        onClick={handleToggleList}
                        className={`px-6 py-2 rounded font-medium transition ${isInList
                                ? "bg-red-600 hover:bg-red-700"
                                : "bg-gray-700 hover:bg-gray-600"
                            }`}
                    >
                        {isInList ? "❌ Remove from List" : "❤️ My List"}
                    </button>

                    <button
                        onClick={handleWatchParty}
                        disabled={partyLoading}
                        className="px-5 py-2 rounded font-medium transition bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white disabled:opacity-50 flex items-center gap-2"
                    >
                        {partyLoading ? (
                            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" /> Creating…</>
                        ) : (
                            <>🎉 Watch Party</>
                        )}
                    </button>
                </div>

                {/* Star Rating */}
                <div className="flex gap-1 mt-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <span
                            key={star}
                            onClick={() => handleStarRating(star)}
                            className={`cursor-pointer text-3xl transition ${star <= rating ? "text-yellow-400" : "text-gray-600"
                                }`}
                        >
                            ★
                        </span>
                    ))}
                </div>

                {/* Trailer Modal — YouTube iframe via TMDB key */}
                {showTrailer && (
                    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
                        {/* Close */}
                        <button
                            onClick={() => setShowTrailer(false)}
                            className="absolute top-5 right-6 text-white text-3xl hover:text-red-400 transition z-10"
                            aria-label="Close trailer"
                        >
                            ✕
                        </button>

                        <div className="w-full max-w-4xl">

                            {/* Loading */}
                            {trailerLoading && (
                                <div className="flex flex-col items-center gap-3 text-gray-400">
                                    <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
                                    <span className="text-sm">Loading trailer…</span>
                                </div>
                            )}

                            {/* Error */}
                            {!trailerLoading && trailerError && (
                                <p className="text-red-400 text-center text-sm">{trailerError}</p>
                            )}

                            {/* YouTube iframe */}
                            {!trailerLoading && !trailerError && trailer?.key && (
                                <div className="rounded-xl overflow-hidden shadow-2xl">
                                    <iframe
                                        src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0`}
                                        title={trailer?.name || "Trailer"}
                                        className="w-full h-[50vh] md:h-[70vh]"
                                        allow="autoplay; encrypted-media; fullscreen"
                                        allowFullScreen
                                    />
                                </div>
                            )}

                            {/* No trailer found */}
                            {!trailerLoading && !trailerError && !trailer?.key && (
                                <div className="flex flex-col items-center gap-3 text-center">
                                    <span className="text-5xl">🎬</span>
                                    <p className="text-white text-lg font-semibold">Trailer not available</p>
                                    <p className="text-gray-400 text-sm">No YouTube trailer found for this title.</p>
                                </div>
                            )}

                        </div>
                    </div>
                )}

                {/* Recommended Movies */}
                {recommended.length > 0 && (
                    <div className="mt-10">
                        <h3 className="text-xl font-semibold mb-4">Recommended Movies</h3>
                        <div className="flex gap-4 overflow-x-auto pb-2">
                            {recommended.map((rec) => (
                                <div
                                    key={rec.id}
                                    onClick={() => navigate(`/movie/${rec.id}`, { state: rec })}
                                    className="min-w-[140px] cursor-pointer hover:scale-105 transition flex-shrink-0"
                                >
                                    <img
                                        src={
                                            rec.poster_path
                                                ? `https://image.tmdb.org/t/p/w300${rec.poster_path}`
                                                : "https://via.placeholder.com/140x210?text=No+Image"
                                        }
                                        alt={rec.title}
                                        className="rounded-lg w-full"
                                    />
                                    <p className="text-gray-400 text-xs mt-1 text-center line-clamp-1">
                                        {rec.title || rec.name}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default MovieDetails;