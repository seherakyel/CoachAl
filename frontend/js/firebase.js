import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDuydmZVZqu0_JyDJ07Yqd9afLgmbKOmi8",
  authDomain: "coachai-5fd8a.firebaseapp.com",
  projectId: "coachai-5fd8a",
  storageBucket: "coachai-5fd8a.firebasestorage.app",
  messagingSenderId: "177709679180",
  appId: "1:177709679180:web:668da33ff45efbc6a6aae9"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);