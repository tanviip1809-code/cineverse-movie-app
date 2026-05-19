// src/admin/services/tmdbAdminService.js
// TMDB API helpers used exclusively in the Admin panel for browsing/importing movies.

const API_KEY  = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/w500";
const BACK_BASE = "https://image.tmdb.org/t/p/original";

/** Map TMDB genre IDs → names */
const GENRE_MAP = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
  80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
  14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
  9648: "Mystery", 10749: "Romance", 878: "Sci-Fi", 10770: "TV Movie",
  53: "Thriller", 10752: "War", 37: "Western",
};

/**
 * Resolve genre IDs to names for a TMDB movie.
 * @param {number[]} genreIds
 * @returns {string[]}
 */
export function resolveGenres(genreIds = []) {
  return genreIds.map((id) => GENRE_MAP[id]).filter(Boolean);
}

/**
 * Fetch trending movies from TMDB.
 * @param {number} page
 * @returns {Promise<{ results: any[], totalPages: number }>}
 */
export async function getTrendingTmdb(page = 1) {
  const res = await fetch(`${BASE_URL}/trending/movie/week?api_key=${API_KEY}&page=${page}`);
  const data = await res.json();
  return {
    results: (data.results || []).map(normalizeTmdb),
    totalPages: data.total_pages || 1,
  };
}

/**
 * Search TMDB movies.
 * @param {string} query
 * @param {number} page
 * @returns {Promise<{ results: any[], totalPages: number }>}
 */
export async function searchTmdb(query, page = 1) {
  if (!query?.trim()) return getTrendingTmdb(page);
  const res = await fetch(
    `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&page=${page}`
  );
  const data = await res.json();
  return {
    results: (data.results || []).map(normalizeTmdb),
    totalPages: data.total_pages || 1,
  };
}

/**
 * Fetch the YouTube trailer key for a TMDB movie.
 * @param {number} tmdbId
 * @returns {Promise<string | null>} YouTube video key or null
 */
export async function fetchTmdbTrailer(tmdbId) {
  try {
    const res  = await fetch(`${BASE_URL}/movie/${tmdbId}/videos?api_key=${API_KEY}`);
    const data = await res.json();
    const trailer = (data.results || []).find(
      (v) => v.type === "Trailer" && v.site === "YouTube"
    );
    return trailer?.key ?? null;
  } catch {
    return null;
  }
}

/**
 * Normalize a raw TMDB movie object into a clean shape for admin use.
 */
export function normalizeTmdb(m) {
  return {
    tmdbId:      m.id,
    title:       m.title || m.name || "",
    overview:    m.overview || "",
    poster:      m.poster_path  ? `${IMG_BASE}${m.poster_path}`   : "",
    backdrop:    m.backdrop_path ? `${BACK_BASE}${m.backdrop_path}` : "",
    genres:      resolveGenres(m.genre_ids || []),
    rating:      parseFloat((m.vote_average || 0).toFixed(1)),
    releaseDate: m.release_date || "",
    popularity:  m.popularity || 0,
  };
}
