const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = "https://api.themoviedb.org/3";

if (!API_KEY) {
  console.error("[CineVerse] Missing VITE_TMDB_API_KEY. Add it to your .env file.");
}

export const genreMap = {
  all:     `${BASE_URL}/trending/movie/week?api_key=${API_KEY}`,
  action:  `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=28`,
  comedy:  `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=35`,
  horror:  `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=27`,
  romance: `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=10749`,
};

export const searchMovies = (query) =>
  `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${query}`;