"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDatastream = exports.onUserCreate = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors");
admin.initializeApp();
const db = admin.firestore();
const corsHandler = cors({ origin: true });
/**
 * Auth Trigger: When a new user registers, automatically create a document
 * in `users/{uid}` with role: "user".
 */
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
    try {
        await db.collection("users").doc(user.uid).set({
            email: user.email,
            displayName: user.displayName || "",
            role: "user",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        functions.logger.info(`Successfully created user doc for ${user.uid}`);
    }
    catch (error) {
        functions.logger.error(`Error in onUserCreate trigger for ${user.uid}:`, error);
    }
});
/**
 * HTTPS Request Function: Generates a new virtual pin datastream in Blynk template.
 * Enables CORS and checks JWT bearer authentication headers.
 * Only callable by users who have the "admin" role.
 * Receives: POST { templateId: string, pinNumber: number, label: string }
 * Returns: { virtual_pin: string }
 */
exports.createDatastream = functions.https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        // Only allow POST requests
        if (req.method !== "POST") {
            res.status(405).json({ error: "Method Not Allowed" });
            return;
        }
        try {
            // 1. Verify caller is authenticated via Authorization Bearer token
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                res.status(401).json({ error: "Unauthorized: Missing authentication token." });
                return;
            }
            const idToken = authHeader.split("Bearer ")[1];
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            const uid = decodedToken.uid;
            // 2. Verify caller has 'admin' role in Firestore
            const userDoc = await db.collection("users").doc(uid).get();
            const userData = userDoc.data();
            if (!userDoc.exists || userData?.role !== "admin") {
                res.status(403).json({ error: "Forbidden: Only administrators can add switches." });
                return;
            }
            const { templateId, pinNumber, label } = req.body;
            if (!templateId || pinNumber === undefined || !label) {
                res.status(400).json({ error: "Missing required fields (templateId, pinNumber, label)." });
                return;
            }
            // Retrieve Blynk Organization API Key from environment secrets
            const blynkOrgApiKey = process.env.BLYNK_ORG_API_KEY;
            if (!blynkOrgApiKey) {
                res.status(500).json({ error: "Blynk API key is not configured on the server." });
                return;
            }
            // 3. Make HTTP request to Blynk Platform API to create the datastream
            const response = await fetch(`https://blr1.blynk.cloud/api/v1/organization/template/datastream/create`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${blynkOrgApiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    templateId: templateId,
                    name: label,
                    alias: label,
                    pin: pinNumber,
                    pinType: "VIRTUAL",
                    dataType: "INTEGER",
                    min: 0,
                    max: 1,
                    defaultValue: 0,
                }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                functions.logger.error(`Blynk API error: ${errorText}`);
                res.status(502).json({ error: `Blynk API failed: ${response.statusText}` });
                return;
            }
            const responseData = await response.json();
            functions.logger.info(`Blynk datastream V${pinNumber} created successfully`, responseData);
            res.status(200).json({
                virtual_pin: `V${pinNumber}`,
                success: true,
            });
        }
        catch (error) {
            functions.logger.error("Error creating datastream in Blynk:", error);
            res.status(500).json({ error: error.message || "An unexpected error occurred." });
        }
    });
});
//# sourceMappingURL=index.js.map