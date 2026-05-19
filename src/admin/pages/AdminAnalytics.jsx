// src/admin/pages/AdminAnalytics.jsx
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";

const COLORS = ["#9333ea", "#ec4899", "#6366f1", "#06b6d4", "#10b981", "#f59e0b"];

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#12121e] border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p) => <p key={p.name} style={{ color: p.color }} className="font-semibold">{p.name}: {p.value}</p>)}
    </div>
  );
};

function ChartCard({ title, children, delay = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-white mb-4">{title}</h3>
      {children}
    </motion.div>
  );
}

export default function AdminAnalytics() {
  const [genreData, setGenreData] = useState([]);
  const [roleData, setRoleData] = useState([]);

  // Simulated weekly data (replace with real Firestore queries when you have timestamps)
  const weeklyUsers = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return { day: d.toLocaleDateString("en", { weekday: "short" }), users: Math.floor(Math.random() * 15 + 2) };
  });
  const weeklyRooms = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return { day: d.toLocaleDateString("en", { weekday: "short" }), rooms: Math.floor(Math.random() * 8 + 1), reviews: Math.floor(Math.random() * 5) };
  });

  useEffect(() => {
    async function load() {
      const [moviesSnap, usersSnap] = await Promise.allSettled([
        getDocs(collection(db, "movies")),
        getDocs(collection(db, "users")),
      ]);

      if (moviesSnap.status === "fulfilled") {
        const gc = {};
        moviesSnap.value.docs.forEach((d) => (d.data().genres || []).forEach((g) => { gc[g] = (gc[g] || 0) + 1; }));
        setGenreData(Object.entries(gc).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8));
      }

      if (usersSnap.status === "fulfilled") {
        let admins = 0, users = 0;
        usersSnap.value.docs.forEach((d) => { if (d.data().role === "admin") admins++; else users++; });
        setRoleData([{ name: "Users", value: users }, { name: "Admins", value: admins }]);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold text-white">Analytics</h1>
        <p className="text-gray-400 text-sm">Platform insights and activity trends.</p>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard title="User Signups (Last 7 Days)" delay={0.1}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={weeklyUsers}>
              <defs>
                <linearGradient id="aU" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9333ea" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip />} />
              <Area type="monotone" dataKey="users" name="New Users" stroke="#9333ea" strokeWidth={2} fill="url(#aU)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Watch Activity & Reviews (Last 7 Days)" delay={0.15}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={weeklyRooms}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip />} />
              <Line type="monotone" dataKey="rooms" name="Watch Rooms" stroke="#ec4899" strokeWidth={2} dot={{ fill: "#ec4899", r: 3 }} />
              <Line type="monotone" dataKey="reviews" name="Reviews" stroke="#06b6d4" strokeWidth={2} dot={{ fill: "#06b6d4", r: 3 }} strokeDasharray="5 3" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top Genres (Custom Movies)" delay={0.2}>
          {genreData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-600 text-sm gap-2">
              <span className="text-3xl">🎭</span><p>No custom movies yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={genreData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} width={70} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="value" name="Movies" radius={[0, 6, 6, 0]}>
                  {genreData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="User Role Breakdown" delay={0.25}>
          {roleData.every((r) => r.value === 0) ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-600 text-sm gap-2">
              <span className="text-3xl">👥</span><p>No users found</p>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-8">
              <ResponsiveContainer width="60%" height={200}>
                <PieChart>
                  <Pie data={roleData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                    {roleData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip content={<ChartTip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {roleData.map((r, i) => (
                  <div key={r.name} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: COLORS[i] }} />
                    <div>
                      <p className="text-xs text-gray-300 font-medium">{r.name}</p>
                      <p className="text-lg font-bold text-white leading-none">{r.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
