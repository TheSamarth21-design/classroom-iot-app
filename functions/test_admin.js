const admin = require("firebase-admin");

// Initialize admin SDK using default project credentials
admin.initializeApp({
  projectId: "classroom-automation-964ef"
});

const db = admin.firestore();

async function check() {
  console.log("Fetching classrooms via admin SDK...");
  try {
    const classroomsSnap = await db.collection("Classrooms").get();
    if (classroomsSnap.empty) {
      console.log("No classrooms found!");
      return;
    }
    for (const doc of classroomsSnap.docs) {
      console.log(`\n======================================`);
      console.log(`Classroom ID: ${doc.id}`);
      console.log("Classroom Data:", JSON.stringify(doc.data(), null, 2));
      
      const switchesSnap = await doc.ref.collection("switches").orderBy("order", "asc").get();
      console.log("Switches:");
      switchesSnap.forEach((sDoc) => {
        console.log(`  - Switch ID: ${sDoc.id}, Data:`, JSON.stringify(sDoc.data(), null, 2));
      });
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

check();
