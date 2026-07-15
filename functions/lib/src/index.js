"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDatastream = exports.onUserCreate = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
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
 * HTTPS Callable Function: Generates a new virtual pin datastream in Blynk template.
 * Only callable by users who have the "admin" role.
 * Receives: { templateId: string, pinNumber: number, label: string }
 * Returns: { virtual_pin: string }
 */
exports.createDatastream = functions.https.onCall(async (data, context) => {
    // 1. Verify caller is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Authentication is required to perform this action.");
    }
    const uid = context.auth.uid;
    try {
        // 2. Verify caller has 'admin' role
        const userDoc = await db.collection("users").doc(uid).get();
        const userData = userDoc.data();
        if (!userDoc.exists || userData?.role !== "admin") {
            throw new functions.https.HttpsError("permission-denied", "Only administrators can add switches.");
        }
        const { templateId, pinNumber, label } = data;
        if (!templateId || !pinNumber || !label) {
            throw new functions.https.HttpsError("invalid-argument", "Missing required fields (templateId, pinNumber, label).");
        }
        // Retrieve Blynk Organization API Key from environment secrets
        const blynkOrgApiKey = process.env.BLYNK_ORG_API_KEY;
        if (!blynkOrgApiKey) {
            throw new functions.https.HttpsError("failed-precondition", "Blynk API key is not configured on the server.");
        }
        // 3. Make HTTP request to Blynk Platform API to create the datastream
        // Endpoint docs: POST https://api.blynk.cloud/api/v1/organization/template/datastream/create
        const response = await fetch(`https://api.blynk.cloud/api/v1/organization/template/datastream/create`, {
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
            throw new functions.https.HttpsError("internal", `Blynk API failed: ${response.statusText}`);
        }
        // Blynk API returns metadata including confirmation of the pin
        const responseData = await response.json();
        functions.logger.info(`Blynk datastream V${pinNumber} created successfully`, responseData);
        return {
            virtual_pin: `V${pinNumber}`,
            success: true,
        };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        functions.logger.error("Error creating datastream in Blynk:", error);
        throw new functions.https.HttpsError("internal", error.message || "An unexpected error occurred.");
    }
});
//# sourceMappingURL=index.js.map