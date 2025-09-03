// plantService.js

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
  limit,
} from 'firebase/firestore'

import {
  ref as storageRef,
  list,
  deleteObject,
} from 'firebase/storage'

import { auth, db, storage } from '../firebase'

/* ----------------------------- Utilities ------------------------------ */

function makeNameKey(name = '') {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

function inferIconFromMode(mode) {
  return mode === 'hardware' ? 'bi bi-cpu' : 'bi bi-camera'
}

function mapFAtoBI(icon, mode) {
  if (!icon) return inferIconFromMode(mode)
  if (/(^|\s)fa[brsl]?\s/.test(icon)) {
    if (icon.includes('fa-microchip')) return 'bi bi-cpu'
    if (icon.includes('fa-camera'))    return 'bi bi-camera'
    if (icon.includes('fa-tint'))      return 'bi bi-droplet'
    if (icon.includes('fa-qrcode'))    return 'bi bi-qr-code-scan'
    if (icon.includes('fa-cut'))       return 'bi bi-scissors'
    if (icon.includes('fa-times'))     return 'bi bi-x-lg'
    if (icon.includes('fa-chevron-up'))   return 'bi bi-chevron-up'
    if (icon.includes('fa-chevron-down')) return 'bi bi-chevron-down'
    if (icon.includes('fa-plus'))      return 'bi bi-plus-lg'
    return inferIconFromMode(mode)
  }
  return icon
}

/* --------------------------- Create / Read ---------------------------- */

export async function addPlant(plantData) {
  const user = auth.currentUser
  if (!user) throw new Error('User not logged in')

  const name = (plantData?.name ?? '').trim()
  if (!name) throw new Error('Plant name is required')

  const nameKey = makeNameKey(name)
  const dupQ = query(
    collection(db, 'plants'),
    where('user_id', '==', user.uid),
    where('name_key', '==', nameKey)
  )
  const dupSnap = await getDocs(dupQ)
  if (!dupSnap.empty) {
    throw new Error(`Plant name "${name}" already exists. Please choose another name.`)
  }

  const normalizedIcon = mapFAtoBI(plantData.trackingIcon, plantData.mode)

  const plantDoc = {
    plant_name: name,
    name_key: nameKey,
    user_id: user.uid,
    created_at: serverTimestamp(),

    mode: plantData.mode,
    tracking_description: plantData.trackingDescription,
    tracking_icon: normalizedIcon,

    status: plantData.status || 'Not yet scanned',
    status_alert: plantData.statusAlert || 'Scan to check status',
    moisture: plantData.moisture ?? null,

    expanded: false,
    photo_url: null,
    last_scan_time: null,
    active: true,
  }

  const ref = await addDoc(collection(db, 'plants'), plantDoc)
  console.log(`Plant added with ID: ${ref.id}`)
  return ref.id
}

export async function getPlants() {
  const user = auth.currentUser
  if (!user) return []

  const qy = query(collection(db, 'plants'), where('user_id', '==', user.uid))
  const snapshot = await getDocs(qy)

  return snapshot.docs.map(d => {
    const data = d.data()
    const safeIcon = mapFAtoBI(data.tracking_icon, data.mode)
    return {
      id: d.id,
      name: data.plant_name,
      mode: data.mode,
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
      last_scan_time: data.last_scan_time?.toDate?.(),
      active: data.active !== false,
    }
  })
}

export async function getPlantById(plantId) {
  const ref = doc(db, 'plants', plantId)
  const snapshot = await getDoc(ref)
  if (!snapshot.exists()) throw new Error('Plant not found')

  const data = snapshot.data()
  const safeIcon = mapFAtoBI(data.tracking_icon, data.mode)

  return {
    id: snapshot.id,
    name: data.plant_name,
    mode: data.mode,
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
    last_scan_time: data.last_scan_time?.toDate?.(),
    active: data.active !== false,
  }
}

/* ------------------------------ Update -------------------------------- */

export async function updatePlant(plantId, updates) {
  const ref = doc(db, 'plants', plantId)

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
      if (dup) throw new Error(`Plant name "${newName}" already exists. Please choose another name.`)
    }
  }

  const firebaseUpdates = {}
  if (updates.name !== undefined) {
    firebaseUpdates.plant_name = updates.name.trim()
    firebaseUpdates.name_key = makeNameKey(updates.name)
  }
  if (updates.trackingDescription !== undefined)
    firebaseUpdates.tracking_description = updates.trackingDescription
  if (updates.trackingIcon !== undefined)
    firebaseUpdates.tracking_icon = mapFAtoBI(updates.trackingIcon, updates.mode)
  if (updates.status !== undefined) firebaseUpdates.status = updates.status
  if (updates.statusAlert !== undefined) firebaseUpdates.status_alert = updates.statusAlert
  if (updates.moisture !== undefined) firebaseUpdates.moisture = updates.moisture
  if (updates.expanded !== undefined) firebaseUpdates.expanded = updates.expanded
  if (updates.mode !== undefined) firebaseUpdates.mode = updates.mode
  if (updates.active !== undefined) firebaseUpdates.active = updates.active

  firebaseUpdates.updated_at = serverTimestamp()
  await updateDoc(ref, firebaseUpdates)
  console.log(`Plant ${plantId} updated`)
}

/* ------------------------------ Delete -------------------------------- */

/** Soft delete: mark inactive */
export async function deletePlant(plantId) {
  await updateDoc(doc(db, 'plants', plantId), {
    active: false,
    deletedAt: serverTimestamp(),
  })
  console.log(`Plant ${plantId} soft-deleted`)
}

/** Hard delete of document only */
export async function deletePlantDocOnly(plantId) {
  await deleteDoc(doc(db, 'plants', plantId))
  console.log(`Plant ${plantId} document deleted`)
}

/** Batch delete helper for subcollections */
async function deleteSubcollection(parentPath, subcollectionName, batchSize = 250) {
  const subRef = collection(db, `${parentPath}/${subcollectionName}`)
  let totalDeleted = 0
  let batchCount = 0

  while (true) {
    const snap = await getDocs(query(subRef, limit(batchSize)))
    if (snap.empty) break

    const batch = writeBatch(db)
    snap.docs.forEach(d => batch.delete(d.ref))
    await batch.commit()

    batchCount++
    totalDeleted += snap.docs.length
    console.log(`${subcollectionName}: batch ${batchCount}, deleted ${snap.docs.length}`)
  }

  console.log(`${subcollectionName}: total deleted ${totalDeleted}`)
}

/* ------------------------ Storage Deletion ---------------------------- */

/**
 * Recursively delete a folder using paginated list()
 */
async function deleteStorageFolder(folderRef) {
  let pageToken = undefined
  do {
    const { items, prefixes, nextPageToken } = await list(folderRef, { pageToken })
    if (items?.length) {
      await Promise.all(items.map(itemRef => deleteObject(itemRef)))
    }
    if (prefixes?.length) {
      await Promise.all(prefixes.map(sub => deleteStorageFolder(sub)))
    }
    pageToken = nextPageToken
  } while (pageToken)

  console.log(`Deleted folder: ${folderRef.fullPath}`)
}

/**
 * Delete everything under a storage prefix (improved error handling)
 */
export async function nukeStoragePrefix(prefix) {
  let base = String(prefix).replace(/^\/+/, '').replace(/\/+$/, '')
  if (!base) throw new Error('Empty prefix')
  
  const rootRef = storageRef(storage, `${base}/`)

  // Deep delete with better error handling
  await (async function deleteFolderRec(folderRef) {
    let pageToken = undefined
    do {
      try {
        const { items, prefixes, nextPageToken } = await list(folderRef, { pageToken })
        
        if (items?.length) {
          await Promise.all(items.map(async (itemRef) => {
            try {
              await deleteObject(itemRef)
              console.log('Deleted file:', itemRef.fullPath)
            } catch (fileError) {
              console.error(`Failed to delete file ${itemRef.fullPath}:`, fileError.code)
            }
          }))
        }
        
        if (prefixes?.length) {
          await Promise.all(prefixes.map(sub => deleteFolderRec(sub)))
        }
        
        pageToken = nextPageToken
      } catch (listError) {
        if (listError.code === 'storage/object-not-found') {
          console.log(`Folder not found: ${folderRef.fullPath}`)
          break
        } else if (listError.code === 'storage/unauthorized') {
          console.log(`Unauthorized access to: ${folderRef.fullPath}`)
          break
        } else {
          throw listError
        }
      }
    } while (pageToken)
  })(rootRef)

  // Try to remove folder markers
  const markerCandidates = [
    storageRef(storage, base),
    storageRef(storage, `${base}/`)
  ]
  
  for (const cand of markerCandidates) {
    try {
      await deleteObject(cand)
      console.log(`Deleted folder marker: ${cand.fullPath}`)
    } catch (e) {
      // Silently ignore marker deletion failures
      if (e?.code !== 'storage/object-not-found') {
        console.log(`Marker deletion info: ${e?.code}`)
      }
    }
  }

  console.log(`Prefix cleaned: ${base}/`)
}

/**
 * Delete storage files for a plant (only check existing paths)
 */
async function deleteStorageFiles(plantId) {
  // Based on your storage structure, only check the path that exists
  const storagePaths = [
    `plants/${plantId}`, // This is where your files are actually stored
  ]
  
  for (const path of storagePaths) {
    try {
      await nukeStoragePrefix(path)
      console.log(`Cleaned storage path: ${path}`)
    } catch (e) {
      // Only log unexpected errors
      if (e?.code && !['storage/object-not-found', 'storage/unauthorized'].includes(e.code)) {
        console.error(`Storage deletion error for ${path}:`, e.code || e.message)
      }
      // Continue with other paths even if one fails
    }
  }
}

/* ------------------------ Full cascade delete -------------------------- */

/**
 * Complete cascade delete: Storage + Firestore subcollections + document
 */
export async function deletePlantCascade(plantId) {
  const parentPath = `plants/${plantId}`
  console.log(`Starting cascade delete for plant: ${plantId}`)

  try {
    // Step 1: Delete Storage files
    console.log('Deleting storage files...')
    await deleteStorageFiles(plantId)

    // Step 2: Delete Firestore subcollections
    console.log('Deleting subcollections...')
    await deleteSubcollection(parentPath, 'diary_entries')
    await deleteSubcollection(parentPath, 'uploads')

    // Step 3: Delete parent document
    console.log('Deleting parent plant document...')
    await deleteDoc(doc(db, 'plants', plantId))

    console.log(`Plant ${plantId} completely deleted (Storage + subcollections + document)`)
  } catch (error) {
    console.error('Error during cascade delete:', error)
    throw new Error(`Failed to delete plant completely: ${error.message}`)
  }
}

/* ------------------------ Single file operations ---------------------- */

export async function deletePhotoByPath(path) {
  const fileRef = storageRef(storage, path)
  await deleteObject(fileRef)
  console.log(`Deleted: ${path}`)
}

export async function deletePhotoByUrl(url) {
  const match = url.match(/\/o\/([^?]+)/)
  if (!match) throw new Error('Invalid Firebase Storage URL')
  const fullPath = decodeURIComponent(match[1])
  const fileRef = storageRef(storage, fullPath)
  await deleteObject(fileRef)
  console.log(`Deleted by URL: ${fullPath}`)
}

/* ----------------------------- Misc helpers --------------------------- */

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

export function createPlantData(name, mode) {
  let trackingDescription = ''
  let trackingIcon = ''
  if (mode === 'hardware') {
    trackingDescription = 'Tracking: Hardware Device - Real-time monitoring with specialized sensors'
    trackingIcon = 'bi bi-cpu'
  } else {
    trackingDescription = 'Tracking: Phone Camera - Manual photo scanning'
    trackingIcon = 'bi bi-camera'
  }
  return {
    name,
    mode,
    trackingDescription,
    trackingIcon,
    status: 'Not yet scanned',
    statusAlert: 'Scan to check status',
    moisture: null,
  }
}