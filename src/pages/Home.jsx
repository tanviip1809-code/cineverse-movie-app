// src/pages/Home.jsx
import { useState, useEffect } from "react";
import Banner from "../components/Banner";
import Row from "../components/Row";
import GenreTabs from "../components/GenreTabs";
import { genreMap } from "../services/api";
import { useFirestoreMovies, toRowShape } from "../hooks/useFirestoreMovies";

const API_KEY = import.meta.env.VITE_TMDB_API_KEY;

function Home() {
    const [activeGenre, setActiveGenre]         = useState("all");
    const [continueWatching, setContinueWatching] = useState([]);
    const [recentMovies, setRecentMovies]       = useState([]);

    // ── Firestore movies (admin-imported TMDB + custom) ───────────────────────
    const { movies: firestoreMovies, loading: fsLoading } = useFirestoreMovies();

    // Separate featured and all Firestore movies, normalized for Row
    const cineversePicks = firestoreMovies
      .filter((m) => !m.featured)   // non-featured: general picks
      .map(toRowShape);

    const featuredPicks = firestoreMovies
      .filter((m) => m.featured)    // featured: shown first
      .map(toRowShape);

    useEffect(() => {
        setRecentMovies(JSON.parse(localStorage.getItem("recent")) || []);
        setContinueWatching(JSON.parse(localStorage.getItem("continueWatching")) || []);
    }, []);

    return (
        <div className="bg-black min-h-screen">
            {/* Navbar is rendered globally in App.jsx — do NOT render it here */}

            <Banner />

            <GenreTabs activeGenre={activeGenre} setActiveGenre={setActiveGenre} />

            {/* ── CineVerse Featured Picks (admin-selected) ─── */}
            {!fsLoading && featuredPicks.length > 0 && (
                <Row
                    title="✨ Featured by CineVerse"
                    movies={featuredPicks}
                />
            )}

            {/* ── Admin-imported / custom movies ─────────────── */}
            {!fsLoading && cineversePicks.length > 0 && (
                <Row
                    title="🎬 CineVerse Picks"
                    movies={cineversePicks}
                />
            )}

            {recentMovies.length > 0 && (
                <Row title="Recently Viewed" movies={recentMovies} />
            )}

            {continueWatching.length > 0 && (
                <Row title="Continue Watching" movies={continueWatching} />
            )}

            {/* ── Live TMDB rows ──────────────────────────────── */}
            <Row title={activeGenre} fetchUrl={genreMap[activeGenre]} />
        </div>
    );
}

export default Home;