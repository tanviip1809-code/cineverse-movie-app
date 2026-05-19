// src/admin/components/StatCard.jsx
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

function useCountUp(target, duration = 1000) {
  const [count, setCount] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    const start = performance.now();
    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(ease * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return count;
}

export default function StatCard({ label, value, icon, color, delay = 0, subtitle }) {
  const animated = useCountUp(value);

  const colorMap = {
    purple: {
      bg: "from-purple-600/20 to-purple-600/5",
      border: "border-purple-500/20",
      icon: "bg-purple-600/20 text-purple-400",
      text: "text-purple-300",
      glow: "shadow-purple-900/20",
    },
    pink: {
      bg: "from-pink-600/20 to-pink-600/5",
      border: "border-pink-500/20",
      icon: "bg-pink-600/20 text-pink-400",
      text: "text-pink-300",
      glow: "shadow-pink-900/20",
    },
    blue: {
      bg: "from-blue-600/20 to-blue-600/5",
      border: "border-blue-500/20",
      icon: "bg-blue-600/20 text-blue-400",
      text: "text-blue-300",
      glow: "shadow-blue-900/20",
    },
    emerald: {
      bg: "from-emerald-600/20 to-emerald-600/5",
      border: "border-emerald-500/20",
      icon: "bg-emerald-600/20 text-emerald-400",
      text: "text-emerald-300",
      glow: "shadow-emerald-900/20",
    },
    amber: {
      bg: "from-amber-600/20 to-amber-600/5",
      border: "border-amber-500/20",
      icon: "bg-amber-600/20 text-amber-400",
      text: "text-amber-300",
      glow: "shadow-amber-900/20",
    },
    red: {
      bg: "from-red-600/20 to-red-600/5",
      border: "border-red-500/20",
      icon: "bg-red-600/20 text-red-400",
      text: "text-red-300",
      glow: "shadow-red-900/20",
    },
  };

  const c = colorMap[color] || colorMap.purple;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`relative bg-gradient-to-br ${c.bg} border ${c.border} rounded-2xl p-5 shadow-lg ${c.glow} overflow-hidden`}
    >
      {/* Background glow */}
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/[0.02] blur-2xl" />

      <div className="flex items-start justify-between relative">
        <div>
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">{label}</p>
          <p className={`text-3xl font-black ${c.text} tabular-nums`}>{animated.toLocaleString()}</p>
          {subtitle && <p className="text-gray-500 text-xs mt-1">{subtitle}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl ${c.icon} flex items-center justify-center text-lg shrink-0`}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
}
