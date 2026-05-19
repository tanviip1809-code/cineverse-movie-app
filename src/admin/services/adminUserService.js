// src/admin/services/adminUserService.js
import {
  collection, getDocs, updateDoc, deleteDoc,
  doc, query, orderBy,
} from "firebase/firestore";
import { db } from "../../firebase";

const USERS_COL = "users";

/** Fetch all users from Firestore */
export async function getAllUsers() {
  const q = query(collection(db, USERS_COL), orderBy("createdAt", "desc"));
  try {
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, uid: d.id, ...d.data() }));
  } catch {
    // Fallback without orderBy if createdAt field doesn't exist yet
    const snap = await getDocs(collection(db, USERS_COL));
    return snap.docs.map((d) => ({ id: d.id, uid: d.id, ...d.data() }));
  }
}

/** Change a user's role to "admin" or "user" */
export async function updateUserRole(uid, role) {
  await updateDoc(doc(db, USERS_COL, uid), { role });
}

/** Toggle a user's blocked status */
export async function setUserBlocked(uid, blocked) {
  await updateDoc(doc(db, USERS_COL, uid), { blocked });
}

/** Delete user's Firestore document (auth account remains — Admin SDK required for full deletion) */
export async function deleteUserDoc(uid) {
  await deleteDoc(doc(db, USERS_COL, uid));
}
