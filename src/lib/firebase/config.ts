// src/lib/firebase/config.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyACMQ1QYnliFM88wFJsPelokruZGSZZqlM",
  authDomain: "charta-d1001.firebaseapp.com",
  projectId: "charta-d1001",
  storageBucket: "charta-d1001.firebasestorage.app",
  messagingSenderId: "784926701355",
  appId: "1:784926701355:web:59f80bcba2d7463ad0776e",
  measurementId: "G-49ZL6GWP7Y"
};


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth };
