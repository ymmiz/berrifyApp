<template>
  <div class="page-container">
    <div class="header">
      <div class="back-button" @click="goBack"><i class="bi bi-arrow-left"></i></div>
      <div class="header-content">
        <h1>{{ plantName }}</h1>
        <div class="header-subtitle">Hardware Photos</div>
      </div>
      <div class="header-decoration"><i class="bi bi-camera2"></i></div>
    </div>

    <div class="page-content">
      <div v-if="photosByDay.length" class="photos-collection">
        <div v-for="dayGroup in photosByDay" :key="dayGroup.date" class="day-section">
          <div class="section-header">
            <h3 class="date-title">{{ formatDate(dayGroup.date) }}</h3>
            <span class="photo-count">{{ dayGroup.photos.length }} photo{{ dayGroup.photos.length > 1 ? 's' : '' }}</span>
          </div>

          <div class="photos-flow">
            <div v-for="photo in dayGroup.photos" :key="photo.id" class="photo-item">
              <div class="photo-card" @click="viewPhoto(photo)">
                <div class="card-image">
                  <img :src="photo.thumbnail" :alt="photo.filename" />
                  <div class="image-overlay"><i class="bi bi-eye-fill"></i></div>

                  <div v-if="photo.hasAnalysis" class="analysis-indicator">
                    <i class="bi bi-graph-up"></i><span>Analyzed</span>
                  </div>
                  <div v-else-if="photo.isAnalyzing" class="analysis-indicator">
                    <i class="bi bi-hourglass-split"></i><span>Analyzing…</span>
                  </div>
                </div>

                <div class="card-content">
                  <div class="photo-title">{{ photo.filename }}</div>
                  <div class="photo-details">
                    <span class="upload-time">{{ formatTime(photo.uploadDate) }}</span>
                    <button class="delete-btn" @click.stop="deletePhoto(photo)" title="Delete photo">
                      <i class="bi bi-trash3"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div> <!-- /photos-flow -->
        </div>
      </div>

      <div v-else class="empty-state">
        <div class="empty-illustration">
          <div class="empty-circle"><i class="bi bi-cpu"></i></div>
        </div>
        <h3>No hardware photos yet</h3>
        <p>Photos from your Raspberry Pi will appear here once captured</p>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="selectedPhoto" class="photo-modal" @click="closePhotoViewer">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ selectedPhoto.filename }}</h3>
          <div class="modal-actions">
            <button class="modal-delete-btn" @click="deletePhoto(selectedPhoto)" title="Delete photo"><i class="bi bi-trash3-fill"></i></button>
            <button class="close-btn" @click="closePhotoViewer"><i class="bi bi-x-lg"></i></button>
          </div>
        </div>

        <div class="image-showcase">
          <div class="image-container">
            <div class="image-label" :class="{ 'processed': selectedPhoto.hasAnalysis }">
              {{ selectedPhoto.hasAnalysis ? 'Ripeness Analysis' : selectedPhoto.isAnalyzing ? 'Analyzing…' : 'Original Photo' }}
            </div>
            <img :src="selectedPhoto.displayUrl" :alt="selectedPhoto.filename" />
          </div>
          <div v-if="selectedPhoto.hasAnalysis && selectedPhoto.annotatedUrl !== selectedPhoto.url" class="image-container">
            <div class="image-label">Original</div>
            <img :src="selectedPhoto.url" :alt="selectedPhoto.filename + ' original'" />
          </div>
        </div>

        <div class="photo-details">
          <div class="detail-card">
            <div class="detail-header"><i class="bi bi-info-circle-fill"></i><span>Photo Details</span></div>
            <p class="upload-date">{{ formatDateTime(selectedPhoto.uploadDate) }}</p>

            <div v-if="selectedPhoto.hasAnalysis && selectedPhoto.totalStrawberries !== null" class="analysis-details">
              <p><strong>Total Strawberries:</strong> {{ selectedPhoto.totalStrawberries }}</p>
              <p v-if="selectedPhoto.analysisData?.confidence"><strong>Confidence:</strong> {{ selectedPhoto.analysisData.confidence }}%</p>
            </div>

            <div v-else-if="selectedPhoto.isAnalyzing" class="analyzing-status">
              <p><i class="bi bi-hourglass-split"></i> Analysis in progress…</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script>
import {
  getFirestore, collection, query, orderBy, getDocs,
  doc, deleteDoc, onSnapshot, updateDoc
} from 'firebase/firestore'
import { getStorage, ref as storageRef, deleteObject } from 'firebase/storage'

export default {
  name: 'PhotoListHardware',
  data() {
    return {
      plantName: this.$route.query.plantName || 'Plant',
      plantId: this.$route.query.plantId || null,
      photos: [],
      selectedPhoto: null,
      loading: true,
      unsubAnalysis: null,
      _processingIds: new Set() // prevent double-processing
    }
  },
  computed: {
    photosByDay() {
      if (!this.photos.length) return []
      const groups = {}
      this.photos.forEach(photo => {
        const date = this.toDateSafe(photo.uploadDate).toDateString()
        if (!groups[date]) groups[date] = { date, photos: [] }
        groups[date].photos.push(photo)
      })
      return Object.values(groups).sort((a, b) => new Date(b.date) - new Date(a.date))
    }
  },
  mounted() {
    if (!this.plantId) { this.$router.push('/mydiary'); return }
    this.loadPhotos()
    this.startAnalysisWatcher()
  },
  unmounted() {
    if (this.unsubAnalysis) this.unsubAnalysis()
  },
  methods: {
    async loadPhotos() {
      if (!this.plantId) return
      try {
        const db = getFirestore()
        // order by timestamp desc (you already created the index)
        const photosQuery = query(
          collection(db, 'plants', this.plantId, 'uploads'),
          orderBy('timestamp', 'desc')
        )
        const snapshot = await getDocs(photosQuery)

        this.photos = snapshot.docs.map(docSnap => {
          const data = docSnap.data() || {}

          // prefer JSON written by analyzer; fall back gracefully
          const ripenessData = (data.analysis && data.analysis.ripeness_data) || data.ripeness_data || {}
          const totalStrawberries =
            data.total_strawberries ??
            (ripenessData ? Object.keys(ripenessData).length : null) ??
            (typeof data.detected_count === 'number' ? data.detected_count : null)

          const annotated = data.annotated_image
            ? `data:image/jpeg;base64,${String(data.annotated_image).replace(/^data:image\/[a-z]+;base64,/, '')}`
            : null

          const url = data.photo_url || data.image_url
          const isAnalyzing = ['analyzing', 'pending', 'uploaded'].includes(data.analysis_status || data.status || '')
          const hasAnalysis =
            (data.analysis_status === 'completed') ||
            !!annotated ||
            (totalStrawberries !== null && totalStrawberries !== undefined)

          return {
            id: docSnap.id,
            url,
            annotatedUrl: annotated || url,
            displayUrl: hasAnalysis && annotated ? annotated : url,
            thumbnail: hasAnalysis && annotated ? annotated : url,
            //filename: data.filename || data.storage_path?.split('/').pop() || `photo_${docSnap.id}.jpg`,
            uploadDate: (data.timestamp && data.timestamp.toDate && data.timestamp.toDate()) || new Date(),
            source: (data.source || data.mode || 'unknown')?.toLowerCase(),
            storage_path: data.storage_path || null,
            hasAnalysis,
            isAnalyzing,
            analysisData: data.analysis || null,
            totalStrawberries
          }
        })
        // Only show hardware
        this.photos = this.photos.filter(p => p.source === 'hardware')
      } catch (err) {
        console.error('Error loading hardware photos:', err)
      } finally {
        this.loading = false
      }
    },

    startAnalysisWatcher() {
      if (!this.plantId) return
      const db = getFirestore()
      const uploadsRef = collection(db, 'plants', this.plantId, 'uploads')

      // Watch all uploads; selectively process hardware items that are pending.
      this.unsubAnalysis = onSnapshot(uploadsRef, async (snap) => {
        for (const docSnap of snap.docs) {
          const d = docSnap.data() || {}
          const src = (d.source || d.mode || '').toLowerCase()
          const status = d.analysis_status || d.status || ''
          if (src !== 'hardware') continue
          if (!d.photo_url) continue
          if (!['pending', 'uploaded'].includes(status)) continue
          if (this._processingIds.has(docSnap.id)) continue
          this._processingIds.add(docSnap.id)
          try {
            await this.processWithMLServer(docSnap.ref, d)
          } finally {
            this._processingIds.delete(docSnap.id)
          }
        }
      }, (err) => {
        console.error('[hardware watcher] error:', err)
      })
    },

    // ⬇⬇ THE IMPORTANT PART: save BOTH JSON + annotated image ⬇⬇
    async processWithMLServer(docRef, data) {
      try {
        await updateDoc(docRef, { analysis_status: 'analyzing' })

        const mlBase = import.meta.env.VITE_FIREBASE_API_BASE
        const payload = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_url: data.photo_url, access_token: '123456' })
        }

        // Run JSON and image endpoints together
        const [jsonRes, imgRes] = await Promise.all([
          fetch(`${mlBase}/analyze`, payload),
          fetch(`${mlBase}/analyze_img`, payload)
        ])

        if (!jsonRes.ok) {
          const t = await jsonRes.text().catch(() => '')
          throw new Error(`ML JSON Error ${jsonRes.status}: ${t}`)
        }
        if (!imgRes.ok) {
          const t = await imgRes.text().catch(() => '')
          throw new Error(`ML Image Error ${imgRes.status}: ${t}`)
        }

        const json = await jsonRes.json()
        const blob = await imgRes.blob()
        const annotatedBase64 = await this.blobToBase64(blob)

        const ripenessData = json.ripeness_data || {}
        const totalStrawberries = Object.keys(ripenessData).length

        await updateDoc(docRef, {
          analysis_status: 'completed',
          // legacy/simple fields
          ripeness: json.ripeness ?? null,
          confidence: json.confidence ?? null,
          annotated_image: annotatedBase64,
          // rich data
          analysis: json,
          ripeness_data: ripenessData,
          total_strawberries: totalStrawberries
        })

        await this.loadPhotos()
      } catch (error) {
        console.error('Hardware photo analysis failed:', error)
        await updateDoc(docRef, {
          analysis_status: 'failed',
          analysis_error: error?.message || String(error)
        })
      }
    },

    async deletePhoto(photo) {
      if (!confirm(`Delete "${photo.filename}"?`)) return
      try {
        const db = getFirestore()
        const storage = getStorage()
        await deleteDoc(doc(db, 'plants', this.plantId, 'uploads', photo.id))
        if (photo.storage_path) {
          await deleteObject(storageRef(storage, photo.storage_path))
        }
        this.photos = this.photos.filter(p => p.id !== photo.id)
        if (this.selectedPhoto?.id === photo.id) this.selectedPhoto = null
      } catch (err) {
        console.error('Error deleting photo:', err)
      }
    },

    // helpers
    toDateSafe(d) {
      try {
        if (d && typeof d.toDate === 'function') d = d.toDate()
        const date = d instanceof Date ? d : new Date(d ?? Date.now())
        return isNaN(date.getTime()) ? new Date() : date
      } catch { return new Date() }
    },
    formatDate(d) {
      const date = this.toDateSafe(d)
      const today = new Date()
      const yesterday = new Date(today.getTime() - 86400000)
      if (date.toDateString() === today.toDateString()) return 'Today'
      if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
      return date.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    },
    formatTime(d) {
      return this.toDateSafe(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    },
    formatDateTime(d) {
      const date = this.toDateSafe(d)
      return date.toLocaleDateString('en-GB', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    },

    viewPhoto(photo) { this.selectedPhoto = photo },
    closePhotoViewer() { this.selectedPhoto = null },
    goBack() { this.$router.push('/mydiary') },

    blobToBase64(blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    }
  }
}
</script>

<style scoped>
/* kept concise; you can keep your previous styles if you prefer */
.page-container{min-height:100vh;background:linear-gradient(135deg,#f0f9ff 0%,#e0f2fe 50%,#f8fafc 100%);display:flex;flex-direction:column;position:relative;font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif}
.header{display:flex;align-items:center;padding:20px 16px;background:linear-gradient(135deg,#16a085 0%,#2ecc71 100%);color:#fff;box-shadow:0 8px 32px rgba(22,160,133,.3)}
.back-button{margin-right:16px;cursor:pointer;padding:8px;border-radius:10px;background:rgba(255,255,255,.1)}
.back-button i{font-size:24px;color:#fff}
.header-content{flex:1}
.header-content h1{font-size:28px;margin:0 0 6px 0;font-weight:900;color:#fff}
.header-subtitle{font-size:14px;opacity:.9;font-weight:600}
.page-content{padding:12px}
.photos-collection{padding:0 8px}
.section-header{display:flex;justify-content:space-between;align-items:center;margin:12px 0}
.date-title{font-size:20px;font-weight:700;color:#16a085;margin:0}
.photo-count{font-size:12px;color:#64748b;background:rgba(22,160,133,.1);padding:3px 10px;border-radius:20px}
.photos-flow{display:flex;flex-direction:column;gap:12px}
.photo-item{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,.08);border:1px solid rgba(22,160,133,.1)}
.photo-card{display:flex;cursor:pointer}
.card-image{position:relative;width:120px;height:120px;overflow:hidden;flex-shrink:0}
.card-image img{width:100%;height:100%;object-fit:cover}
.image-overlay{position:absolute;inset:0;background:linear-gradient(135deg,rgba(22,160,133,.8),rgba(46,204,113,.8));color:#fff;display:flex;align-items:center;justify-content:center;opacity:0;transition:.2s}
.photo-card:hover .image-overlay{opacity:1}
.analysis-indicator{position:absolute;top:6px;right:6px;background:linear-gradient(135deg,#16a085,#2ecc71);color:#fff;padding:3px 7px;border-radius:10px;font-size:11px;font-weight:700;display:flex;gap:4px}
.card-content{flex:1;padding:16px;display:flex;align-items:center;justify-content:space-between}
.photo-title{font-weight:600;color:#1e293b}
.upload-time{font-size:12px;color:#64748b;background:rgba(100,116,139,.1);padding:4px 8px;border-radius:8px}
.delete-btn{background:transparent;border:none;color:#ef4444;cursor:pointer;padding:6px;border-radius:8px}
.empty-state{text-align:center;padding:40px 0;color:#64748b}
.photo-modal{position:fixed;inset:0;background:rgba(0,0,0,.85);display:flex;justify-content:center;align-items:center;z-index:2000}
.modal-content{background:rgba(255,255,255,.96);border-radius:24px;max-width:95%;max-height:95%;overflow-y:auto;position:relative;padding-bottom:16px}
.modal-header{padding:20px 20px 0;display:flex;justify-content:space-between;align-items:flex-start}
.image-showcase{display:flex;gap:18px;justify-content:center;padding:18px;flex-wrap:wrap}
.image-container{display:flex;flex-direction:column;align-items:center;gap:8px}
.image-label{font-size:12px;font-weight:600;color:#64748b;padding:5px 10px;background:#f8fafc;border-radius:8px}
.image-label.processed{background:linear-gradient(135deg,#16a085,#2ecc71);color:#fff}
.image-showcase img{width:340px;height:340px;object-fit:contain;border-radius:18px;box-shadow:0 12px 36px rgba(0,0,0,.2);border:3px solid rgba(22,160,133,.15)}
.photo-details{padding:0 20px 20px}
.detail-card{background:rgba(248,250,252,.9);border-radius:18px;padding:18px;border:1px solid rgba(226,232,240,.5)}
.detail-header{display:flex;align-items:center;gap:8px;margin-bottom:10px;font-weight:600;color:#1e293b}
</style>
