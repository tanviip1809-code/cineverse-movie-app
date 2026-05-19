function GenreTabs({ activeGenre, setActiveGenre }) {
  const genres = ["all", "action", "comedy", "horror", "romance"];

  return (
    <div className="flex gap-2 sm:gap-4 px-3 sm:px-6 md:px-8 py-4 sm:py-6 overflow-x-auto scrollbar-hide">
      {genres.map((genre) => (
        <button
          key={genre}
          onClick={() => setActiveGenre(genre)}
          className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium capitalize transition shrink-0
            ${
              activeGenre === genre
                ? "bg-red-600 text-white shadow-glow"
                : "bg-white/10 text-gray-300 hover:bg-white/20"
            }`}
        >
          {genre}
        </button>
      ))}
    </div>
  );
}

export default GenreTabs;