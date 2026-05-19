// src/admin/pages/AdminDashboard.jsx
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer,
} from "recharts";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { db } from "../../firebase";
import { useAdminStats } from "../hooks/useAdminStats";
import StatCard from "../components/StatCard";

const CHART_COLORS = ["#9333ea", "#ec4899", "#6366f1", "#06b6d4", "#10b981", "#f59e0b"];

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#12121e] border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function AdminDashboard() {
  const { stats, loading } = useAdminStats();
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentRooms, setRecentRooms] = useState([]);
  const [genreData, setGenreData] = useState([]);
  const [weeklyData] = useState(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return { day: d.toLocaleDateString("en", { weekday: "short" }), users: Math.floor(Math.random() * 10), rooms: Math.floor(Math.random() * 5) };
    })
  );

  useEffect(() => {
    async function load() {
      const [u, r, m] = await Promise.allSettled([
        getDocs(query(collection(db, "users"), limit(5))),
        getDocs(query(collection(db, "rooms"), limit(5))),
        getDocs(collection(db, "movies")),
      ]);
      if (u.status === "fulfilled") setRecentUsers(u.value.docs.map((d) => ({ id: d.id, ...d.data() })));
      if (r.status === "fulfilled") setRecentRooms(r.value.docs.map((d) => ({ id: d.id, ...d.data() })));
      if (m.status === "fulfilled") {
        const gc = {};
        m.value.docs.forEach((d) => (d.data().genres || []).forEach((g) => { gc[g] = (gc[g] || 0) + 1; }));
        setGenreData(Object.entries(gc).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6));
      }
    }
    load();
  }, []);

  const cards = [
    { label: "Total Users",     value: stats.totalUsers,     icon: "👥", color: "purple", delay: 0    },
    { label: "Custom Movies",   value: stats.totalMovies,    icon: "🎬", color: "pink",   delay: 0.05 },
    { label: "Watch Rooms",     value: stats.totalRooms,     icon: "📺", color: "blue",   delay: 0.1  },
    { label: "Reviews",         value: stats.totalReviews,   icon: "⭐", color: "amber",  delay: 0.15 },
    { label: "Active Rooms",    value: stats.activeRooms,    icon: "🔴", color: "emerald",delay: 0.2  },
    { label: "Featured Movies", value: stats.featuredMovies, icon: "✨", color: "red",    delay: 0.25 },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">Welcome back, Admin 👋</h1>
        <p className="text-gray-400 text-sm mt-1">Here's what's happening with CineVerse today.</p>
      </motion.div>

      {/* Stat Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {cards.map((c) => <StatCard key={c.label} {...c} />)}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="xl:col-span-2 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Weekly Activity</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={weeklyData}>
              <defs>
                <linearGradient id="gU" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3} /><stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} /><stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip />} />
              <Area type="monotone" dataKey="users" name="Users" stroke="#9333ea" strokeWidth={2} fill="url(#gU)" />
              <Area type="monotone" dataKey="rooms" name="Rooms" stroke="#ec4899" strokeWidth={2} fill="url(#gR)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Genre Distribution</h3>
          {genreData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-600 text-sm gap-2">
              <span className="text-3xl">🎭</span><p>No custom movies yet</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={genreData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                    {genreData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<ChartTip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {genreData.map((g, i) => (
                  <span key={g.name} className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: CHART_COLORS[i % CHART_COLORS.length] + "22", color: CHART_COLORS[i % CHART_COLORS.length] }}>
                    {g.name}
                  </span>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Recent Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Recent Users</h3>
          {recentUsers.length === 0 ? <p className="text-gray-600 text-sm text-center py-6">No users found</p> : (
            <div className="space-y-3">
              {recentUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {(u.username || u.name || u.email || "?")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white font-medium truncate">{u.username || u.name || "Unknown"}</p>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${u.role === "admin" ? "bg-purple-600/20 text-purple-300 border border-purple-500/20" : "bg-white/5 text-gray-400 border border-white/[0.06]"}`}>
                    {u.role || "user"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Recent Watch Rooms</h3>
          {recentRooms.length === 0 ? <p className="text-gray-600 text-sm text-center py-6">No rooms found</p> : (
            <div className="space-y-3">
              {recentRooms.map((r) => (
                <div key={r.id} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${r.isPlaying ? "bg-green-400 animate-pulse" : "bg-gray-600"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white font-medium truncate">{r.movieTitle || "Unnamed Room"}</p>
                    <p className="text-xs text-gray-500 font-mono">{r.id.slice(0, 12)}…</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${r.isPlaying ? "bg-green-600/20 text-green-300 border border-green-500/20" : "bg-white/5 text-gray-500 border border-white/[0.06]"}`}>
                    {r.isPlaying ? "Live" : "Paused"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
