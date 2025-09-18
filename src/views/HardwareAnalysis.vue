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
  serverTimestamp, collection, updateDoc, setDoc
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

      const db = getFirestore()
      const auth = getAuth()
      const uid = auth.currentUser?.uid
      if (!uid) {
        this.isScanning = false
        return alert('Please sign in to scan.')
      }

      try {
        // Create a scan job for the Pi
        const jobRef = await addDoc(collection(db, 'scanJobs'), {
          plantId: String(this.plantId),
          createdBy: uid,
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
            try {
              const uploadId = `${uid}_${Date.now()}`
              const uploadRef = doc(db, 'plants', String(this.plantId), 'uploads', uploadId)

              await setDoc(uploadRef, {
                id: uploadId,
                plantId: String(this.plantId),
                user_id: uid,
                image_url: job.imageUrl,
                storage_path: job.storagePath || null,
                timestamp: serverTimestamp(),
                source: 'hardware',
                detected_count: 0
              })

              // 🔎 Call your ML API via proxy
              let analysisResult = null
              try {
                  console.log("Current origin:", window.location.origin)
                  console.log("Making request from:", window.location.hostname)
                const mlBase = import.meta.env.VITE_FIREBASE_API_BASE
                console.log(`Calling ML server : ${mlBase}/analyze_img`)
                console.log("Image URL:", job.imageUrl)

                const res = await fetch(`${mlBase}/analyze_img`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    image_url: job.imageUrl,
                    access_token: "123456"
                  })
                })

                console.log("ML Server Response Status:", res.status)

                if (!res.ok) {
                  const errorText = await res.text()
                  console.error('ML Server Error:', errorText)
                  throw new Error(`ML Server Error ${res.status}: ${errorText}`)
                }

                // Handle response based on content type
                const contentType = res.headers.get('content-type')
                if (contentType && contentType.includes('application/json')) {
                  // JSON response
                  const jsonResult = await res.json()
                  analysisResult = {
                    ripeness: jsonResult.ripeness || "unknown",
                    confidence: jsonResult.confidence || null,
                    annotated_image: jsonResult.annotated_image || null
                  }
                } else {
                  // Blob response (annotated image)
                  const blob = await res.blob()
                  const base64 = await this.blobToBase64(blob)
                  analysisResult = {
                    ripeness: "analyzed",
                    confidence: null,
                    annotated_image: base64
                  }
                }

                console.log("Analysis result:", analysisResult)

                // Update upload document with analysis results
                await updateDoc(uploadRef, {
                  status: "analyzed",
                  annotated_image: analysisResult.annotated_image,
                  ripeness: analysisResult.ripeness,
                  confidence: analysisResult.confidence
                })

              } catch (err) {
                console.error("Analysis failed:", err)
                await updateDoc(uploadRef, {
                  status: "error",
                  error_message: err.message || "Unknown error"
                })
              }

              // Update plant document
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
              }).catch(err => console.error('Failed to update plant:', err))

              // Mark job as done
              if (this.jobDocRef) {
                updateDoc(this.jobDocRef, { status: 'done' }).catch(err => 
                  console.error('Failed to mark job done:', err)
                )
              }

              this.scanComplete = true
              this.isScanning = false

              // Navigate to PhotoList page
              this.$nextTick(async () => {
                try {
                  await this.$router.push({
                    name: 'PhotoList',
                    query: { plantId: this.plantId, plantName: this.plantName }
                  })
                } catch (error) {
                  console.error('Navigation error:', error)
                  this.$router.push('/mydiary')
                }
              })
              
            } catch (err) {
              console.error('Failed to save upload doc:', err)
              alert('Saved image, but failed to add to gallery.')
              this.isScanning = false
            }
          }

          if (job.status === 'error') {
            alert('Scan failed: ' + (job.error || 'unknown error'))
            this.isScanning = false
          }
        })
        
      } catch (error) {
        console.error('Failed to start scan:', error)
        alert('Failed to start scan: ' + error.message)
        this.isScanning = false
      }
    },

    backToDiary() {
      if (this.unsub) this.unsub()
      this.$router.push('/mydiary')
    },

    // ✅ FIXED: Move blobToBase64 function inside methods
    blobToBase64(blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    }
  }
}
</script>