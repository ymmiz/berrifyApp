import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getAuth } from "firebase/auth"

const firebaseConfig = {
    apiKey: "AIzaSyCoQrwt1QCbpr4_foobbMrp3c0jLcc-HS8",
    authDomain: "strawberry-plant-ac866.firebaseapp.com",
    projectId: "strawberry-plant-ac866",
    storageBucket: "strawberry-plant-ac866.firebasestorage.app",
    messagingSenderId: "597144290332",
    appId: "1:597144290332:web:c5176a6da33274319c4bd9"
}

const app = initializeApp(firebaseConfig)

const db = getFirestore(app)
const auth = getAuth(app)

export { db, auth }