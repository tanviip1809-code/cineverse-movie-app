import { useEffect, useState } from "react";
import { useWishlist } from "../hooks/useWishlist";

const API_KEY = import.meta.env.VITE_TMDB_API_KEY;

function Banner() {
    const [movie, setMovie] = useState(null);
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

    const truncate = (str, n) => {
        return str?.length > n ? str.substr(0, n - 1) + "..." : str;
    };

    const handlePlay = () => {
        console.log("Playing:", movie.title);

        // Temporary: open YouTube search
        window.open(
            `https://www.youtube.com/results?search_query=${movie.title}+trailer`,
            "_blank"
        );
    };

    const addToList = async () => {
        if (!movie) return;
        if (isInWishlist(movie.id)) {
            await removeFromWishlist(movie.id);
        } else {
            await addToWishlist(movie);
        }
    };

    useEffect(() => {
        fetch(
            `https://api.themoviedb.org/3/trending/movie/week?api_key=${API_KEY}`
        )
            .then((res) => res.json())
            .then((data) => {
                const randomMovie =
                    data.results[Math.floor(Math.random() * data.results.length)];
                setMovie(randomMovie);
            });
    }, []);

    if (!movie) return null;

    return (
        <div className="relative h-screen w-full animate-fadeIn">


            {/* Background */}
            <img
                src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`}
                alt={movie.title}
                className="w-full h-full object-cover"
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-transparent to-transparent"></div>

            {/* Content */}
            <div className="absolute bottom-24 left-6 md:left-16 text-white max-w-xl">

                <h1 className="text-4xl md:text-6xl font-bold mb-4">
                    {movie.title || movie.name}
                </h1>

                <p className="text-sm md:text-base text-gray-300 mb-6">
                    {truncate(movie.overview, 120)}
                </p>

                <div className="flex gap-4">

                    <button
                        onClick={handlePlay}
                        className="px-6 py-2 bg-white text-black font-semibold rounded-md hover:bg-gray-200 transition shadow-lg"
                    >
                        ▶ Play
                    </button>

                    <button
                        onClick={addToList}
                        className="px-6 py-2 bg-white/20 backdrop-blur-md rounded-md hover:bg-white/30 transition shadow-lg"
                    >
                        {movie && isInWishlist(movie.id) ? "❌ Remove" : "+ My List"}
                    </button>

                </div>
            </div>
        </div>
    );
}

export default Banner;