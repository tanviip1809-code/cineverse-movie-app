// src/hooks/useFirestoreMovies.js
// Fetches all movies stored in Firestore (both source:"tmdb" and source:"custom").
// Used by the Homepage to merge Firestore movies with live TMDB rows.
import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Returns { movies, loading } where movies is an array of Firestore movie docs.
 * Each movie has the shape: { id, title, posterURL, backdropURL, genres, rating,
 * releaseDate, trailerKey, source, tmdbId?, description, featured }
 */
export function useFirestoreMovies() {
  const [movies, setMovies]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetch() {
      try {
        const q    = query(collection(db, "movies"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        if (!cancelled) {
          setMovies(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        }
      } catch (err) {
        console.warn("[CineVerse] useFirestoreMovies: failed to load", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetch();
    return () => { cancelled = true; };
  }, []);

  return { movies, loading };
}

/**
 * Normalizes a Firestore movie to match the shape expected by the Row component
 * (which is designed for TMDB movies with poster_path, genre_ids, etc.)
 * We convert to TMDB-like shape so it renders without modifying Row.jsx.
 */
export function toRowShape(firestoreMovie) {
  return {
    id:           firestoreMovie.id,          // Firestore doc ID (string)
    firestoreId:  firestoreMovie.id,
    title:        firestoreMovie.title   || "",
    name:         firestoreMovie.title   || "",
    overview:     firestoreMovie.description || "",
    poster_path:  null,                       // Row uses this — but we override below
    posterURL:    firestoreMovie.posterURL  || "",
    backdropURL:  firestoreMovie.backdropURL || "",
    backdrop_path: null,
    genre_ids:    [],
    genres:       firestoreMovie.genres  || [],
    vote_average: firestoreMovie.rating  || 0,
    release_date: firestoreMovie.releaseDate || "",
    trailerKey:   firestoreMovie.trailerKey  || "",
    source:       firestoreMovie.source  || "custom",
    tmdbId:       firestoreMovie.tmdbId  || null,
    featured:     firestoreMovie.featured || false,
  };
}
