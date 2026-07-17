const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");
const { initializeAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require("firebase/auth");

const firebaseConfig = {
  apiKey: "AIzaSyDMX2IfAjNCmL4TYW_oDePNv4eltqnclmw",
  authDomain: "classroom-automation-964ef.firebaseapp.com",
  projectId: "classroom-automation-964ef",
  storageBucket: "classroom-automation-964ef.firebasestorage.app",
  messagingSenderId: "205440669098",
  appId: "1:205440669098:web:584c0da38e9ae7ff00c7d3",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = initializeAuth(app);

async function run() {
  const email = `test_${Date.now()}@example.com`;
  const password = "password123";
  
  console.log("Creating temporary user...", email);
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    console.log("User created! Signing in...");
    await signInWithEmailAndPassword(auth, email, password);
    console.log("Signed in successfully. Fetching classrooms...");
    
    const snap = await getDocs(collection(db, "Classrooms"));
    if (snap.empty) {
      console.log("No classrooms found!");
    }
    for (const doc of snap.docs) {
      console.log(`\nClassroom ID: ${doc.id}`);
      console.log("Data:", JSON.stringify(doc.data(), null, 2));
      
      const swSnap = await getDocs(collection(db, "Classrooms", doc.id, "switches"));
      console.log("Switches:");
      swSnap.forEach((sDoc) => {
        console.log(`  - Switch:`, JSON.stringify(sDoc.data(), null, 2));
      });
    }
  } catch (err) {
    console.error("Error running test:", err);
  }
}

run();
