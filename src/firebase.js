// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyA3FD7n-mkLbfaGKjkpXJKB2KG0tsc5TDk",
  authDomain: "cineverse-movie-app-6a291.firebaseapp.com",
  projectId: "cineverse-movie-app-6a291",
  storageBucket: "cineverse-movie-app-6a291.firebasestorage.app",
  messagingSenderId: "848462337412",
  appId: "1:848462337412:web:3b05284484b270595bf9d1",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);      // ✅ Firestore instance
export const storage = getStorage(app);  // ✅ Firebase Storage instance