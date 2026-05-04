function GenreTabs({ activeGenre, setActiveGenre }) {
  const genres = ["all", "action", "comedy", "horror", "romance"];

  return (
    <div className="flex gap-4 px-8 py-6 overflow-x-auto">
      {genres.map((genre) => (
        <button
          key={genre}
          onClick={() => setActiveGenre(genre)}
          className={`px-5 py-2 rounded-full text-sm font-medium capitalize transition 
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