// import { reactive, onMounted, onBeforeUnmount } from 'vue'

// // ------------------ Internal event bus ------------------
// const listeners = new Set()
// function emit(event) {
//   for (const cb of listeners) {
//     try { cb(event) } catch (e) { console.error('Notification listener error:', e) }
//   }
// }
// export function addListener(cb) { listeners.add(cb); return () => listeners.delete(cb) }
// export function removeListener(cb) { listeners.delete(cb) }

// // ------------------ System permission (optional local OS toast) ------------------
// export async function requestNotificationPermission() {
//   try {
//     if (!('Notification' in window)) return false
//     if (Notification.permission === 'granted') return true
//     const permission = await Notification.requestPermission()
//     return permission === 'granted'
//   } catch (e) {
//     console.warn('requestNotificationPermission failed:', e)
//     return false
//   }
// }

// function maybeSystemNotify({ title, message }) {
//   try {
//     if (!('Notification' in window)) return
//     if (Notification.permission === 'granted') {
//       new Notification(title || 'Notification', { body: message || '' })
//     }
//   } catch { /* ignore */ }
// }

// // ------------------ Core notify API ------------------
// let nextId = 1
// export function notify(payload) {
//   const {
//     title = 'Notification',
//     message = '',
//     type = 'info',         // 'info' | 'success' | 'warning' | 'error'
//     duration = 4000,
//     icon = null,
//     ...rest
//   } = payload || {}

//   const evt = {
//     id: nextId++,
//     title,
//     message,
//     type,
//     icon,
//     duration,
//     createdAt: Date.now(),
//     ...rest
//   }

//   emit({ kind: 'push', notification: evt })
//   maybeSystemNotify({ title, message })
//   return evt.id
// }

// // Helpers
// export const notifyInfo    = (msg, opts={}) => notify({ message: msg, type: 'info',    ...opts })
// export const notifySuccess = (msg, opts={}) => notify({ message: msg, type: 'success', ...opts })
// export const notifyWarning = (msg, opts={}) => notify({ message: msg, type: 'warning', ...opts })
// export const notifyError   = (msg, opts={}) => notify({ message: msg, type: 'error',   ...opts })

// export function dismiss(id)   { emit({ kind: 'dismiss', id }) }
// export function dismissAll()  { emit({ kind: 'clear' }) }

// // ------------------ App-specific helper ------------------
// let lastNotifiedPlantIds = new Set()
// export function checkWateringSchedule(plants = []) {
//   const now = Date.now()
//   plants.forEach(p => {
//     const ns = p?.watering_schedule
//     let nextAtMs = null
//     if (ns?.next_watering?.toDate) {
//       nextAtMs = ns.next_watering.toDate().getTime()
//     } else if (ns?.next_watering instanceof Date) {
//       nextAtMs = ns.next_watering.getTime()
//     } else if (typeof ns?.next_watering === 'number') {
//       nextAtMs = ns.next_watering
//     }
//     if (!nextAtMs) return

//     const due = now >= nextAtMs
//     if (due && !lastNotifiedPlantIds.has(p.id)) {
//       lastNotifiedPlantIds.add(p.id)
//       notifyWarning(`${p.name || 'Your plant'} is due for watering.`, { duration: 7000, plantId: p.id })
//     }
//     if (!due && lastNotifiedPlantIds.has(p.id)) {
//       lastNotifiedPlantIds.delete(p.id)
//     }
//   })
// }

// // ------------------ Vue composable ------------------
// const state = reactive({ items: [] })

// function handleEvent(evt) {
//   if (!evt || !evt.kind) return
//   if (evt.kind === 'push' && evt.notification) {
//     const n = evt.notification
//     state.items.push(n)
//     if (n.duration && n.duration > 0) {
//       setTimeout(() => {
//         const idx = state.items.findIndex(x => x.id === n.id)
//         if (idx !== -1) state.items.splice(idx, 1)
//       }, n.duration)
//     }
//   } else if (evt.kind === 'dismiss' && evt.id != null) {
//     const idx = state.items.findIndex(x => x.id === evt.id)
//     if (idx !== -1) state.items.splice(idx, 1)
//   } else if (evt.kind === 'clear') {
//     state.items.splice(0, state.items.length)
//   }
// }

// export function useNotifications() {
//   onMounted(() => addListener(handleEvent))
//   onBeforeUnmount(() => removeListener(handleEvent))

//   function close(id) {
//     const idx = state.items.findIndex(n => n.id === id)
//     if (idx !== -1) state.items.splice(idx, 1)
//   }

//   return {
//     notifications: state.items,
//     close,
//     clear: dismissAll,
//     notify,
//     info: notifyInfo,
//     success: notifySuccess,
//     warning: notifyWarning,
//     error: notifyError,
//     dismiss
//   }
// }
