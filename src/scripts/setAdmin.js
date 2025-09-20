import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Use your service account file path
const sa = JSON.parse(readFileSync('/Users/zimmy/Documents/berrify-app/functions/serviceAccountKey.json','utf8'));

// Put the UID of the account that should be ROOT
const rootUid = 'GJm4Llr7zqNC2XijOLyDmVeIZsx1';

admin.initializeApp({ credential: admin.credential.cert(sa) });

(async () => {
  try {
    const u = await admin.auth().getUser(rootUid);
    const claims = { ...(u.customClaims||{}), admin: true, superadmin: true };
    await admin.auth().setCustomUserClaims(rootUid, claims);

    // Optional: mirror for your UI badge
    await admin.firestore().collection('admins').doc(rootUid).set({
      uid: rootUid,
      email: u.email || null,
      admin: true,
      role: 'superadmin',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log(`✅ ${u.email} is now SUPERADMIN (admin + superadmin)`);
    process.exit(0);
  } catch (e) {
    console.error('❌ Failed to set superadmin:', e);
    process.exit(1);
  }
})();
