const API_KEY = "fdb19de6314c42882e0e5c538a4a2588";
const BASE_URL = "https://api.themoviedb.org/3";

export const genreMap = {
  all: `${BASE_URL}/trending/movie/week?api_key=${API_KEY}`,
  action: `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=28`,
  comedy: `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=35`,
  horror: `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=27`,
  romance: `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=10749`,
};

export const searchMovies = (query) =>
  `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${query}`;