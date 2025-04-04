// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// Only import analytics in browser environments
let analytics = null;

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAKxQLbsrXmve7AhRckc9fhM0qQwlKQDg0",
  authDomain: "meetnotes-9e8e2.firebaseapp.com",
  projectId: "meetnotes-9e8e2",
  storageBucket: "meetnotes-9e8e2.firebasestorage.app",
  messagingSenderId: "741173059888",
  appId: "1:741173059888:web:3d48fef7e72e8d13ece8f5",
  measurementId: "G-F32F8J7N90",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Only initialize analytics if in browser environment
if (typeof window !== "undefined") {
  try {
    const { getAnalytics } = require("firebase/analytics");
    analytics = getAnalytics(app);
  } catch (e) {
    console.warn("Analytics failed to initialize:", e);
  }
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export { analytics };
