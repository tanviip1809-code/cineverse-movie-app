// src/admin/services/adminRoomService.js
// Watch party rooms are stored in the "rooms" collection (see WatchParty.jsx)
import {
  collection, onSnapshot, deleteDoc, doc, query, orderBy,
} from "firebase/firestore";
import { db } from "../../firebase";

const ROOMS_COL = "rooms";

/**
 * Subscribe to all watch rooms in real-time.
 * Returns an unsubscribe function.
 */
export function subscribeToRooms(callback) {
  const q = query(collection(db, ROOMS_COL));
  return onSnapshot(q, (snap) => {
    const rooms = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(rooms);
  });
}

/** Delete a room and its sub-collections (members) */
export async function deleteRoom(roomId) {
  await deleteDoc(doc(db, ROOMS_COL, roomId));
}
