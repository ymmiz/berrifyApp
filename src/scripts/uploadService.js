import { db, storage, auth } from '@/firebase'
import {
  collection, addDoc, serverTimestamp, doc, setDoc
} from 'firebase/firestore'
import {
  ref as storageRef, uploadBytes, getDownloadURL
} from 'firebase/storage'

export async function uploadPlantPhoto(plantId, file, source = 'phone') {
  const user = auth.currentUser
  if (!user) throw new Error('Not logged in')
  if (!plantId) throw new Error('Missing plantId')
  if (!file) throw new Error('Missing file')

  // Create unique name, and keep path consistent with Pi
  const safe = file.name.replace(/\s+/g, '_')
  const name = `${Date.now()}_${safe}`
  const path = `plants/${plantId}/uploads/${name}`
  const fileRef = storageRef(storage, path)

  // Upload file to storage
  await uploadBytes(fileRef, file)
  const url = await getDownloadURL(fileRef)

  // Create upload history record in subcollection
  const uploadDoc = await addDoc(collection(db, 'plants', plantId, 'uploads'), {
    image_url: url,
    storage_path: path,
    source, // 'phone' here; Pi uses 'hardware'
    user_id: user.uid,
    timestamp: serverTimestamp()
  })

  // Update the main plant document with the latest photo
  // This ensures the plant thumbnail in MyDiary is always the most recent photo
  await setDoc(doc(db, 'plants', plantId), {
    photo_url: url,
    last_photo_at: serverTimestamp()
  }, { merge: true })

  return {
    id: uploadDoc.id,
    url: url,
    storage_path: path
  }
}