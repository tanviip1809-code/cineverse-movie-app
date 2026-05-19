// src/pages/MyList.jsx
import { useWishlist } from "../hooks/useWishlist";

function MyList() {
  const { wishlist, wishlistLoading, removeFromWishlist } = useWishlist();

  if (wishlistLoading) {
    return (
      <div className="bg-black min-h-screen pt-24 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading your list...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen pt-20 sm:pt-24 px-4 sm:px-6 md:px-8">
      <h1 className="text-white text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">My List ❤️</h1>

      {wishlist.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-20 gap-3">
          <p className="text-5xl">🎬</p>
          <p className="text-gray-400 text-lg">Your wishlist is empty.</p>
          <p className="text-gray-600 text-sm">Go to a movie and click ❤️ My List to add it here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {wishlist.map((movie) => (
            <div key={movie.id} className="relative group">
              {/* Poster */}
              <img
                src={
                  movie.poster_path
                    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                    : "https://via.placeholder.com/300x450?text=No+Image"
                }
                alt={movie.title}
                className="rounded-lg w-full object-cover group-hover:scale-105 transition duration-300"
              />

              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition duration-300 rounded-lg flex flex-col justify-end p-3 gap-2">
                <p className="text-white text-sm font-semibold line-clamp-2">{movie.title}</p>
                <p className="text-yellow-400 text-xs">⭐ {movie.vote_average?.toFixed(1)}</p>
                <button
                  onClick={() => removeFromWishlist(movie.id)}
                  className="mt-1 bg-red-600 hover:bg-red-700 text-white text-xs py-1 rounded transition"
                >
                  ✕ Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyList;