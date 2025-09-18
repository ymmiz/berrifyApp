import { db, storage, auth } from '@/firebase'
import {
  collection, addDoc, serverTimestamp, doc, setDoc, updateDoc
} from 'firebase/firestore'
import {
  ref as storageRef, uploadBytes, getDownloadURL
} from 'firebase/storage'

// ⚡ Add your Cloud Run API base URL
const API_BASE = import.meta.env.VITE_FIREBASE_API_BASE

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

  // Save upload history record in Firestore
  const uploadDoc = await addDoc(collection(db, 'plants', plantId, 'uploads'), {
    image_url: url,
    storage_path: path,
    source, // 'phone' here; Pi uses 'hardware'
    user_id: user.uid,
    timestamp: serverTimestamp(),
    status: 'pending'
  })

  // Update the plant doc with thumbnail
  await setDoc(doc(db, 'plants', plantId), {
    photo_url: url,
    last_photo_at: serverTimestamp()
  }, { merge: true })

  // 5. Call Firebase Function Proxy instead of Cloud Run
let analysisResult = null
try {
  console.log("Calling ML server:", `${API_BASE}/analyze_img`)
  const res = await fetch(`${API_BASE}/analyze_img`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_url: url,
      access_token: "123456"
    })
  })

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }

  // Read as blob (raw image)
  const blob = await res.blob()
  const imageUrl = URL.createObjectURL(blob) // frontend-only preview
  const base64 = await blobToBase64(blob)    // convert for saving

  analysisResult = {
    ripeness: "unknown",    // placeholder until your ML server provides JSON
    confidence: null,
    annotated_image: base64
  }

  console.log("Wrapped analysis result:", analysisResult)

  // Save to Firestore
  await updateDoc(doc(db, "plants", plantId, "uploads", uploadDoc.id), {
    status: "analyzed",
    annotated_image: base64
  })

} catch (err) {
  console.error("Analysis failed:", err.message)
  await updateDoc(doc(db, "plants", plantId, "uploads", uploadDoc.id), {
    status: "error",
    error_message: err.message || "Unknown error"
  })
}

  return {
    id: uploadDoc.id,
    url,
    storage_path: path,
    analysis: analysisResult
  }
}

// helper to convert Blob → base64
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export async function requestScan(plantId) {
  const jobDoc = await addDoc(collection(db, "scanJobs"), {
    plantId,
    status: "queued",
    created_at: serverTimestamp()
  })
  return jobDoc.id
}
