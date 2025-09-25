// src/scripts/uploadService.js
import { db, storage, auth } from '@/firebase'
import {
  collection, addDoc, serverTimestamp, doc, updateDoc, setDoc,
  onSnapshot, query, where, orderBy, limit, getDocs
} from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'

const API_BASE = import.meta.env.VITE_FIREBASE_API_BASE

/* ============================================================
 * PHONE: upload a file, create upload doc, analyze and persist
 * ========================================================== */
export async function uploadFromPhone(plantId, file) {
  const user = auth.currentUser
  if (!user) throw new Error('Not logged in')
  if (!plantId) throw new Error('Missing plantId')
  if (!file) throw new Error('Missing file')

  const safe = file.name.replace(/\s+/g, '_')
  const name = `${Date.now()}_${safe}`
  const path = `plants/${plantId}/uploads/${name}`
  const fileRef = storageRef(storage, path)

  await uploadBytes(fileRef, file)
  const url = await getDownloadURL(fileRef)

  const uploadRef = await addDoc(collection(db, 'plants', plantId, 'uploads'), {
    image_url: url,
    storage_path: path,
    source: 'phone',
    mode: 'phone',
    user_id: user.uid,
    timestamp: serverTimestamp(),
    status: 'pending',
    analysis_status: 'pending'
  })

  await setDoc(doc(db, 'plants', plantId), {
    photo_url: url,
    last_photo_at: serverTimestamp()
  }, { merge: true })

  await analyzeAndPersist(plantId, uploadRef.id, url, 'phone')
  return uploadRef.id
}

/* ============================================================
 * HARDWARE/PHONE: watch pending uploads and analyze them
 *    usage: const stop = watchPendingForPlant(plantId, 'hardware')
 * ========================================================== */
export function watchPendingForPlant(plantId, source = 'hardware') {
  const uploadsRef = collection(db, 'plants', plantId, 'uploads')
  const qy = query(
    uploadsRef,
    where('analysis_status', '==', 'pending'),
    where('mode', '==', source),
    orderBy('timestamp', 'desc'),
    limit(20)
  )

  return onSnapshot(qy, async (snap) => {
    for (const d of snap.docs) {
      const data = d.data() || {}
      if (!data.image_url) continue

      // best-effort claim
      try { await updateDoc(d.ref, { analysis_status: 'analyzing' }) }
      catch { continue }

      try {
        await analyzeAndPersist(plantId, d.id, data.image_url, source)
      } catch (err) {
        console.error('Analyze failed:', err)
        await updateDoc(d.ref, {
          analysis_status: 'failed',
          status: 'error',
          analysis_error: err?.message || String(err)
        })
      }
    }
  })
}

/* ============================================================
 * Read helper: latest detected count for a plant by source
 * ========================================================== */
export async function getLatestDetectedCount(plantId, source = 'hardware') {
  const uploadsRef = collection(db, 'plants', plantId, 'uploads')
  const qy = query(
    uploadsRef,
    where('mode', '==', source),
    where('analysis_status', '==', 'completed'),
    orderBy('timestamp', 'desc'),
    limit(1)
  )
  const snap = await getDocs(qy)
  if (snap.empty) return 0
  const d = snap.docs[0].data() || {}
  if (Number.isFinite(d.detected_count)) return d.detected_count
  if (Number.isFinite(d.analysis?.total_strawberries)) return d.analysis.total_strawberries
  if (d.analysis?.ripeness_data && typeof d.analysis.ripeness_data === 'object') {
    return Object.keys(d.analysis.ripeness_data).filter(k => /^strawberry_/i.test(k)).length
  }
  return 0
}

/* =========================== INTERNALS ============================ */

async function analyzeAndPersist(plantId, uploadId, imageUrl, source) {
  // 1) JSON
  const jRes = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl, access_token: '123456' })
  })
  if (!jRes.ok) throw new Error(`JSON API ${jRes.status}: ${await jRes.text().catch(()=> '')}`)
  const analysisJson = await jRes.json()

  // 2) Annotated image
  const iRes = await fetch(`${API_BASE}/analyze_img`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl, access_token: '123456' })
  })
  if (!iRes.ok) throw new Error(`IMG API ${iRes.status}: ${await iRes.text().catch(()=> '')}`)
  const annotatedBase64 = await blobToBase64(await iRes.blob())

  // 3) derive stats
  const { detectedCount, avgRedPercent } = deriveCounts(analysisJson)
  const ranking = rankFromAvgRed(avgRedPercent)

  // 4) write to upload doc
  const uploadRef = doc(db, 'plants', plantId, 'uploads', uploadId)
  await updateDoc(uploadRef, {
    analysis_status: 'completed',
    status: 'analyzed',
    mode: source,
    analysis: analysisJson,
    detected_count: detectedCount,
    annotated_image: annotatedBase64,
    avgRedPercent,
    ranking
  })

  // 5) touch plant
  const plantRef = doc(db, 'plants', plantId)
  await updateDoc(plantRef, {
    photo_url: imageUrl,
    last_photo_at: serverTimestamp(),
    last_scan_time: serverTimestamp(),
    latest_rank: ranking,
    latest_avgRedPercent: avgRedPercent
  })
}

function deriveCounts(analysis) {
  if (Number.isFinite(analysis?.total_strawberries)) {
    return {
      detectedCount: analysis.total_strawberries,
      avgRedPercent: avgFromRipeness(analysis?.ripeness_data)
    }
  }
  return {
    detectedCount: countFromRipeness(analysis?.ripeness_data),
    avgRedPercent: avgFromRipeness(analysis?.ripeness_data)
  }
}

function countFromRipeness(r) {
  if (!r || typeof r !== 'object') return 0
  return Object.keys(r).filter(k => /^strawberry_/i.test(k)).length
}

function avgFromRipeness(r) {
  if (!r || typeof r !== 'object') return 0
  const vals = Object.values(r)
  let sum = 0, n = 0
  for (const s of vals) {
    const p = Number(s.red_percent ?? s.red_precent) // tolerate typo
    if (Number.isFinite(p)) { sum += p; n++ }
  }
  return n ? sum / n : 0
}

function rankFromAvgRed(avg) {
  if (!Number.isFinite(avg)) return '🌱 Beginner Gardener'
  if (avg < 30) return '🌱 Beginner Gardener'
  if (avg < 70) return '🌿 Growing Expert'
  return '🍓 Master Harvester'
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onloadend = () => resolve(r.result)
    r.onerror = reject
    r.readAsDataURL(blob)
  })
}
