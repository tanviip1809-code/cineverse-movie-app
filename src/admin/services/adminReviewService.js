// src/admin/services/adminReviewService.js
import {
  collection, getDocs, deleteDoc, doc, query, orderBy,
} from "firebase/firestore";
import { db } from "../../firebase";

const REVIEWS_COL = "reviews";

/** Fetch all reviews */
export async function getAllReviews() {
  try {
    const q = query(collection(db, REVIEWS_COL), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    const snap = await getDocs(collection(db, REVIEWS_COL));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
}

/** Delete a review by ID */
export async function deleteReview(id) {
  await deleteDoc(doc(db, REVIEWS_COL, id));
}
