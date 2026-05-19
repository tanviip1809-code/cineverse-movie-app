// src/admin/pages/AdminMovies.jsx
import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getAllMovies, addMovie, updateMovie, deleteMovie,
  toggleFeatured, importTmdbMovie,
} from "../services/adminMovieService";
import {
  getTrendingTmdb, searchTmdb, fetchTmdbTrailer,
} from "../services/tmdbAdminService";
import toast from "react-hot-toast";

const GENRE_OPTIONS = [
  "Action","Adventure","Animation","Comedy","Crime","Documentary",
  "Drama","Family","Fantasy","Horror","Mystery","Romance","Sci-Fi","Thriller",
];
const EMPTY_FORM = {
  title:"", description:"", posterURL:"", backdropURL:"",
  trailerKey:"", genres:[], releaseDate:"", rating:"", featured:false,
};

// ── Custom Movie Modal ────────────────────────────────────────────────────────
function CustomMovieModal({ movie, onClose, onSaved }) {
  const [form, setForm] = useState(movie ? { ...movie } : { ...EMPTY_FORM });
  const [posterFile, setPosterFile] = useState(null);
  const [backdropFile, setBackdropFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const posterRef = useRef(); const backdropRef = useRef();

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleGenre = (g) =>
    set("genres", form.genres.includes(g) ? form.genres.filter((x) => x !== g) : [...form.genres, g]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    try {
      if (movie) { await updateMovie(movie.id, form, posterFile, backdropFile); toast.success("Movie updated!"); }
      else { await addMovie(form, posterFile, backdropFile); toast.success("Movie added!"); }
      onSaved(); onClose();
    } catch (err) { toast.error(err.message || "Failed to save"); }
    finally { setSaving(false); }
  }

  const inp = "w-full bg-white/[0.04] border border-white/[0.08] text-white text-sm px-3 py-2.5 rounded-xl outline-none focus:border-purple-500/50 placeholder-gray-600 transition";

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.95 }}
        className="bg-[#0f0f1a] border border-white/[0.08] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-white font-semibold">{movie ? "Edit Movie" : "Add Custom Movie"}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-400 mb-1.5 block">Title *</label>
              <input className={inp} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Movie title" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-400 mb-1.5 block">Description</label>
              <textarea className={inp + " resize-none"} rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Movie description..." />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Poster Image</label>
              <div className="flex gap-2">
                <input className={inp} value={form.posterURL} onChange={(e) => set("posterURL", e.target.value)} placeholder="Paste URL or upload →" />
                <button type="button" onClick={() => posterRef.current?.click()} className="shrink-0 px-3 py-2 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-300 text-xs hover:bg-purple-600/30 transition">Upload</button>
                <input ref={posterRef} type="file" accept="image/*" className="hidden" onChange={(e) => setPosterFile(e.target.files[0] || null)} />
              </div>
              {posterFile && <p className="text-xs text-purple-400 mt-1">📎 {posterFile.name}</p>}
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Backdrop Image</label>
              <div className="flex gap-2">
                <input className={inp} value={form.backdropURL} onChange={(e) => set("backdropURL", e.target.value)} placeholder="Paste URL or upload →" />
                <button type="button" onClick={() => backdropRef.current?.click()} className="shrink-0 px-3 py-2 rounded-xl bg-pink-600/20 border border-pink-500/30 text-pink-300 text-xs hover:bg-pink-600/30 transition">Upload</button>
                <input ref={backdropRef} type="file" accept="image/*" className="hidden" onChange={(e) => setBackdropFile(e.target.files[0] || null)} />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Trailer YouTube Key</label>
              <input className={inp} value={form.trailerKey} onChange={(e) => set("trailerKey", e.target.value)} placeholder="e.g. dQw4w9WgXcQ" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Release Date</label>
              <input type="date" className={inp} value={form.releaseDate} onChange={(e) => set("releaseDate", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Rating (0–10)</label>
              <input type="number" min="0" max="10" step="0.1" className={inp} value={form.rating} onChange={(e) => set("rating", e.target.value)} placeholder="7.5" />
            </div>
            <div className="flex items-center gap-2 self-end pb-1">
              <button type="button" onClick={() => set("featured", !form.featured)}
                className={`relative w-10 h-5 rounded-full transition-colors ${form.featured ? "bg-purple-600" : "bg-white/10"}`}>
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.featured ? "translate-x-5" : ""}`} />
              </button>
              <span className="text-sm text-gray-300">Featured Movie</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Genres</label>
            <div className="flex flex-wrap gap-1.5">
              {GENRE_OPTIONS.map((g) => (
                <button key={g} type="button" onClick={() => toggleGenre(g)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition ${form.genres.includes(g) ? "bg-purple-600/30 border-purple-500/40 text-purple-300" : "border-white/[0.08] text-gray-500 hover:text-gray-300"}`}>
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-white/[0.08] text-gray-400 hover:text-white text-sm transition">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition">
              {saving ? "Saving…" : movie ? "Save Changes" : "Add Movie"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── TMDB Browser Tab ──────────────────────────────────────────────────────────
function TmdbBrowser({ importedIds, onImported }) {
  const [query, setQuery]         = useState("");
  const [results, setResults]     = useState([]);
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]     = useState(false);
  const [importing, setImporting] = useState({});
  const debounceRef               = useRef(null);

  const loadMovies = useCallback(async (q, p) => {
    setLoading(true);
    try {
      const { results: res, totalPages: tp } = q.trim()
        ? await searchTmdb(q, p)
        : await getTrendingTmdb(p);
      setResults(res);
      setTotalPages(Math.min(tp, 20));
    } catch { toast.error("Failed to fetch TMDB movies"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setPage(1); loadMovies(query, 1); }, 400);
  }, [query, loadMovies]);

  useEffect(() => { loadMovies(query, page); }, [page]); // eslint-disable-line

  async function handleImport(movie) {
    setImporting((p) => ({ ...p, [movie.tmdbId]: true }));
    try {
      const trailerKey = await fetchTmdbTrailer(movie.tmdbId);
      await importTmdbMovie(movie, trailerKey);
      toast.success(`"${movie.title}" added to CineVerse!`);
      onImported(movie.tmdbId);
    } catch (err) { toast.error(err.message || "Import failed"); }
    finally { setImporting((p) => ({ ...p, [movie.tmdbId]: false })); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Search TMDB movies…"
          className="flex-1 bg-white/[0.04] border border-white/[0.08] text-white text-sm px-4 py-2.5 rounded-xl outline-none focus:border-purple-500/50 placeholder-gray-600 transition max-w-sm"
        />
        <span className="text-gray-500 text-sm">{query.trim() ? "Search results" : "Trending"}</span>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-64 rounded-xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {results.map((movie) => {
            const isImported = importedIds.has(movie.tmdbId);
            return (
              <motion.div key={movie.tmdbId} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
                className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden group hover:border-purple-500/30 transition">
                <div className="relative h-48 bg-white/[0.02]">
                  {movie.poster ? (
                    <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-700 text-3xl">🎬</div>
                  )}
                  {isImported && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-emerald-400 text-xs font-bold bg-emerald-600/20 border border-emerald-500/30 px-3 py-1.5 rounded-full">✓ Added</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-black/70 text-amber-400 text-[10px] font-bold px-1.5 py-0.5 rounded-lg">
                    ⭐ {movie.rating}
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="text-white text-xs font-semibold truncate">{movie.title}</h3>
                  <p className="text-gray-500 text-[10px] mt-0.5">{movie.releaseDate?.slice(0,4) || "—"}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {movie.genres.slice(0,2).map((g) => (
                      <span key={g} className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-600/15 text-purple-400">{g}</span>
                    ))}
                  </div>
                  <button
                    onClick={() => !isImported && handleImport(movie)}
                    disabled={isImported || importing[movie.tmdbId]}
                    className={`w-full mt-2.5 text-[11px] py-1.5 rounded-lg font-semibold transition ${
                      isImported
                        ? "bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 cursor-default"
                        : "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90 disabled:opacity-50"
                    }`}>
                    {importing[movie.tmdbId] ? "Adding…" : isImported ? "✓ In CineVerse" : "+ Add to CineVerse"}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-center gap-2 pt-2">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
          className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:text-white disabled:opacity-30 transition text-sm">← Prev</button>
        <span className="text-gray-500 text-sm px-3">Page {page} / {totalPages}</span>
        <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
          className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:text-white disabled:opacity-30 transition text-sm">Next →</button>
      </div>
    </div>
  );
}

// ── My Movies Tab ─────────────────────────────────────────────────────────────
function MyMoviesTab({ onOpenAdd }) {
  const [movies, setMovies]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [editMovie, setEditMovie]   = useState(null);
  const [deleteId, setDeleteId]     = useState(null);
  const [deleting, setDeleting]     = useState(false);

  const load = async () => {
    setLoading(true);
    try { setMovies(await getAllMovies()); }
    catch { toast.error("Failed to load movies"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = movies.filter((m) => m.title?.toLowerCase().includes(search.toLowerCase()));

  async function handleDelete() {
    setDeleting(true);
    try { await deleteMovie(deleteId); toast.success("Deleted"); setMovies((p) => p.filter((m) => m.id !== deleteId)); }
    catch { toast.error("Delete failed"); }
    finally { setDeleting(false); setDeleteId(null); }
  }

  async function handleToggleFeatured(id, current) {
    try { await toggleFeatured(id, !current); setMovies((p) => p.map((m) => m.id === id ? { ...m, featured: !current } : m)); }
    catch { toast.error("Failed to update"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search saved movies..."
          className="flex-1 bg-white/[0.04] border border-white/[0.08] text-white text-sm px-4 py-2.5 rounded-xl outline-none focus:border-purple-500/50 placeholder-gray-600 transition max-w-sm" />
        <span className="text-gray-500 text-sm">{filtered.length} movie{filtered.length !== 1 ? "s" : ""}</span>
        <button onClick={onOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-semibold hover:opacity-90 transition shrink-0">
          + Custom Movie
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-52 rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <p className="text-4xl mb-3">🎬</p>
          <p className="font-medium text-gray-500">No movies saved yet</p>
          <p className="text-sm mt-1">Import from the TMDB Browser or add a Custom Movie</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m, i) => (
            <motion.div key={m.id} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay: i * 0.04 }}
              className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-white/10 transition group">
              <div className="relative h-36 bg-white/[0.02]">
                {m.posterURL ? (
                  <img src={m.posterURL} alt={m.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-700 text-4xl">🎬</div>
                )}
                <div className="absolute top-2 left-2 flex gap-1">
                  {m.featured && <span className="text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded-full font-semibold">Featured</span>}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${m.source === "tmdb" ? "bg-blue-600/80 text-white" : "bg-emerald-600/80 text-white"}`}>
                    {m.source === "tmdb" ? "TMDB" : "Custom"}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-white font-semibold text-sm truncate">{m.title}</h3>
                <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{m.description || "No description"}</p>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {(m.genres || []).slice(0, 3).map((g) => (
                    <span key={g} className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-600/15 text-purple-300">{g}</span>
                  ))}
                  {m.rating > 0 && <span className="ml-auto text-[11px] text-amber-400 font-semibold">⭐ {m.rating}</span>}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  {m.source !== "tmdb" && (
                    <button onClick={() => setEditMovie(m)} className="flex-1 text-xs py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-gray-300 hover:text-white hover:bg-white/10 transition">Edit</button>
                  )}
                  <button onClick={() => handleToggleFeatured(m.id, m.featured)}
                    className={`flex-1 text-xs py-1.5 rounded-lg border transition ${m.featured ? "bg-purple-600/20 border-purple-500/30 text-purple-300" : "bg-white/[0.05] border-white/[0.08] text-gray-400 hover:text-purple-300"}`}>
                    {m.featured ? "Unfeature" : "Feature"}
                  </button>
                  <button onClick={() => setDeleteId(m.id)} className="p-1.5 rounded-lg bg-red-600/10 border border-red-500/20 text-red-400 hover:bg-red-600/20 transition">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {editMovie && <CustomMovieModal movie={editMovie} onClose={() => setEditMovie(null)} onSaved={load} />}
        {deleteId && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.95 }}
              className="bg-[#0f0f1a] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
              <p className="text-3xl mb-3">🗑️</p>
              <h3 className="text-white font-semibold mb-1">Delete Movie?</h3>
              <p className="text-gray-400 text-sm mb-5">This will permanently remove this movie.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-2 rounded-xl border border-white/[0.08] text-gray-400 hover:text-white text-sm transition">Cancel</button>
                <button onClick={handleDelete} disabled={deleting}
                  className="flex-1 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-500 disabled:opacity-50 transition">
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminMovies() {
  const [activeTab, setActiveTab] = useState("tmdb");
  const [showAddCustom, setShowAddCustom] = useState(false);
  // Track which TMDB IDs have already been imported (to show "Added" badge)
  const [importedTmdbIds, setImportedTmdbIds] = useState(new Set());

  // Load already-imported TMDB IDs on mount
  useEffect(() => {
    getAllMovies().then((movies) => {
      const ids = new Set(movies.filter((m) => m.source === "tmdb").map((m) => m.tmdbId));
      setImportedTmdbIds(ids);
    }).catch(() => {});
  }, []);

  const handleImported = (tmdbId) => {
    setImportedTmdbIds((prev) => new Set([...prev, tmdbId]));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Movie Management</h1>
          <p className="text-gray-400 text-sm">Browse TMDB, import movies, or add custom ones.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/[0.06] pb-0">
        {[
          { id: "tmdb",   label: "🎬 TMDB Browser",  desc: "Browse & import from TMDB" },
          { id: "movies", label: "📁 My Movies",      desc: "Imported & custom movies" },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-xl border-b-2 transition-all ${
              activeTab === tab.id
                ? "border-purple-500 text-purple-300 bg-purple-600/10"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} transition={{ duration:0.15 }}>
          {activeTab === "tmdb"
            ? <TmdbBrowser importedIds={importedTmdbIds} onImported={handleImported} />
            : <MyMoviesTab onOpenAdd={() => setShowAddCustom(true)} />
          }
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showAddCustom && <CustomMovieModal onClose={() => setShowAddCustom(false)} onSaved={() => { setShowAddCustom(false); if (activeTab !== "movies") setActiveTab("movies"); }} />}
      </AnimatePresence>
    </div>
  );
}
