import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCz-kG1wAu9saY6m1wRo-Ve85eWoJzagGg",
  authDomain: "mappie-11806.firebaseapp.com",
  projectId: "mappie-11806",
  storageBucket: "mappie-11806.appspot.com",
  messagingSenderId: "1044987940755",
  appId: "1:1044987940755:web:8e9c2c1d0b2eb272c56266",
  measurementId: "G-JNY2790XY6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();
