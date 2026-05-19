// src/admin/services/adminSettingsService.js
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";

const SETTINGS_DOC = doc(db, "settings", "global");

/** Fetch global app settings */
export async function getSettings() {
  const snap = await getDoc(SETTINGS_DOC);
  if (snap.exists()) return snap.data();
  // Return defaults
  return {
    bannerEnabled: true,
    featuredMoviesEnabled: true,
    maintenanceMode: false,
    homepageLayout: "default",
    primaryColor: "purple",
    siteTitle: "CineVerse",
    siteTagline: "Watch Together, Anywhere",
  };
}

/** Save global app settings */
export async function saveSettings(data) {
  await setDoc(SETTINGS_DOC, data, { merge: true });
}
