
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";


const firebaseConfig = {
  apiKey: "AIzaSyCQ0s1sdhj4m2WbA7pXBLa-HzkaK040wr4",
  authDomain: "doc-scanner-e9cdc.firebaseapp.com",
  projectId: "doc-scanner-e9cdc",
  storageBucket: "doc-scanner-e9cdc.appspot.com",
  messagingSenderId: "327059451128",
  appId: "1:327059451128:web:fcea94d63cfd032b2edf0d",
  measurementId: "G-X2SJ3T3HQ4",
};


const app = initializeApp(firebaseConfig);


export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
