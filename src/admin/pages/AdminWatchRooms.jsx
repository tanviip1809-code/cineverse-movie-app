// src/admin/pages/AdminWatchRooms.jsx
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { subscribeToRooms, deleteRoom } from "../services/adminRoomService";
import toast from "react-hot-toast";

export default function AdminWatchRooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const unsub = subscribeToRooms((data) => {
      setRooms(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteRoom(deleteId);
      toast.success("Room deleted");
    } catch { toast.error("Delete failed"); }
    finally { setDeleting(false); setDeleteId(null); }
  }

  const active = rooms.filter((r) => r.isPlaying);
  const inactive = rooms.filter((r) => !r.isPlaying);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Watch Rooms</h1>
          <p className="text-gray-400 text-sm">Monitor and manage all live and paused watch parties.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-400/10 border border-green-400/20 px-2.5 py-1 rounded-full font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            {active.length} Live
          </span>
          <span className="text-xs text-gray-500 bg-white/[0.05] border border-white/[0.06] px-2.5 py-1 rounded-full">
            {rooms.length} Total
          </span>
        </div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <p className="text-4xl mb-3">📺</p>
          <p className="font-medium text-gray-500">No watch rooms active</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {rooms.map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`bg-white/[0.03] border rounded-2xl p-5 relative ${r.isPlaying ? "border-green-500/20" : "border-white/[0.06]"}`}>
              {r.isPlaying && (
                <div className="absolute top-3 right-3 flex items-center gap-1.5 text-[10px] text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-0.5 rounded-full font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> LIVE
                </div>
              )}
              <h3 className="text-white font-semibold text-sm truncate pr-14">{r.movieTitle || "Unnamed Room"}</h3>
              <p className="text-gray-600 text-[10px] font-mono mt-0.5">{r.id.slice(0, 16)}…</p>

              <div className="mt-3 space-y-1.5">
                <InfoRow icon="👑" label="Host" value={r.hostUid ? r.hostUid.slice(0, 12) + "…" : "—"} />
                <InfoRow icon="🎬" label="Trailer" value={r.trailerKey || "—"} />
                <InfoRow icon="⏱" label="Status" value={r.isPlaying ? "Playing" : "Paused"} />
                {r.currentTime != null && (
                  <InfoRow icon="🕐" label="Position" value={`${Math.floor((r.currentTime || 0) / 60)}m ${Math.floor((r.currentTime || 0) % 60)}s`} />
                )}
              </div>

              <button onClick={() => setDeleteId(r.id)}
                className="mt-4 w-full text-xs py-1.5 rounded-xl bg-red-600/10 border border-red-500/20 text-red-400 hover:bg-red-600/20 transition">
                Delete Room
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.95 }}
              className="bg-[#0f0f1a] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
              <p className="text-3xl mb-3">📺</p>
              <h3 className="text-white font-semibold mb-1">Delete Room?</h3>
              <p className="text-gray-400 text-sm mb-5">All participants will be disconnected immediately.</p>
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

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span>{icon}</span>
      <span className="text-gray-500">{label}:</span>
      <span className="text-gray-300 truncate">{value}</span>
    </div>
  );
}
