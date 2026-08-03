/**
 * firebase-config.js — Firebase Initialization
 * =============================================
 * Uses Firebase Compat SDK loaded via CDN (no build step required).
 * Must be loaded AFTER the Firebase CDN scripts in HTML.
 *
 * Project: web-bukhusnul (Bu Khusnul Khotimah)
 */

const firebaseConfig = {
  apiKey:            "AIzaSyCblFmoLjLG5LVAPjlyp_a_AexcE3BdguM",
  authDomain:        "web-bukhusnul.firebaseapp.com",
  projectId:         "web-bukhusnul",
  storageBucket:     "web-bukhusnul.firebasestorage.app",
  messagingSenderId: "645509977044",
  appId:             "1:645509977044:web:1def23fd84d96e97de3c41",
  measurementId:     "G-CLXPRNRHD0"
};

firebase.initializeApp(firebaseConfig);

// Firestore instance — shared globally
const db = firebase.firestore();
