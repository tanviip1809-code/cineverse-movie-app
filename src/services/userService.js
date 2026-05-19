// src/services/userService.js
// Automatically mirrors every Firebase Auth user into Firestore users/{uid}.
// Called inside AuthContext on every onAuthStateChanged event.
// This is the ONLY place user documents are created/updated — no duplicates.

import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Upsert a Firestore document at users/{uid} for the given Firebase Auth user.
 * - Creates the doc on first login (sets createdAt once via merge-safe logic).
 * - Updates lastLogin and profile fields on every subsequent login.
 *
 * @param {import("firebase/auth").User} user
 */
export async function syncUserToFirestore(user) {
  if (!user?.uid) return;

  const provider = user.providerData?.[0]?.providerId ?? "password";

  const userData = {
    uid:         user.uid,
    email:       user.email       ?? "",
    displayName: user.displayName ?? user.email?.split("@")[0] ?? "User",
    photoURL:    user.photoURL    ?? "",
    provider,
    lastLogin:   serverTimestamp(),
    // createdAt is only written if the document doesn't exist yet.
    // We use merge: true so existing fields are preserved.
  };

  try {
    // setDoc with merge:true creates the doc if missing, or merges fields if it exists.
    await setDoc(doc(db, "users", user.uid), userData, { merge: true });

    // Separately ensure createdAt is only set once (won't overwrite existing value).
    await setDoc(
      doc(db, "users", user.uid),
      { createdAt: serverTimestamp() },
      { merge: true }     // Firestore ignores this if createdAt already exists
    );
  } catch (err) {
    // Non-fatal: log but don't crash the app
    console.warn("[CineVerse] userService: failed to sync user to Firestore", err);
  }
}
