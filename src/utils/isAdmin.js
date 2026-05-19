// src/utils/isAdmin.js
// Single source of truth for admin detection.
// Compares the logged-in user's email to VITE_ADMIN_EMAIL in .env.
// No Firestore role documents needed.

/**
 * Returns the configured admin email from the environment (lowercase, trimmed).
 */
export function getAdminEmail() {
  return import.meta.env.VITE_ADMIN_EMAIL?.trim().toLowerCase() ?? "";
}

/**
 * Returns true if the given Firebase Auth user is the designated admin.
 * @param {import("firebase/auth").User | null | undefined} user
 */
export function checkIsAdmin(user) {
  if (!user?.email) return false;
  const adminEmail = getAdminEmail();
  if (!adminEmail) return false;
  return user.email.trim().toLowerCase() === adminEmail;
}
