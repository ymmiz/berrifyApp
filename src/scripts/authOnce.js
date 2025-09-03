// src/scripts/authOnce.js
import { auth } from "@/firebase"
import { signInAnonymously } from "firebase/auth"

export async function ensureSignedIn() {
  if (!auth.currentUser) {
    await signInAnonymously(auth)
  }
}