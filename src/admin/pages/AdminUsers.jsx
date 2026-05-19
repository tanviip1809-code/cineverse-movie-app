// src/admin/pages/AdminUsers.jsx
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getAllUsers, setUserBlocked, deleteUserDoc } from "../services/adminUserService";
import toast from "react-hot-toast";

function fmt(ts) {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ProviderBadge({ provider }) {
  const map = {
    "password":            { label: "Email",   cls: "bg-blue-600/20 text-blue-300 border-blue-500/20" },
    "google.com":          { label: "Google",  cls: "bg-red-600/20 text-red-300 border-red-500/20" },
    "github.com":          { label: "GitHub",  cls: "bg-gray-600/20 text-gray-300 border-gray-500/20" },
    "facebook.com":        { label: "Facebook",cls: "bg-indigo-600/20 text-indigo-300 border-indigo-500/20" },
  };
  const { label, cls } = map[provider] || { label: provider || "Email", cls: "bg-gray-600/20 text-gray-300 border-gray-500/20" };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${cls}`}>{label}</span>;
}

function UserAvatar({ user }) {
  const name = user.displayName || user.email || "?";
  const initial = name[0].toUpperCase();
  if (user.photoURL) {
    return (
      <img
        src={user.photoURL} alt={name}
        className="w-8 h-8 rounded-full object-cover ring-2 ring-white/10 shrink-0"
        onError={(e) => { e.currentTarget.style.display = "none"; }}
      />
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
      {initial}
    </div>
  );
}

export default function AdminUsers() {
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [processing, setProcessing] = useState({});

  const load = async () => {
    setLoading(true);
    try { setUsers(await getAllUsers()); }
    catch { toast.error("Failed to load users"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = users.filter((u) =>
    (u.displayName || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const setProc = (uid, key, val) =>
    setProcessing((p) => ({ ...p, [uid + key]: val }));

  async function handleBlock(uid, blocked) {
    setProc(uid, "block", true);
    try {
      await setUserBlocked(uid, !blocked);
      setUsers((p) => p.map((u) => u.uid === uid ? { ...u, blocked: !blocked } : u));
      toast.success(blocked ? "User unblocked" : "User blocked");
    } catch { toast.error("Failed to update"); }
    finally { setProc(uid, "block", false); }
  }

  async function handleDelete(uid) {
    if (!window.confirm("Delete this user's Firestore data? Auth account remains intact.")) return;
    try {
      await deleteUserDoc(uid);
      setUsers((p) => p.filter((u) => u.uid !== uid));
      toast.success("User record deleted");
    } catch { toast.error("Delete failed"); }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">User Management</h1>
        <p className="text-gray-400 text-sm">All registered users — synced automatically from Firebase Auth.</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="flex-1 min-w-[200px] bg-white/[0.04] border border-white/[0.08] text-white text-sm px-4 py-2.5 rounded-xl outline-none focus:border-purple-500/50 placeholder-gray-600 transition max-w-sm" />
        <span className="text-gray-500 text-sm">{filtered.length} user{filtered.length !== 1 ? "s" : ""}</span>
        <button onClick={load} className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:text-white text-sm transition">↻ Refresh</button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <p className="text-4xl mb-3">👥</p>
          <p className="font-medium text-gray-500">No users found</p>
          <p className="text-xs mt-1 text-gray-600">Users appear here automatically when they log in</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {["User", "Email", "Provider", "Joined", "Last Login", "Status", "Actions"].map((h) => (
                    <th key={h} className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map((u, i) => (
                  <motion.tr key={u.uid} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay: i * 0.03 }}
                    className="hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar user={u} />
                        <span className="text-sm text-white font-medium">{u.displayName || "Unknown"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">{u.email || "—"}</td>
                    <td className="px-4 py-3"><ProviderBadge provider={u.provider} /></td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fmt(u.createdAt)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fmt(u.lastLogin)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${u.blocked ? "bg-red-600/20 text-red-300 border-red-500/20" : "bg-emerald-600/20 text-emerald-300 border-emerald-500/20"}`}>
                        {u.blocked ? "Blocked" : "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleBlock(u.uid, u.blocked)} disabled={processing[u.uid + "block"]}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition ${u.blocked ? "bg-emerald-600/20 border-emerald-500/30 text-emerald-300" : "bg-orange-600/20 border-orange-500/30 text-orange-300"}`}>
                          {u.blocked ? "Unblock" : "Block"}
                        </button>
                        <button onClick={() => handleDelete(u.uid)}
                          className="text-xs px-2 py-1 rounded-lg bg-red-600/15 border border-red-500/20 text-red-400 hover:bg-red-600/25 transition">
                          Delete
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((u, i) => (
              <motion.div key={u.uid} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay: i * 0.04 }}
                className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <UserAvatar user={u} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white font-medium truncate">{u.displayName || "Unknown"}</p>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${u.blocked ? "bg-red-600/20 text-red-300" : "bg-emerald-600/20 text-emerald-300"}`}>
                    {u.blocked ? "Blocked" : "Active"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
                  <span><ProviderBadge provider={u.provider} /></span>
                  <span>Joined: {fmt(u.createdAt)}</span>
                  <span>Last seen: {fmt(u.lastLogin)}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => handleBlock(u.uid, u.blocked)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition ${u.blocked ? "bg-emerald-600/20 border-emerald-500/30 text-emerald-300" : "bg-orange-600/20 border-orange-500/30 text-orange-300"}`}>
                    {u.blocked ? "Unblock" : "Block"}
                  </button>
                  <button onClick={() => handleDelete(u.uid)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-red-600/15 border border-red-500/20 text-red-400 hover:bg-red-600/25 transition">
                    Delete
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
