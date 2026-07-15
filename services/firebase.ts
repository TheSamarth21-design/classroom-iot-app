import { initializeApp, getApps, getApp } from "firebase/app";
// @ts-ignore
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyDMX2IfAjNCmL4TYW_oDePNv4eltqnclmw",
  authDomain: "classroom-automation-964ef.firebaseapp.com",
  projectId: "classroom-automation-964ef",
  storageBucket: "classroom-automation-964ef.firebasestorage.app",
  messagingSenderId: "205440669098",
  appId: "1:205440669098:web:584c0da38e9ae7ff00c7d3",
};

// Safe init — prevents double-initialization on Expo hot reloads
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Auth with platform-conditional persistence setup
const auth = Platform.OS === 'web'
  ? initializeAuth(app)
  : initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });

// Firestore with long-polling fix for Expo networking
const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
});

// Cloud Functions instance
const functions = getFunctions(app);

if (__DEV__) {
  connectFunctionsEmulator(functions, "localhost", 5001);
}

export { app, auth, db, functions };
