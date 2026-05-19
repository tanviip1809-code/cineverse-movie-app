// src/admin/services/adminMovieService.js
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, getDocs, serverTimestamp, query, orderBy,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "../../firebase";

const MOVIES_COL = "movies";

/** Upload a single file to Firebase Storage and return its download URL */
async function uploadFile(file, path) {
  if (!file) return null;
  const storageRef = ref(storage, path);
  const task = uploadBytesResumable(storageRef, file);
  return new Promise((resolve, reject) => {
    task.on("state_changed", null, reject, async () => {
      const url = await getDownloadURL(task.snapshot.ref);
      resolve(url);
    });
  });
}

/** Fetch all movies from Firestore (both custom + tmdb-imported) */
export async function getAllMovies() {
  const q = query(collection(db, MOVIES_COL), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Import a TMDB movie into Firestore.
 * Called when admin clicks "Add to CineVerse" in the TMDB browser.
 * @param {object} tmdbData  — normalized TMDB movie from tmdbAdminService.normalizeTmdb()
 * @param {string | null} trailerKey  — YouTube trailer key from fetchTmdbTrailer()
 */
export async function importTmdbMovie(tmdbData, trailerKey = null) {
  const docRef = await addDoc(collection(db, MOVIES_COL), {
    source:      "tmdb",
    tmdbId:      tmdbData.tmdbId,
    title:       tmdbData.title       || "",
    description: tmdbData.overview    || "",
    posterURL:   tmdbData.poster      || "",
    backdropURL: tmdbData.backdrop    || "",
    genres:      tmdbData.genres      || [],
    rating:      tmdbData.rating      || 0,
    releaseDate: tmdbData.releaseDate || "",
    trailerKey:  trailerKey           || "",
    featured:    false,
    createdAt:   serverTimestamp(),
  });
  return docRef.id;
}

/** Add a new CUSTOM movie (manually entered by admin). posterFile & backdropFile are optional File objects */
export async function addMovie(data, posterFile, backdropFile) {
  const movieId = crypto.randomUUID();
  const [posterURL, backdropURL] = await Promise.all([
    posterFile  ? uploadFile(posterFile,  `movies/${movieId}/poster`)
                : Promise.resolve(data.posterURL  || ""),
    backdropFile ? uploadFile(backdropFile, `movies/${movieId}/backdrop`)
                : Promise.resolve(data.backdropURL || ""),
  ]);

  const docRef = await addDoc(collection(db, MOVIES_COL), {
    source:      "custom",
    title:       data.title       || "",
    description: data.description || "",
    posterURL,
    backdropURL,
    trailerKey:  data.trailerKey  || "",
    genres:      data.genres      || [],
    releaseDate: data.releaseDate || "",
    rating:      parseFloat(data.rating) || 0,
    featured:    data.featured    || false,
    createdAt:   serverTimestamp(),
  });
  return docRef.id;
}

/** Update an existing custom movie */
export async function updateMovie(id, data, posterFile, backdropFile) {
  const [posterURL, backdropURL] = await Promise.all([
    posterFile  ? uploadFile(posterFile,  `movies/${id}/poster`)  : Promise.resolve(null),
    backdropFile ? uploadFile(backdropFile, `movies/${id}/backdrop`) : Promise.resolve(null),
  ]);

  const update = {
    title:       data.title,
    description: data.description,
    trailerKey:  data.trailerKey,
    genres:      data.genres,
    releaseDate: data.releaseDate,
    rating:      parseFloat(data.rating) || 0,
    featured:    data.featured,
    updatedAt:   serverTimestamp(),
  };
  if (posterURL)  update.posterURL  = posterURL;
  if (backdropURL) update.backdropURL = backdropURL;
  if (!posterURL  && data.posterURL)  update.posterURL  = data.posterURL;
  if (!backdropURL && data.backdropURL) update.backdropURL = data.backdropURL;

  await updateDoc(doc(db, MOVIES_COL, id), update);
}

/** Delete a movie and its storage assets */
export async function deleteMovie(id) {
  await deleteDoc(doc(db, MOVIES_COL, id));
  // Best-effort delete storage files (non-blocking)
  try {
    await Promise.allSettled([
      deleteObject(ref(storage, `movies/${id}/poster`)),
      deleteObject(ref(storage, `movies/${id}/backdrop`)),
    ]);
  } catch (_) { /* ignore if files don't exist */ }
}

/** Toggle featured flag */
export async function toggleFeatured(id, featured) {
  await updateDoc(doc(db, MOVIES_COL, id), { featured });
}
