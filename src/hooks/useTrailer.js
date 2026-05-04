// src/hooks/useTrailer.js
// Fetches trailer metadata from TMDB and returns the best YouTube-hosted video.

import { useState, useCallback } from "react";

const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE    = "https://api.themoviedb.org/3";

/**
 * Picks the best available YouTube-hosted video from a TMDB results array.
 * Priority: official Trailer (YT) → any Trailer (YT) → any Teaser (YT) → null
 */
function pickBestVideo(results = []) {
    if (!Array.isArray(results) || results.length === 0) return null;

    return (
        results.find((v) => v.site === "YouTube" && v.type === "Trailer" && v.official) ||
        results.find((v) => v.site === "YouTube" && v.type === "Trailer")               ||
        results.find((v) => v.site === "YouTube" && v.type === "Teaser")                ||
        results.find((v) => v.site === "YouTube")                                       ||
        null
    );
}

/**
 * useTrailer(movieId)
 *
 * Returns:
 *   trailer       – best-match video object from TMDB (or null)
 *   loading       – true while fetching
 *   error         – error message string (or null)
 *   fetchTrailer  – call this to trigger the fetch
 */
export function useTrailer() {
    const [trailer, setTrailer] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error,   setError  ] = useState(null);

    const fetchTrailer = useCallback(async (movieId) => {
        if (!movieId) return;

        console.log("[useTrailer] Fetching videos for movie id:", movieId);

        setLoading(true);
        setError(null);
        setTrailer(null);

        try {
            const res  = await fetch(`${BASE}/movie/${movieId}/videos?api_key=${API_KEY}`);
            if (!res.ok) throw new Error(`TMDB responded with status ${res.status}`);

            const data = await res.json();
            console.log("[useTrailer] Raw API response:", data);

            const best = pickBestVideo(data.results);
            console.log("[useTrailer] Selected trailer metadata:", best);

            setTrailer(best); // null if nothing found
        } catch (err) {
            console.error("[useTrailer] Error fetching trailer:", err);
            setError("Failed to load trailer information.");
        } finally {
            setLoading(false);
        }
    }, []);

    return { trailer, loading, error, fetchTrailer };
}
