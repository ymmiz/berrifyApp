import { 
  collection, 
  addDoc, 
  getDocs, 
  orderBy, 
  query, 
  doc, 
  deleteDoc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore'
import { db } from '../firebase'

/** Create a new diary entry under a plant */
export async function addDiaryEntry(plantId, { title,  photoUrl, moisture ,timestamp}) {
  const ref = collection(db, 'plants', plantId, 'diary_entries')
  return addDoc(ref, {
    title,
    moisture: moisture || null,
    timestamp: serverTimestamp()
  })
}

/** Get all diary entries for a plant (ordered by date) */
export async function getDiaryEntries(plantId) {
  const ref = collection(db, 'plants', plantId, 'diary_entries')
  const q = query(ref, orderBy('timestamp', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/** Update a diary entry */
export async function updateDiaryEntry(plantId, entryId, updates) {
  const ref = doc(db, 'plants', plantId, 'diary_entries', entryId)
  await updateDoc(ref, { ...updates })
}

/** Delete a diary entry */
export async function deleteDiaryEntry(plantId, entryId) {
  const ref = doc(db, 'plants', plantId, 'diary_entries', entryId)
  await deleteDoc(ref)
}

export { getDiaryEntries as fetchDiaryEntries }