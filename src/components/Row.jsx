import { useEffect, useState, useRef } from "react";
import { ChevronLeft, ChevronRight, Heart, Play, Plus, Check, Info } from "lucide-react";
// import MovieModal from "./MovieModal";
import { useNavigate } from "react-router-dom";
import { genreMap } from "../utils/genres";
import { useWishlist } from "../hooks/useWishlist";

const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

function Row({ title, fetchUrl, movies: passedMovies }) {
    const [movies, setMovies] = useState([]);
    const rowRef = useRef();
    const navigate = useNavigate();
    const [hoveredMovie, setHoveredMovie] = useState(null);
    const [trailerKey, setTrailerKey] = useState(null);
    const { wishlist, addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
    const displayMovies =
        passedMovies && passedMovies.length > 0 ? passedMovies : movies;

    // useEffect(() => {
    //     fetch(fetchUrl)
    //         .then((res) => res.json())
    //         .then((data) => setMovies(data.results || []))
    //         .catch((err) => console.error(err));
    // }, [fetchUrl]);

    useEffect(() => {
        if ((!passedMovies || passedMovies.length === 0) && fetchUrl) {
            fetch(fetchUrl)
                .then((res) => res.json())
                .then((data) => setMovies(data.results || []));
        }
    }, [fetchUrl, passedMovies]);

    const scroll = (direction) => {
        const scrollAmount = 600;
        rowRef.current.scrollBy({
            left: direction === "left" ? -scrollAmount : scrollAmount,
            behavior: "smooth",
        });
    };

    const fetchTrailer = async (movieId) => {
        try {
            const res = await fetch(
                `https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=fdb19de6314c42882e0e5c538a4a2588`
            );
            const data = await res.json();

            const trailer = data.results.find(
                (vid) => vid.type === "Trailer" && vid.site === "YouTube"
            );

            if (trailer) {
                setTrailerKey(trailer.key);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const toggleWishlist = async (movie) => {
        if (isInWishlist(movie.id)) {
            await removeFromWishlist(movie.id);
        } else {
            await addToWishlist(movie);
        }
    };

    return (
        <div className="px-8 mb-12">
            {/* TITLE */}
            <h2 className="text-white text-xl font-semibold mb-4 tracking-wide">
                {title}
            </h2>

            {/* ROW WRAPPER */}
            <div className="relative">

                {/* LEFT BUTTON */}
                <button
                    onClick={() => scroll("left")}
                    className="absolute left-0 top-0 bottom-0 z-20 w-12 flex items-center justify-center 
          bg-gradient-to-r from-black/80 to-transparent opacity-0 hover:opacity-100 transition"
                >
                    <ChevronLeft size={28} className="text-white" />
                </button>

                {/* MOVIES */}
                <div
                    ref={rowRef}
                    className="flex gap-5 overflow-x-scroll scrollbar-hide scroll-smooth px-10"
                >
                    {displayMovies.map((movie) => (
                        <div
                            key={movie.id}
                            onClick={() => navigate(`/movie/${movie.id}`, { state: movie })}
                            className="min-w-[180px] max-w-[180px] group relative cursor-pointer hover:scale-110 transition duration-300"
                            onMouseEnter={() => {
                                setHoveredMovie(movie.id);
                                fetchTrailer(movie.id);
                            }}
                            onMouseLeave={() => {
                                setHoveredMovie(null);
                                setTrailerKey(null);
                            }}
                        >
                            <div
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleWishlist(movie);
                                }}
                                className="absolute top-2 right-2 z-30 bg-black/60 p-2 rounded-full backdrop-blur-sm hover:scale-110 transition"
                            >
                                <Heart
                                    size={18}
                                    className={`transition ${isInWishlist(movie.id)
                                        ? "fill-red-500 text-red-500"
                                        : "text-white"
                                        }`}
                                />
                            </div>
                            <img
                                src={`${IMAGE_BASE_URL}${movie.poster_path}`}
                                alt={movie.title}
                                className="rounded-lg object-cover w-full h-[260px] 
                transition duration-300 group-hover:scale-110 group-hover:z-10"
                            />
                            <div className="mt-2 flex flex-wrap gap-1">
                                {movie.genre_ids?.slice(0, 2).map((id) => (
                                    <span
                                        key={id}
                                        className="text-[10px] px-2 py-0.5 bg-black/70 backdrop-blur-sm text-white rounded-full border border-white/20"
                                    >
                                        {genreMap[id]}
                                    </span>
                                ))}
                            </div>

                            {hoveredMovie === movie.id && trailerKey && (
                                <iframe
                                    className="absolute top-0 left-0 w-full h-full rounded-lg"
                                    src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0`}
                                    allow="autoplay"
                                />
                            )}

                            {/* HOVER OVERLAY */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition rounded-lg flex items-end p-2">
                                <p className="text-xs text-white font-medium line-clamp-2">
                                    {movie.title || movie.name}
                                </p>
                            </div>
                        </div>
                    ))}

                </div>

                {/* RIGHT BUTTON */}
                <button
                    onClick={() => scroll("right")}
                    className="absolute right-0 top-0 bottom-0 z-20 w-12 flex items-center justify-center 
          bg-gradient-to-l from-black/80 to-transparent opacity-0 hover:opacity-100 transition"
                >
                    <ChevronRight size={28} className="text-white" />
                </button>

            </div>
        </div>
    );
}

export default Row;