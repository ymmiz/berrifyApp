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
    source,
    user_id: user.uid,
    timestamp: serverTimestamp(),
    status: 'pending'
  })

  // Update the plant doc with thumbnail
  await setDoc(doc(db, 'plants', plantId), {
    photo_url: url,
    last_photo_at: serverTimestamp()
  }, { merge: true })

  let analysisResult = null
  let annotatedImage = null
  let avgRedPercent = null
  let ranking = null

  try {
    // 1️⃣ Get JSON analysis (ripe/unripe, scores, etc.)
    const jsonRes = await fetch(`${API_BASE}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: url,
        access_token: "123456"
      })
    })

    if (!jsonRes.ok) throw new Error(`JSON API HTTP ${jsonRes.status}`)
    analysisResult = await jsonRes.json()

    // 2️⃣ Calculate avgRedPercent + ranking
    if (analysisResult.ripeness_data) {
      const strawberries = Object.values(analysisResult.ripeness_data)
      const totalRed = strawberries.reduce((sum, s) => sum + (s.red_percent || 0), 0)
      avgRedPercent = strawberries.length > 0 ? totalRed / strawberries.length : 0

      if (avgRedPercent < 30) {
        ranking = "🌱 Beginner Gardener"
      } else if (avgRedPercent < 70) {
        ranking = "🌿 Growing Expert"
      } else {
        ranking = "🍓 Master Harvester"
      }
    }

    // 3️⃣ Get annotated image (binary)
    const imgRes = await fetch(`${API_BASE}/analyze_img`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: url,
        access_token: "123456"
      })
    })

    if (!imgRes.ok) throw new Error(`Image API HTTP ${imgRes.status}`)
    const blob = await imgRes.blob()
    annotatedImage = await blobToBase64(blob)

    // 4️⃣ Save both JSON + annotated image + ranking into Firestore
    await updateDoc(doc(db, "plants", plantId, "uploads", uploadDoc.id), {
      status: "analyzed",
      analysis: analysisResult,     // JSON
      annotated_image: annotatedImage, // base64
      avgRedPercent,
      ranking
    })

    // 5️⃣ Also update plant root doc with latest rank
    await updateDoc(doc(db, "plants", plantId), {
      latest_rank: ranking,
      latest_avgRedPercent: avgRedPercent
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
    analysis: analysisResult,
    annotated_image: annotatedImage,
    avgRedPercent,
    ranking
  }
}

// helper
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
