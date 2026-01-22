// Fix: Use namespace import for 'firebase/app' to resolve named export resolution issues in the environment
import * as FirebaseApp from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCLoJp47X5XWORmjbjgG-6mFQTZkGkyun4",
  authDomain: "my-uno-app.firebaseapp.com",
  projectId: "my-uno-app",
  storageBucket: "my-uno-app.firebasestorage.app",
  messagingSenderId: "1078453764976",
  appId: "1:1078453764976:web:a21b3c99ec3630c92d45b5"
};

// Fix: Access initialization and app lookup functions through the FirebaseApp namespace
// to bypass potential type mapping issues with subpath named exports.
const app = FirebaseApp.getApps().length === 0 
  ? FirebaseApp.initializeApp(firebaseConfig) 
  : FirebaseApp.getApp();

export const db = getFirestore(app);