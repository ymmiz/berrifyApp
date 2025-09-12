// import { isSupported, getMessaging, getToken, onMessage } from 'firebase/messaging'
// import { app, db } from './firebase.js'
// import { doc, setDoc, arrayUnion } from 'firebase/firestore'

// export async function initPush(userId = null) {
//   const supported = await isSupported().catch(() => false)
//   if (!supported) {
//     console.warn('FCM not supported in this browser.')
//     return null
//   }

//   // Register service worker first
//   if ('serviceWorker' in navigator) {
//     try {
//       const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
//       console.log('Service Worker registered successfully:', registration)
//     } catch (error) {
//       console.error('Service Worker registration failed:', error)
//       return null
//     }
//   }

//   if (Notification.permission !== 'granted') {
//     const res = await Notification.requestPermission()
//     if (res !== 'granted') {
//       console.log('Notification permission denied')
//       return null
//     }
//   }

//   try {
//     const messaging = getMessaging(app)
//     const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY
    
//     if (!vapidKey) {
//       console.error('VAPID key is missing from environment variables')
//       return null
//     }

//     console.log('Using VAPID key:', vapidKey.substring(0, 10) + '...')

//     // Wait for service worker to be ready
//     const swRegistration = await navigator.serviceWorker.ready
//     console.log('Service worker ready:', swRegistration)

//     const token = await getToken(messaging, {
//       vapidKey: vapidKey,
//       serviceWorkerRegistration: swRegistration,
//     })

//     if (!token) {
//       console.error('Failed to generate FCM token')
//       return null
//     }

//     console.log('FCM Token generated:', token)

//     // Save token to Firestore if userId provided
//     if (userId && token) {
//       await saveTokenToFirestore(userId, token)
//     }

//     // Handle foreground messages
//     onMessage(messaging, (payload) => {
//       console.log('Foreground message received:', payload)
      
//       if (Notification.permission === 'granted') {
//         new Notification(
//           payload.notification?.title || 'Notification',
//           {
//             body: payload.notification?.body || '',
//             icon: '/icon-192.png'
//           }
//         )
//       }
//     })

//     return token
//   } catch (error) {
//     console.error('Error with FCM:', error)
//     return null
//   }
// }

// async function saveTokenToFirestore(userId, token) {
//   try {
//     const userDocRef = doc(db, 'users', userId)
    
//     await setDoc(userDocRef, {
//       fcmTokens: arrayUnion(token),
//       lastTokenUpdate: new Date()
//     }, { merge: true })
    
//     console.log('FCM token saved successfully')
//   } catch (error) {
//     console.error('Error saving FCM token:', error)
//   }
// }

// export async function registerUserForNotifications(userId) {
//   console.log('Registering user for notifications:', userId)
//   const token = await initPush(userId)
//   return token
// }