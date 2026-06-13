// firebase-init.js
// 기존 auth.js가 window.firebase.* 형태로 SDK 함수를 사용하므로,
// CDN에서 모듈을 불러와 window.firebase 객체에 모아준다.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore as _getFirestore, doc, getDoc, setDoc, addDoc, collection,
  serverTimestamp, updateDoc, deleteDoc, getDocs, query, where, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged, sendPasswordResetEmail, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// auth.js가 getFirestore(app)으로 호출하면 자동으로 "ai31" DB를 사용하도록 래핑
function getFirestore(app) {
  return _getFirestore(app, "ai31");
}

window.firebase = {
  initializeApp,
  getFirestore,
  doc, getDoc, setDoc, addDoc, collection,
  serverTimestamp, updateDoc, deleteDoc, getDocs, query, where, orderBy,
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged, sendPasswordResetEmail, updateProfile,
  getStorage, ref, uploadBytes, getDownloadURL
};

// auth.js의 초기화 대기 로직이 이 이벤트를 감지하도록 신호를 보낸다
window.dispatchEvent(new CustomEvent('firebase-sdk-loaded'));