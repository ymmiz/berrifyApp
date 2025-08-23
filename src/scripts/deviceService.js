import { doc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

export async function linkDeviceToPlant(deviceId, plantId) {
  await setDoc(doc(db, 'devices', deviceId), {
    plant_id: plantId
  }, { merge: true }) // merge:true so you don’t overwrite other fields
  console.log(`Linked ${deviceId} to plant ${plantId}`)
}