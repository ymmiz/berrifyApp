import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore'
import { auth, db } from '../firebase'
import { deleteField } from "firebase/firestore";

// Example function to remove 'onboarded' field from a user document
export const removeOnboardedField = async (userId) => {
  await updateDoc(doc(db, "users", userId), {
    onboarded: deleteField()
  });
};

// ✅ CREATE user if not exists
export const createUserIfNotExists = async () => {
  const user = auth.currentUser
  if (!user) {
    console.error("User not logged in.")
    return
  }

  const userRef = doc(db, "users", user.uid)
  const userSnap = await getDoc(userRef)

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      user_id: user.uid,
      name: user.displayName || "No Name",
      email: user.email,
      user_type: "",
      is_admin: false,
      join_date: serverTimestamp()
    })
    console.log("New user document created in Firestore.")
  } else {
    console.log("User already exists in Firestore.")
  }
}

// ✅ READ current user data
export const getUserData = async () => {
  const user = auth.currentUser
  if (!user) return null

  const userRef = doc(db, "users", user.uid)
  const userSnap = await getDoc(userRef)

  return userSnap.exists() ? userSnap.data() : null
}

// ✅ UPDATE current user data
export const updateUserData = async (data) => {
  const user = auth.currentUser
  if (!user) return

  const userRef = doc(db, "users", user.uid)
  await updateDoc(userRef, data)

  console.log("✅ User data updated.")
}

// ✅ DELETE another user (ADMIN ONLY)
export const deleteUserIfAdmin = async (uidToDelete) => {
  const currentUser = auth.currentUser
  if (!currentUser) {
    alert("Not logged in.")
    return
  }

  const currentUserRef = doc(db, "users", currentUser.uid)
  const currentUserSnap = await getDoc(currentUserRef)

  if (currentUserSnap.exists() && currentUserSnap.data().is_admin) {
    const userRef = doc(db, "users", uidToDelete)
    await deleteDoc(userRef)
    alert("✅ User deleted successfully.")
  } else {
    alert("❌ You are not authorized to delete users.")
  }
}