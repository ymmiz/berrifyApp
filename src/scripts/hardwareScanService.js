import { db, auth } from '@/firebase'
import {
  doc, getDoc, setDoc, addDoc, updateDoc, serverTimestamp, collection
} from 'firebase/firestore'

/**
 * Queue a hardware scan job for the Pi.
 * Pass deviceId if you want the Pi to process only its own jobs.
 */
export async function queueHardwareScan(plantId, { deviceId, createdBy } = {}) {
  const user = auth.currentUser
  const uid = createdBy || user?.uid || 'anonymous'
  if (!plantId) throw new Error('Missing plantId')

  const payload = {
    status: 'queued',
    plantId: String(plantId),
    createdBy: uid,
    createdAt: serverTimestamp(),
    imageUrl: null,
    storagePath: null,
    error: null,
  }
  if (deviceId) payload.deviceId = deviceId
  const ref = await addDoc(collection(db, 'scanJobs'), payload)
  return ref.id
}

/**
 * Mirror an uploaded job into your plant documents so the UI updates
 * (works even if your UI isn’t listening to scanJobs).
 * Safe to call after you observe job.status === 'uploaded'.
 */
export async function mirrorHardwareJobToPlant(jobId, plantId) {
  if (!jobId) throw new Error('Missing jobId')
  if (!plantId) throw new Error('Missing plantId')

  const jobSnap = await getDoc(doc(db, 'scanJobs', jobId))
  if (!jobSnap.exists()) throw new Error('Job not found')

  const job = jobSnap.data()
  if (job.status !== 'uploaded' || !job.imageUrl) {
    throw new Error('Job not uploaded yet (status or imageUrl missing)')
  }

  // 1) write to uploads subcollection (use jobId as doc id to avoid dupes)
  const uploadRef = doc(db, 'plants', String(plantId), 'uploads', jobId)
  await setDoc(uploadRef, {
    id: jobId,
    plantId: String(plantId),
    user_id: auth.currentUser?.uid || job.createdBy || null,
    image_url: job.imageUrl,
    storage_path: job.storagePath || null,
    timestamp: serverTimestamp(),
    source: 'hardware',
    detected_count: 0,
    status: 'uploaded'
  }, { merge: true })

  // 2) mirror to plant root so list cards & detail pages refresh
  const plantRef = doc(db, 'plants', String(plantId))
  await updateDoc(plantRef, {
    last_scan_time: serverTimestamp(),
    status: 'Scanned',
    status_alert: 'Photo analyzed',
    mode: 'hardware',
    tracking_description: 'Tracking: Hardware Device - Real-time monitoring with specialized sensors',
    tracking_icon: 'bi bi-cpu',
    last_photo_at: serverTimestamp(),
    photo_url: job.imageUrl
  })

  return { imageUrl: job.imageUrl, storagePath: job.storagePath || null }
}
