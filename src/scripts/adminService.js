// src/scripts/adminService.js
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  onSnapshot
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { db, functions as fns } from '../firebase';

/* ------------------------------------------------------------------ */
/* Authentication & Permission Checks                                 */
/* ------------------------------------------------------------------ */

/** Check if current user has admin privileges (force token refresh) */
export const checkAdminStatus = async () => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return false;
    const tokenResult = await user.getIdTokenResult(true); // force refresh claims
    if (tokenResult.claims?.admin === true) return true;

    // Fallback: check /admins/{uid}
    const admins = await getAllAdmins();
    return admins.get(user.uid) === true;
  } catch (error) {
    console.error('Failed to check admin status:', error);
    return false;
  }
};

/** Returns both admin and (optional) superadmin flags */
export const getAdminRoles = async () => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return { isAdmin: false, isRootAdmin: false };

    const tk = await user.getIdTokenResult(true);
    const isAdmin = tk.claims?.admin === true;
    const isRootAdmin = tk.claims?.superadmin === true;

    if (!isAdmin) {
      try {
        const admins = await getAllAdmins();
        return { isAdmin: admins.get(user.uid) === true, isRootAdmin };
      } catch (_) { /* ignore */ }
    }
    return { isAdmin, isRootAdmin };
  } catch (e) {
    console.error('getAdminRoles failed:', e);
    return { isAdmin: false, isRootAdmin: false };
  }
};

/** Simple connectivity/read test */
export const testFirebaseConnection = async () => {
  try {
    await getDocs(collection(db, 'users'));
    return true;
  } catch (error) {
    console.error('Firebase connection test failed:', error);
    return false;
  }
};

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function normalizeUser(row) {
  return {
    id: row.id,                          // Firestore doc id (uid)
    uid: row.uid || row.id,
    email: row.email || row.userEmail || row.contactEmail || '',
    name: row.name || row.displayName || row.username || 'Unknown User',
    device: row.device || row.deviceType || '',
    plantCount: row.plantCount ?? (Array.isArray(row.plants) ? row.plants.length : 0),
    totalHarvest: row.totalHarvest ?? row.harvestTotal ?? 0,
    status: row.status || (row.active === false ? 'Suspended' : 'Active'),
    joinDate: row.joinDate?.toDate?.() || row.createdAt?.toDate?.() || row.joinDate || row.createdAt || null,
    lastActive: row.lastActive?.toDate?.() || row.updatedAt?.toDate?.() || row.lastActive || row.updatedAt || null,
    user_id: row.user_id || row.id,
    ...row
  };
}

/* ------------------------------------------------------------------ */
/* Data Fetching Operations                                           */
/* ------------------------------------------------------------------ */

export const getAllUsers = async () => {
  try {
    const snap = await getDocs(collection(db, 'users'));
    const users = snap.docs.map(d => normalizeUser({ id: d.id, ...d.data() }));
    console.log('[adminService] users count:', users.length, users.map(u => ({ id: u.id, email: u.email, name: u.name })));
    return users;
  } catch (error) {
    console.error('Error loading users:', error);
    throw error;
  }
};

export const getAllPlants = async () => {
  try {
    const snap = await getDocs(collection(db, 'plants'));
    return snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        // expose ownership + mode for aggregation
        ownerId: data.ownerId || data.user_id || data.userId,
        mode: (data.mode || '').toLowerCase(),

        name: data.name || data.plant_name || 'Unnamed Plant',
        owner: data.owner || data.user_name || 'Unknown Owner',
        userId: data.user_id || data.userId,
        type: data.type || data.plant_type || 'Unknown',
        health: data.health || data.status || 'Unknown',
        daysGrowing: data.daysGrowing || data.age_days || 0,
        ...data
      };
    });
  } catch (error) {
    console.error('Error loading plants:', error);
    return [];
  }
};

export const getAllHarvests = async () => {
  try {
    const snap = await getDocs(collection(db, 'harvests')); // ok if empty
    return snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        date: data.date?.toDate?.() || data.harvestDate?.toDate?.() || data.date || data.harvestDate || null,
        plantName: data.plantName || data.plant_name || 'Unknown Plant',
        owner: data.owner || data.user_name || 'Unknown Owner',
        userId: data.user_id || data.userId,
        yield: data.yield ?? data.amount ?? data.quantity ?? 0,
        quality: data.quality || data.grade || 'Unknown',
        growthDuration: data.growthDuration ?? data.growth_days ?? 0,
        ...data
      };
    });
  } catch (error) {
    console.error('Error loading harvests:', error);
    return [];
  }
};

export const getAllAdmins = async () => {
  try {
    const snap = await getDocs(collection(db, 'admins'));
    const m = new Map();
    snap.forEach(d => m.set(d.id, !!(d.data()?.admin)));
    return m;
  } catch {
    return new Map();
  }
};

/* ------------------------------------------------------------------ */
/* Real-time Listeners                                                */
/* ------------------------------------------------------------------ */

export const setupUsersListener = (callback) => {
  try {
    const q = query(collection(db, 'users'));
    return onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(d => normalizeUser({ id: d.id, ...d.data() }));
      callback(users);
    });
  } catch (error) {
    console.error('Error setting up users listener:', error);
    return () => {};
  }
};

export const setupPlantsListener = (callback) => {
  try {
    const q = query(collection(db, 'plants'));
    return onSnapshot(q, (snapshot) => {
      const plants = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ownerId: data.ownerId || data.user_id || data.userId,
          mode: (data.mode || '').toLowerCase(),

          name: data.name || data.plant_name || 'Unnamed Plant',
          owner: data.owner || data.user_name || 'Unknown Owner',
          userId: data.user_id || data.userId,
          type: data.type || data.plant_type || 'Unknown',
          health: data.health || data.status || 'Unknown',
          daysGrowing: data.daysGrowing || data.age_days || 0,
          ...data
        };
      });
      callback(plants);
    });
  } catch (error) {
    console.error('Error setting up plants listener:', error);
    return () => {};
  }
};

export const setupAdminsListener = (callback) => {
  try {
    const q = query(collection(db, 'admins'));
    return onSnapshot(q, (snapshot) => {
      const m = new Map();
      snapshot.forEach(d => { if (d.data()?.admin) m.set(d.id, true); });
      callback(m);
    });
  } catch {
    return () => {};
  }
};

/* ------------------------------------------------------------------ */
/* User Management Operations                                         */
/* ------------------------------------------------------------------ */

// Update user profile document (soft operations only)
export const updateUser = async (userId, updates) => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { ...updates, lastModified: new Date() });
};

// NOTE: You said "admin can't delete user" – don’t call this from UI.
// Keeping it here only if you later decide to allow root-only deletes via a callable.
export const deleteUser = async (userId) => {
  const adminDeleteUser = httpsCallable(fns, 'adminDeleteUser');
  await adminDeleteUser({ uid: userId });
};

export const toggleUserStatus = async (userId, currentStatus) => {
  const newStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
  await updateUser(userId, { status: newStatus });
};

/* ------------------------------------------------------------------ */
/* Admin Role Management (Custom Claims)                              */
/* ------------------------------------------------------------------ */

export const promoteUserToAdmin = async (email) => {
  const addAdminByEmail = httpsCallable(fns, 'addAdminByEmail');
  await addAdminByEmail({ email });
};

export const demoteAdminUser = async (uid) => {
  const removeAdminByUid = httpsCallable(fns, 'removeAdminByUid');
  await removeAdminByUid({ uid });
};

/* ------------------------------------------------------------------ */
/* Utility Functions                                                  */
/* ------------------------------------------------------------------ */

export const formatFirebaseError = (error) => {
  let errorMessage = 'Firebase operation failed';
  if (error?.code === 'permission-denied') {
    errorMessage = 'Permission denied. Please check your admin privileges.';
  } else if (error?.code === 'unavailable') {
    errorMessage = 'Firebase service unavailable. Please check your internet connection.';
  } else if (error?.message?.includes('API key')) {
    errorMessage = 'Invalid API key. Please check your Firebase configuration.';
  } else if (error?.code === 'unauthenticated') {
    errorMessage = 'Authentication required. Please sign in again.';
  } else if (error?.message) {
    errorMessage = error.message;
  }
  return errorMessage;
};

export const getUserPlants = (user, plants) => {
  return plants.filter(plant =>
    plant.owner === user.name ||
    plant.userId === user.id ||
    plant.user_id === user.id ||
    plant.user_id === user.user_id ||
    plant.ownerId === user.id // support new field
  );
};

export const getUserHarvests = (user, harvests) => {
  return harvests.filter(h =>
    h.owner === user.name ||
    h.userId === user.id ||
    h.user_id === user.id ||
    h.user_id === user.user_id
  );
};

/** True if user is in /admins map */
export function isUserAdmin(uid, adminsMap /*, currentUser */) {
  return adminsMap instanceof Map ? adminsMap.get(uid) === true : false;
}
