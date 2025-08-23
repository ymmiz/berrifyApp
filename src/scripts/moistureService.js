import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'

/** Subscribe to the latest moisture log for a plant */
export function watchLatestMoisture(plantId, cb) {
  const q = query(
    collection(db, 'plants', plantId, 'moisture_logs'),
    orderBy('timestamp', 'desc'),
    limit(1)
  )
  return onSnapshot(q, (snap) => {
    if (snap.empty) return cb(null)
    const doc = snap.docs[0]
    cb({ id: doc.id, ...doc.data() })
  })
}