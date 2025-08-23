import { db, storage, auth } from '../firebase'
import {
  collection,
  addDoc,
  serverTimestamp
} from 'firebase/firestore'
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage'

export async function uploadPlantPhoto(plantId, file) {
  const user = auth.currentUser
  if (!user) throw new Error("Not logged in")

  const path = `uploads/${plantId}/${file.name}`
  const fileRef = storageRef(storage, path)

  await uploadBytes(fileRef, file)
  const url = await getDownloadURL(fileRef)

  await addDoc(collection(db, 'uploads'), {
    plant_id: plantId,
    user_id: user.uid,
    image_url: url,
    source: "hardware",
    timestamp: serverTimestamp()
  })

  return url
}