import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// IMPORTANT: Replace with the path to your own service account key file
const serviceAccount = JSON.parse(
  readFileSync('/Users/zimmy/Documents/berrify-app/functions/serviceAccountKey.json', 'utf8')
); 

// IMPORTANT: Replace with the UID of the user you just added
const adminUid = 'GJm4Llr7zqNC2XijOLyDmVeIZsx1';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function setAdminClaim() {
  try {
    // Look up the user by their UID
    const user = await admin.auth().getUser(adminUid);

    // Set the custom claim
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });

    console.log(`Success! User ${user.email} (UID: ${user.uid}) is now an admin.`);
    process.exit(0);
  } catch (error) {
    console.error('Error setting custom claim:', error);
    process.exit(1);
  }
}

setAdminClaim();
