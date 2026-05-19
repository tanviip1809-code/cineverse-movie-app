// src/admin/pages/AdminReviews.jsx
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getAllReviews, deleteReview } from "../services/adminReviewService";
import toast from "react-hot-toast";

function Stars({ rating }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < Math.round(rating / 2) ? "text-amber-400" : "text-gray-700"} style={{ fontSize: 11 }}>★</span>
      ))}
    </div>
  );
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [deleting, setDeleting] = useState(null);

  const load = async () => {
    setLoading(true);
    try { setReviews(await getAllReviews()); } catch { toast.error("Failed to load reviews"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  async function handleDelete(id) {
    if (!confirm("Delete this review?")) return;
    setDeleting(id);
    try { await deleteReview(id); setReviews((p) => p.filter((r) => r.id !== id)); toast.success("Review deleted"); }
    catch { toast.error("Delete failed"); }
    finally { setDeleting(null); }
  }

  const filtered = reviews.filter((r) => {
    if (filter === "low") return (r.rating || 0) <= 4;
    if (filter === "high") return (r.rating || 0) >= 8;
    return true;
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Reviews</h1>
        <p className="text-gray-400 text-sm">Monitor and moderate user reviews.</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {[["all", "All Reviews"], ["high", "High Rated (≥8)"], ["low", "Low Rated (≤4)"]].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`text-xs px-3 py-1.5 rounded-full border transition ${filter === val ? "bg-purple-600/20 border-purple-500/30 text-purple-300" : "border-white/[0.08] text-gray-500 hover:text-gray-300 hover:border-white/20"}`}>
            {label}
          </button>
        ))}
        <span className="ml-auto text-gray-500 text-sm">{filtered.length} review{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <p className="text-4xl mb-3">⭐</p>
          <p className="font-medium text-gray-500">No reviews found</p>
          <p className="text-sm mt-1 text-gray-600">Reviews will appear here once users submit them.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {(r.userName || r.userEmail || "?")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-white font-medium">{r.userName || r.userEmail || "Anonymous"}</span>
                      {r.movieTitle && <span className="text-xs text-purple-300">on "{r.movieTitle}"</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Stars rating={r.rating || 0} />
                      <span className="text-xs text-gray-500">{r.rating ? `${r.rating}/10` : "No rating"}</span>
                    </div>
                    {r.text && <p className="text-sm text-gray-300 mt-2 leading-relaxed">{r.text}</p>}
                    {r.createdAt && (
                      <p className="text-xs text-gray-600 mt-1">
                        {r.createdAt?.toDate?.()?.toLocaleDateString() || ""}
                      </p>
                    )}
                  </div>
                </div>
                <button onClick={() => handleDelete(r.id)} disabled={deleting === r.id}
                  className="shrink-0 p-1.5 rounded-lg bg-red-600/10 border border-red-500/20 text-red-400 hover:bg-red-600/20 transition disabled:opacity-50">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
