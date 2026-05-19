// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { checkIsAdmin } from "../utils/isAdmin";
import { syncUserToFirestore } from "../services/userService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(undefined); // undefined = "checking", null = "no user"
  const [loading, setLoading]         = useState(true);
  const [isAdmin, setIsAdmin]         = useState(false);

  // ── Firestore profile: username / photoURL stored in users/{uid} ──────────
  const [userProfile, setUserProfile] = useState(null);

  const fetchProfile = useCallback(async (uid) => {
    if (!uid) { setUserProfile(null); return; }
    try {
      const snap = await getDoc(doc(db, "users", uid));
      setUserProfile(snap.exists() ? snap.data() : null);
    } catch {
      setUserProfile(null);
    }
  }, []);

  /** Call this after saving profile changes → navbar re-renders instantly */
  const refreshProfile = useCallback(() => {
    if (auth.currentUser) fetchProfile(auth.currentUser.uid);
  }, [fetchProfile]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);       // null if logged out, object if logged in
      setIsAdmin(checkIsAdmin(currentUser));

      if (currentUser) {
        console.log("Current UID:", currentUser.uid, "| isAdmin:", checkIsAdmin(currentUser));

        // ── Auto-sync this user's Auth data to Firestore users/{uid} ──────
        // This is what makes ALL registered users visible in the Admin panel.
        await syncUserToFirestore(currentUser);

        fetchProfile(currentUser.uid);
      } else {
        console.log("Current UID: null — user logged out, clearing state");
        setUserProfile(null);     // explicit clear on logout — no stale profile
      }

      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchProfile]);

  return (
    <AuthContext.Provider value={{ user, loading, userProfile, refreshProfile, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook for easy access
export function useAuth() {
  return useContext(AuthContext);
}
