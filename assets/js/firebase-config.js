// ─────────────────────────────────────────
//  AulaOnline · Firebase Configuration
// ─────────────────────────────────────────
import { initializeApp }   from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth }         from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore }    from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyB92utDeFhK3FcNsp5RqRLFh0c4A-f9qNc",
  authDomain:        "aulaonline-a4f3f.firebaseapp.com",
  projectId:         "aulaonline-a4f3f",
  storageBucket:     "aulaonline-a4f3f.firebasestorage.app",
  messagingSenderId: "554135900808",
  appId:             "1:554135900808:web:19acc96e0a000a1ad6453d"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);
