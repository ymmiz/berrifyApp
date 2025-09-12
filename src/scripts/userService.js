// src/scripts/userService.js
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  deleteField,
} from 'firebase/firestore'
import { auth, db } from '../firebase'

/* ------------------------------------------------------------------ */
/* Utilities                                                          */
/* ------------------------------------------------------------------ */

const currentUid = () => auth.currentUser?.uid || null

/**
 * Ensure a user doc exists. Optionally merge extra fields.
 */
export const ensureUserDoc = async (uid, extra = {}) => {
  const userId = uid || currentUid()
  if (!userId) throw new Error('No user signed in')

  const user = auth.currentUser
  const ref = doc(db, 'users', userId)
  const snap = await getDoc(ref)

  if (!snap.exists()) {
    await setDoc(ref, {
      user_id: userId,
      name: user?.displayName || 'No Name',
      email: user?.email || '',
      user_type: '',
      is_admin: false,
      notifications: false,       // default OFF
      tokens: [],                 // where we store FCM tokens
      join_date: serverTimestamp(),
      ...extra,
    })
  } else if (extra && Object.keys(extra).length) {
    await setDoc(ref, extra, { merge: true })
  }
  return ref
}

/* Backwards compat alias */
export const createUserIfNotExists = ensureUserDoc

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

export const getUserData = async (uid) => {
  const userId = uid || currentUid()
  if (!userId) return null

  const ref = doc(db, 'users', userId)
  const snap = await getDoc(ref)
  return snap.exists() ? snap.data() : null
}

/* ------------------------------------------------------------------ */
/* Writes                                                              */
/* ------------------------------------------------------------------ */

/**
 * Safe upsert. Uses merge so it works even if the doc isn't created yet.
 */
export const updateUserData = async (data, uid) => {
  const userId = uid || currentUid()
  if (!userId) throw new Error('No userId available for updateUserData')

  await setDoc(doc(db, 'users', userId), data, { merge: true })
  // console.log('✅ User data merged.')
}

/** Remove a field (your original helper) */
export const removeOnboardedField = async (userId) => {
  await updateDoc(doc(db, 'users', userId), { onboarded: deleteField() })
}

/* ------------------------------------------------------------------ */
/* Notifications & FCM tokens                                          */
/* ------------------------------------------------------------------ */

/** Persist notifications preference (true/false) */
export const setNotificationPreference = async (enabled, uid) => {
  const userId = uid || currentUid()
  if (!userId) throw new Error('No user')
  await setDoc(
    doc(db, 'users', userId),
    { notifications: !!enabled },
    { merge: true }
  )
}

/** Add a device token to users/{uid}.tokens[] */
export const addPushToken = async (token, uid) => {
  const userId = uid || currentUid()
  if (!userId || !token) return
  await setDoc(
    doc(db, 'users', userId),
    { tokens: arrayUnion(token) },
    { merge: true }
  )
}

/** Remove a device token from users/{uid}.tokens[] */
export const removePushToken = async (token, uid) => {
  const userId = uid || currentUid()
  if (!userId || !token) return
  await setDoc(
    doc(db, 'users', userId),
    { tokens: arrayRemove(token) },
    { merge: true }
  )
}

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

export const deleteUserIfAdmin = async (uidToDelete) => {
  const me = currentUid()
  if (!me) {
    alert('Not logged in.')
    return
  }

  const mySnap = await getDoc(doc(db, 'users', me))
  if (mySnap.exists() && mySnap.data().is_admin) {
    await deleteDoc(doc(db, 'users', uidToDelete))
    alert('✅ User deleted successfully.')
  } else {
    alert('❌ You are not authorized to delete users.')
  }
}
