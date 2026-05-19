// src/admin/hooks/useAdminStats.js
import { useEffect, useState, useCallback } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";

const DEFAULT = {
  totalUsers: 0,
  totalMovies: 0,
  totalRooms: 0,
  totalReviews: 0,
  activeRooms: 0,
  featuredMovies: 0,
};

export function useAdminStats() {
  const [stats, setStats] = useState(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const [usersSnap, moviesSnap, roomsSnap, reviewsSnap] = await Promise.allSettled([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "movies")),
        getDocs(collection(db, "rooms")),
        getDocs(collection(db, "reviews")),
      ]);

      const users = usersSnap.status === "fulfilled" ? usersSnap.value.size : 0;
      const movies = moviesSnap.status === "fulfilled" ? moviesSnap.value.size : 0;
      const rooms = roomsSnap.status === "fulfilled" ? roomsSnap.value.size : 0;
      const reviews = reviewsSnap.status === "fulfilled" ? reviewsSnap.value.size : 0;

      // Count active rooms (isPlaying === true)
      let activeRooms = 0;
      if (roomsSnap.status === "fulfilled") {
        roomsSnap.value.forEach((d) => {
          if (d.data().isPlaying) activeRooms++;
        });
      }

      // Count featured movies
      let featuredMovies = 0;
      if (moviesSnap.status === "fulfilled") {
        moviesSnap.value.forEach((d) => {
          if (d.data().featured) featuredMovies++;
        });
      }

      setStats({ totalUsers: users, totalMovies: movies, totalRooms: rooms, totalReviews: reviews, activeRooms, featuredMovies });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return { stats, loading, error, refresh: fetchStats };
}
