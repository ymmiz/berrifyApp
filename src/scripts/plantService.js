import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDoc,
  writeBatch,
  limit
} from 'firebase/firestore'
import { auth, db } from '../firebase'

/** Normalize a name for uniqueness checks (trim + lowercase, collapse spaces) */
function makeNameKey(name = '') {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Infer the right Bootstrap icon for a mode */
function inferIconFromMode(mode) {
  return mode === 'hardware' ? 'bi bi-cpu' : 'bi bi-camera'
}

/** Map common FA classes to Bootstrap Icons (fallback to mode) */
function mapFAtoBI(icon, mode) {
  if (!icon) return inferIconFromMode(mode)
  if (/(^|\s)fa[brsl]?\s/.test(icon)) {
    // common FA → BI mappings
    if (icon.includes('fa-microchip')) return 'bi bi-cpu'
    if (icon.includes('fa-camera'))    return 'bi bi-camera'
    if (icon.includes('fa-tint'))      return 'bi bi-droplet'
    if (icon.includes('fa-qrcode'))    return 'bi bi-qr-code-scan'
    if (icon.includes('fa-cut'))       return 'bi bi-scissors'
    if (icon.includes('fa-times'))     return 'bi bi-x-lg'
    if (icon.includes('fa-chevron-up'))   return 'bi bi-chevron-up'
    if (icon.includes('fa-chevron-down')) return 'bi bi-chevron-down'
    if (icon.includes('fa-plus'))      return 'bi bi-plus-lg'
    // unknown FA → derive from mode
    return inferIconFromMode(mode)
  }
  // Already BI or custom SVG class
  return icon
}

/**
 * Add a new plant to Firestore (duplicate name prevention; case-insensitive)
 * @param {Object} plantData
 * @returns {Promise<string>} Plant document ID
 */
export async function addPlant(plantData) {
  const user = auth.currentUser
  if (!user) throw new Error('User not logged in')

  const name = (plantData?.name ?? '').trim()
  if (!name) throw new Error('Plant name is required')

  // 🔎 Duplicate check (case-insensitive via name_key)
  const nameKey = makeNameKey(name)
  const dupQ = query(
    collection(db, 'plants'),
    where('user_id', '==', user.uid),
    where('name_key', '==', nameKey)
  )
  const dupSnap = await getDocs(dupQ)
  if (!dupSnap.empty) {
    throw new Error(`❌ Plant name "${name}" already exists. Please choose another name.`)
  }

  // Ensure BI class for storage
  const normalizedIcon = mapFAtoBI(plantData.trackingIcon, plantData.mode)

  // ✅ Create doc
  const plantDoc = {
    // Basic
    plant_name: name,
    name_key: nameKey,
    user_id: user.uid,
    created_at: serverTimestamp(),

    // Tracking / UI
    mode: plantData.mode,
    tracking_description: plantData.trackingDescription,
    tracking_icon: normalizedIcon,   // <-- BI class

    // Status
    status: plantData.status || 'Not yet scanned',
    status_alert: plantData.statusAlert || 'Scan to check status',
    moisture: plantData.moisture ?? null,

    // UI state / extras
    expanded: false,
    photo_url: null,
    last_scan_time: null
  }

  try {
    const ref = await addDoc(collection(db, 'plants'), plantDoc)
    console.log(`✅ Plant added with ID: ${ref.id}`)
    return ref.id
  } catch (error) {
    console.error('Error adding plant:', error)
    throw new Error(error?.message || 'Failed to add plant')
  }
}

/**
 * Get all plants for the current user
 * @returns {Promise<Array>} Array of plant objects
 */
export async function getPlants() {
  const user = auth.currentUser
  if (!user) return []

  try {
    const qy = query(collection(db, 'plants'), where('user_id', '==', user.uid))
    const snapshot = await getDocs(qy)

    return snapshot.docs.map(d => {
      const data = d.data()
      const mode = data.mode
      // Sanitize any old FA icon to BI on the fly
      const safeIcon = mapFAtoBI(data.tracking_icon, mode)

      return {
        id: d.id,
        // UI mapping
        name: data.plant_name,
        mode,
        trackingDescription: data.tracking_description,
        trackingIcon: safeIcon,
        status: data.status,
        statusAlert: data.status_alert,
        moisture: data.moisture,
        expanded: data.expanded || false,

        // Raw
        plant_name: data.plant_name,
        user_id: data.user_id,
        created_at: data.created_at?.toDate?.(),
        photo_url: data.photo_url,
        last_scan_time: data.last_scan_time?.toDate?.()
      }
    })
  } catch (error) {
    console.error('Error getting plants:', error)
    throw new Error('Failed to load plants')
  }
}

/** Get a single plant by ID */
export async function getPlantById(plantId) {
  try {
    const ref = doc(db, 'plants', plantId)
    const snapshot = await getDoc(ref)
    if (!snapshot.exists()) throw new Error('Plant not found')

    const data = snapshot.data()
    const mode = data.mode
    const safeIcon = mapFAtoBI(data.tracking_icon, mode)

    return {
      id: snapshot.id,
      name: data.plant_name,
      mode,
      trackingDescription: data.tracking_description,
      trackingIcon: safeIcon,
      status: data.status,
      statusAlert: data.status_alert,
      moisture: data.moisture,
      expanded: data.expanded || false,

      plant_name: data.plant_name,
      user_id: data.user_id,
      created_at: data.created_at?.toDate?.(),
      photo_url: data.photo_url,
      last_scan_time: data.last_scan_time?.toDate?.()
    }
  } catch (error) {
    console.error('Error getting plant by ID:', error)
    throw error
  }
}

/**
 * Update plant information (duplicate name prevention if renaming)
 */
export async function updatePlant(plantId, updates) {
  try {
    const ref = doc(db, 'plants', plantId)

    // Only check duplicates if name changes
    if (updates.name !== undefined) {
      const user = auth.currentUser
      if (!user) throw new Error('User not logged in')

      const newName = updates.name.trim()
      if (!newName) throw new Error('Plant name is required')

      const nameKey = makeNameKey(newName)
      const qy = query(
        collection(db, 'plants'),
        where('user_id', '==', user.uid),
        where('name_key', '==', nameKey)
      )
      const snap = await getDocs(qy)

      if (!snap.empty) {
        const dup = snap.docs.find(d => d.id !== plantId)
        if (dup) {
          throw new Error(`❌ Plant name "${newName}" already exists. Please choose another name.`)
        }
      }
    }

    // Map UI -> Firestore
    const firebaseUpdates = {}
    if (updates.name !== undefined) {
      firebaseUpdates.plant_name = updates.name.trim()
      firebaseUpdates.name_key = makeNameKey(updates.name)
    }
    if (updates.trackingDescription !== undefined)
      firebaseUpdates.tracking_description = updates.trackingDescription
    if (updates.trackingIcon !== undefined)
      firebaseUpdates.tracking_icon = mapFAtoBI(updates.trackingIcon, updates.mode) // sanitize
    if (updates.status !== undefined) firebaseUpdates.status = updates.status
    if (updates.statusAlert !== undefined) firebaseUpdates.status_alert = updates.statusAlert
    if (updates.moisture !== undefined) firebaseUpdates.moisture = updates.moisture
    if (updates.expanded !== undefined) firebaseUpdates.expanded = updates.expanded
    if (updates.mode !== undefined) firebaseUpdates.mode = updates.mode

    firebaseUpdates.updated_at = serverTimestamp()

    await updateDoc(ref, firebaseUpdates)
    console.log(`✅ Plant ${plantId} updated`)
  } catch (error) {
    console.error('Error updating plant:', error)
    throw new Error(error?.message || 'Failed to update plant')
  }
}

/** Simple delete (keeps any subcollections) */
export async function deletePlant(plantId) {
  try {
    await deleteDoc(doc(db, 'plants', plantId))
    console.log(`✅ Plant ${plantId} deleted`)
  } catch (error) {
    console.error('Error deleting plant:', error)
    throw new Error('Failed to delete plant')
  }
}

/** Cascade delete utilities */
async function deleteSubcollection(parentPath, subcollectionName, batchSize = 250) {
  const subRef = collection(db, `${parentPath}/${subcollectionName}`)
  while (true) {
    const snap = await getDocs(query(subRef, limit(batchSize)))
    if (snap.empty) break
    const batch = writeBatch(db)
    snap.docs.forEach(d => batch.delete(d.ref))
    await batch.commit()
  }
}

export async function deletePlantCascade(plantId) {
  const parentPath = `plants/${plantId}`
  try {
    await deleteSubcollection(parentPath, 'diary_entries')
    await deleteDoc(doc(db, 'plants', plantId))
    console.log(`✅ Plant ${plantId} and its subcollections deleted`)
  } catch (error) {
    console.error('Error during cascade delete:', error)
    throw new Error('Failed to delete plant completely')
  }
}

/** Generate next plant number for names like "Strawberry 01" */
export async function getNextPlantNumber() {
  try {
    const plants = await getPlants()
    let maxNumber = 0

    plants.forEach(plant => {
      const m = String(plant.name || '').match(/^\s*Strawberry\s+0*([0-9]+)\s*$/i)
      if (m) {
        const n = parseInt(m[1], 10)
        if (n > maxNumber) maxNumber = n
      }
    })

    return maxNumber + 1
  } catch (error) {
    console.error('Error getting next plant number:', error)
    return 1
  }
}

/** Helper for creating UI-friendly plant data objects */
export function createPlantData(name, mode) {
  let trackingDescription = ''
  let trackingIcon = ''

  if (mode === 'hardware') {
    trackingDescription = 'Tracking: Hardware Device - Real-time monitoring with specialized sensors'
    trackingIcon = 'bi bi-cpu'       // ⬅️ Bootstrap icon
  } else {
    trackingDescription = 'Tracking: Phone Camera - Manual photo scanning'
    trackingIcon = 'bi bi-camera'    // ⬅️ Bootstrap icon
  }

  return {
    name,
    mode,
    trackingDescription,
    trackingIcon,            // stored as BI class
    status: 'Not yet scanned',
    statusAlert: 'Scan to check status',
    moisture: null
  }
}