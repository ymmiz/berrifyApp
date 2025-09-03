<template>
  <div class="hardware-analysis">
    <div class="page-container">
      <div class="header">
        <div class="back-button" @click="$router.go(-1)">
          <i class="bi bi-arrow-left"></i>
        </div>
        <h1>Hardware Analysis</h1>
      </div>

      <div class="device-card">
        <div class="device-icon"><i class="bi bi-hdd-fill"></i></div>
        <h2>Hardware Device</h2>

        <div class="connection-status">
          <h3 v-if="!isScanning && !scanComplete">Device Connected</h3>
          <h3 v-if="isScanning">Scanning in Progress...</h3>
          <h3 v-if="scanComplete" class="scan-done">Done Scanning!</h3>

          <p v-if="!isScanning && !scanComplete">Please take the picture of your strawberries</p>
          <p v-if="isScanning">Please wait while we analyze your strawberries...</p>
          <p v-if="scanComplete" class="thank-you-message">Thank you! Your scanned photo has been saved.</p>
        </div>

        <button v-if="!scanComplete" class="scan-button" @click="startScan" :disabled="isScanning">
          <i v-if="isScanning" class="bi bi-arrow-repeat spin"></i>
          <i v-else class="bi bi-camera-fill"></i>
          {{ isScanning ? 'Scanning...' : 'Scan' }}
        </button>

        <img v-if="imageUrl" :src="imageUrl" alt="Latest scan" class="scan-preview" />

        <button v-if="scanComplete" class="back-to-diary-button" @click="backToDiary">
          <i class="bi bi-arrow-left"></i>
          Back to My Diary
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import "../styles/HardwareAnalysis.css"
import {
  getFirestore, addDoc, doc, onSnapshot,
  serverTimestamp, collection, updateDoc
} from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

export default {
  name: 'HardwareAnalysis',
  data() {
    const q = this.$route?.query || {}
    const p = this.$route?.params || {}
    return {
      isScanning: false,
      scanComplete: false,
      imageUrl: null,
      jobId: null,
      plantId: q.plantId || p.plantId || null,
      plantName: q.plantName || 'Plant',
      unsub: null,
      jobDocRef: null,
    }
  },
  mounted() {
    if (!this.plantId) {
      alert('Missing plantId. Please open this page from a plant card.')
      this.$router.push('/mydiary')
    }
  },
  unmounted() {
    if (this.unsub) this.unsub()
  },
  methods: {
    async startScan() {
      if (this.isScanning || !this.plantId) return
      this.isScanning = true
      this.scanComplete = false
      this.imageUrl = null

      const db = getFirestore()
      const auth = getAuth()

      // Create a scan job the Pi will pick up
      const jobRef = await addDoc(collection(db, 'scanJobs'), {
        plantId: String(this.plantId),
        createdBy: auth.currentUser?.uid || 'anonymous',
        createdAt: serverTimestamp(),
        status: 'queued',
        imageUrl: null,
        storagePath: null,
        error: null
      })
      this.jobId = jobRef.id
      this.jobDocRef = jobRef

      // Watch job status
      this.unsub = onSnapshot(doc(db, 'scanJobs', this.jobId), async (snap) => {
        const job = snap.data()
        if (!job) return

        if (job.status === 'uploaded' && job.imageUrl) {
          this.imageUrl = job.imageUrl
          this.scanComplete = true
          this.isScanning = false
          // Mark job done (best effort)
          updateDoc(this.jobDocRef, { status: 'done' }).catch(() => {})

          // ✅ Update the plant document so the card flips to "Scanned"
          const plantRef = doc(db, 'plants', String(this.plantId))
          await updateDoc(plantRef, {
            last_scan_time: serverTimestamp(),
            status: 'Scanned',
            status_alert: 'Photo analyzed',
            mode: 'hardware',
            tracking_description: 'Tracking: Hardware Device - Real-time monitoring with specialized sensors',
            tracking_icon: 'bi bi-cpu',
            last_photo_at: serverTimestamp(),
            photo_url: job.imageUrl
          }).catch(console.error)
        }

        if (job.status === 'error') {
          alert('Scan failed: ' + (job.error || 'unknown error'))
          this.isScanning = false
        }
      })
    },

    backToDiary() {
      if (this.unsub) this.unsub()
      this.$router.push('/mydiary')
    }
  }
}
</script>