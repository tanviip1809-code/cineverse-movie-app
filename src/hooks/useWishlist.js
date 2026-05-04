// src/hooks/useWishlist.js
import { useState, useEffect } from "react";
import {
    collection,
    doc,
    setDoc,
    deleteDoc,
    onSnapshot,
    query,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

/**
 * Firestore structure:
 *   wishlists/{uid}/movies/{movieId}
 *
 * Each user gets their own sub-collection so data is
 * completely isolated — no sharing between accounts.
 */
export function useWishlist() {
    const { user } = useAuth();
    const [wishlist, setWishlist] = useState([]);
    const [wishlistLoading, setWishlistLoading] = useState(true);

    // ─── Real-time listener ───────────────────────────────────────────────────
    useEffect(() => {
        if (!user) {
            setWishlist([]);
            setWishlistLoading(false);
            return;
        }

        const moviesRef = collection(db, "wishlists", user.uid, "movies");
        const q = query(moviesRef);

        // onSnapshot keeps the list in sync automatically
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const movies = snapshot.docs.map((doc) => doc.data());
            setWishlist(movies);
            setWishlistLoading(false);
        });

        return () => unsubscribe(); // clean up listener on unmount / user change
    }, [user]);

    // ─── Add movie ────────────────────────────────────────────────────────────
    const addToWishlist = async (movie) => {
        if (!user) return;

        // Use movie.id as the Firestore document ID to prevent duplicates naturally
        const movieRef = doc(db, "wishlists", user.uid, "movies", String(movie.id));

        await setDoc(movieRef, {
            id: movie.id,
            title: movie.title || movie.name || "",
            poster_path: movie.poster_path || "",
            backdrop_path: movie.backdrop_path || "",
            overview: movie.overview || "",
            vote_average: movie.vote_average || 0,
            release_date: movie.release_date || "",
            addedAt: Date.now(),
        });
    };

    // ─── Remove movie ─────────────────────────────────────────────────────────
    const removeFromWishlist = async (movieId) => {
        if (!user) return;
        const movieRef = doc(db, "wishlists", user.uid, "movies", String(movieId));
        await deleteDoc(movieRef);
    };

    // ─── Check if movie is already in wishlist ────────────────────────────────
    const isInWishlist = (movieId) => {
        return wishlist.some((m) => m.id === movieId);
    };

    return {
        wishlist,
        wishlistLoading,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
    };
}
