<template>
  <div class="page-container">
    <!-- Enhanced Header -->
    <div class="header">
      <div class="back-button" @click="goBack">
        <i class="bi bi-arrow-left"></i>
      </div>
      <div class="header-content">
        <h1>{{ plantName }}</h1>
        <div class="header-subtitle">Photo Gallery</div>
      </div>
      <div class="header-decoration">
        <i class="bi bi-camera2"></i>
      </div>
    </div>
 
    <div class="page-content">
      <!-- Hidden file input for phone uploads -->
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        capture="environment"
        style="display:none"
        @change="handleFile"
      />
 
      <!-- Enhanced Add Photo Button -->
      <div class="add-photo-section">
        <button class="add-photo-btn" @click="addMorePhotos" :disabled="loadingUpload">
          <div class="btn-icon">
            <i class="bi bi-camera-fill"></i>
          </div>
          <span class="btn-text">{{ loadingUpload ? 'Uploading…' : 'Capture New Photo' }}</span>
          <div class="btn-shine"></div>
        </button>
      </div>
 
      <!-- Enhanced Photos Timeline -->
      <div v-if="photosByDay.length" class="photos-timeline">
        <div v-for="dayGroup in photosByDay" :key="dayGroup.date" class="day-group">
          <div class="day-header">
            <div class="date-badge">
              <div class="date-main">{{ formatDate(dayGroup.date) }}</div>
              <div class="photo-count">{{ dayGroup.photos.length }} photo{{ dayGroup.photos.length > 1 ? 's' : '' }}</div>
            </div>
            <div class="day-divider"></div>
          </div>
 
          <div class="photos-grid">
            <div v-for="photo in dayGroup.photos" :key="photo.id" class="photo-card">
              <div class="photo-thumbnail" @click="viewPhoto(photo)">
                <img :src="photo.annotated_url || photo.url" :alt="photo.filename" />
                <div class="photo-overlay">
                  <div class="overlay-content">
                    <i class="bi bi-eye-fill"></i>
                    <span>View</span>
                  </div>
                </div>
                <div class="photo-badge" v-if="photo.analysis && photo.analysis.total">
                  <i class="bi bi-check-circle-fill"></i>
                  <span>{{ photo.analysis.total }}</span>
                </div>
              </div>
              <div class="photo-info">
                <div class="photo-meta">
                  <span class="photo-time">{{ formatTime(photo.uploadDate) }}</span>
                  <span class="photo-source">{{ photo.source }}</span>
                </div>
                <span class="photo-name">{{ photo.filename }}</span>
                <button class="delete-photo-btn" @click.stop="deletePhoto(photo)" title="Delete photo">
                  <i class="bi bi-trash3-fill"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
 
      <!-- Enhanced Empty State -->
      <div v-else class="empty-state">
        <div class="empty-illustration">
          <div class="empty-circle">
            <i class="bi bi-camera"></i>
          </div>
          <div class="empty-sparkles">
            <div class="sparkle sparkle-1">✨</div>
            <div class="sparkle sparkle-2">✨</div>
            <div class="sparkle sparkle-3">✨</div>
          </div>
        </div>
        <h3>Your photo journey begins here</h3>
        <p>Capture beautiful moments of your {{ plantName.toLowerCase() }} as it grows</p>
        <button class="btn-primary" @click="addMorePhotos" :disabled="loadingUpload">
          <i class="bi bi-camera-fill"></i>
          {{ loadingUpload ? 'Uploading…' : 'Take First Photo' }}
        </button>
      </div>
    </div>
 
    <!-- Enhanced Photo Viewer Modal -->
    <div v-if="selectedPhoto" class="photo-modal" @click="closePhotoViewer">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ selectedPhoto.filename }}</h3>
          <div class="modal-actions">
            <button class="modal-delete-btn" @click="deletePhoto(selectedPhoto)" title="Delete photo">
              <i class="bi bi-trash3-fill"></i>
            </button>
            <button class="close-btn" @click="closePhotoViewer">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </div>
 
        <!-- Enhanced Image Display -->
        <div class="image-showcase">
          <div class="image-container">
            <div class="image-label">Original</div>
            <img :src="selectedPhoto.url" :alt="selectedPhoto.filename" />
          </div>
          <div v-if="selectedPhoto.annotated_url" class="image-container">
            <div class="image-label analyzed">Analyzed</div>
            <img :src="selectedPhoto.annotated_url" :alt="selectedPhoto.filename + ' annotated'" />
          </div>
        </div>
 
        <!-- Enhanced Details Section -->
        <div class="photo-details">
          <div class="detail-card">
            <div class="detail-header">
              <i class="bi bi-info-circle-fill"></i>
              <span>Photo Details</span>
            </div>
            <p class="upload-date">{{ formatDateTime(selectedPhoto.uploadDate) }}</p>
          </div>
 
          <!-- Enhanced Detection Results -->
          <div v-if="selectedPhoto.analysis" class="analysis-card">
            <div class="detail-header">
              <i class="bi bi-cpu-fill"></i>
              <span>AI Analysis Results</span>
            </div>
            <div class="analysis-stats">
              <div class="stat-item total">
                <div class="stat-number">{{ selectedPhoto.analysis.total || 0 }}</div>
                <div class="stat-label">Total Detected</div>
              </div>
              <div class="stats-breakdown">
                <div class="stat-item ripe">
                  <span class="stat-icon">🍓</span>
                  <span class="stat-value">{{ selectedPhoto.analysis.ripe || 0 }} Ripe</span>
                </div>
                <div class="stat-item unripe">
                  <span class="stat-icon">🟢</span>
                  <span class="stat-value">{{ selectedPhoto.analysis.unripe || 0 }} Unripe</span>
                </div>
                <div class="stat-item overripe">
                  <span class="stat-icon">⚠️</span>
                  <span class="stat-value">{{ selectedPhoto.analysis.overripe || 0 }} Overripe</span>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="analysis-card empty">
            <div class="detail-header">
              <i class="bi bi-hourglass-split"></i>
              <span>Analysis Pending</span>
            </div>
            <p>AI analysis is processing or not available for this photo.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
 
<script>
import {
  getFirestore, collection, query, orderBy, getDocs,
  doc, deleteDoc, setDoc, serverTimestamp
} from 'firebase/firestore'
import {
  getStorage, ref as storageRef, deleteObject,
  uploadBytes, getDownloadURL
} from 'firebase/storage'
import { getAuth } from 'firebase/auth'
 
export default {
  name: 'PhotoList',
  data() {
    return {
      plantName: 'Plant',
      plantId: null,
      mode: 'phone',       // default (phone or hardware)
      photos: [],
      selectedPhoto: null,
      loading: true,
      loadingUpload: false
    }
  },
  computed: {
    photosByDay() {
      if (!this.photos.length) return []
      const groups = {}
      this.photos.forEach(photo => {
        const date = new Date(photo.uploadDate).toDateString()
        if (!groups[date]) groups[date] = { date, photos: [] }
        groups[date].photos.push(photo)
      })
      return Object.values(groups).sort((a, b) => new Date(b.date) - new Date(a.date))
    }
  },
  mounted() {
    this.loadPlantDetails()
    this.loadPhotos()
  },
  methods: {
    loadPlantDetails() {
      if (this.$route.query.plantName) this.plantName = this.$route.query.plantName
      if (this.$route.query.plantId) this.plantId = this.$route.query.plantId
      if (this.$route.query.mode) this.mode = this.$route.query.mode
      if (!this.plantId) this.$router.push('/mydiary')
    },
 
    async loadPhotos() {
      if (!this.plantId) return
      try {
        const db = getFirestore()
        const photosQuery = query(
          collection(db, 'plants', this.plantId, 'uploads'),
          orderBy('timestamp', 'desc')
        )
        const snapshot = await getDocs(photosQuery)
        this.photos = snapshot.docs.map(docSnap => {
          const data = docSnap.data()
          return {
            id: docSnap.id,
            url: data.image_url,
            annotated_url: data.annotated_image || null, // 👈 new
            filename: this.extractFilename(data.storage_path) || `photo_${docSnap.id}.jpg`,
            uploadDate: data.timestamp?.toDate() || new Date(),
            source: data.source || 'unknown',
            storage_path: data.storage_path,
            analysis: data.analysis || null // 👈 analysis with ripe/unripe/overripe counts
          }
        })
      } catch (err) {
        console.error('Error loading photos:', err)
      } finally {
        this.loading = false
      }
    },
 
    extractFilename(path) {
      if (!path) return null
      const parts = path.split('/')
      return parts[parts.length - 1].replace(/^\d+_/, '')
    },
 
    async deletePhoto(photo) {
      if (!confirm(`Are you sure you want to delete "${photo.filename}"?`)) return
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
 
    async handleFile(event) {
      const file = event.target.files?.[0]
      if (!file) return
      try {
        this.loadingUpload = true
        const storage = getStorage()
        const db = getFirestore()
        const auth = getAuth()
        const uid = auth.currentUser?.uid
        if (!uid) return alert('Please log in first.')
        const ts = Date.now()
        const safeName = file.name?.replace(/[^\w.\-]/g, '_') || 'photo.jpg'
        const path = `plants/${this.plantId}/${uid}/${ts}_${safeName}`
        const fileRef = storageRef(storage, path)
        await uploadBytes(fileRef, file)
        const url = await getDownloadURL(fileRef)
        const uploadId = `${uid}_${ts}`
        await setDoc(doc(db, 'plants', this.plantId, 'uploads', uploadId), {
          id: uploadId,
          plantId: this.plantId,
          user_id: uid,
          image_url: url,
          storage_path: path,
          timestamp: serverTimestamp(),
          source: 'phone',
          detected_count: 0,
          analysis: null
        })
        await this.refreshPhotos()
      } catch (err) {
        console.error('Upload failed:', err)
        alert('Failed to upload photo.')
      } finally {
        this.loadingUpload = false
        if (event?.target) event.target.value = ''
      }
    },
 
    async refreshPhotos() {
      this.loading = true
      await this.loadPhotos()
    },
 
    addMorePhotos() {
      if (this.mode === 'hardware') {
        this.$router.push({
          path: '/hardware',
          query: { plantId: this.plantId, plantName: this.plantName }
        })
      } else {
        this.$refs.fileInput.click()
      }
    },
 
    formatDate(d) {
      const date = new Date(d)
      const today = new Date()
      const yesterday = new Date(today.getTime() - 86400000)
      if (date.toDateString() === today.toDateString()) return 'Today'
      if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
      return date.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    },
 
    formatTime(d) {
      return new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    },
 
    formatDateTime(d) {
      const date = new Date(d)
      return date.toLocaleDateString('en-GB', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    },
 
    viewPhoto(photo) { this.selectedPhoto = photo },
    closePhotoViewer() { this.selectedPhoto = null },
    goBack() { this.$router.push('/mydiary') }
  }
}
</script>
 
<style scoped>
.page-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f8fafc 100%);
  display: flex;
  flex-direction: column;
  position: relative;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}
 
/* Enhanced Header */
.header {
  display: flex;
  align-items: center;
  padding: 20px 16px;
  background: linear-gradient(135deg, #16a085 0%, #2ecc71 100%);
  color: white;
  box-shadow: 0 8px 32px rgba(22, 160, 133, 0.3);
  position: relative;
  overflow: hidden;
}

.header::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -20%;
  width: 100px;
  height: 200%;
  background: linear-gradient(45deg, rgba(255,255,255,0.1) 0%, transparent 100%);
  transform: rotate(15deg);
}

.back-button {
  margin-right: 16px;
  cursor: pointer;
  padding: 8px;
  border-radius: 10px;
  transition: all 0.3s ease;
  background: rgba(255,255,255,0.1);
}

.back-button:hover {
  background: rgba(255,255,255,0.2);
  transform: translateX(-2px);
}

.header-content {
  flex: 1;
}

.header-content h1 {
  font-size: 24px;
  margin: 0 0 4px 0;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.header-subtitle {
  font-size: 14px;
  opacity: 0.9;
  font-weight: 400;
}

.header-decoration {
  font-size: 24px;
  opacity: 0.6;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-4px) rotate(5deg); }
}
 
/* Enhanced Add Photo Button */
.add-photo-section {
  padding: 24px 16px;
  display: flex;
  justify-content: center;
}

.add-photo-btn, .btn-primary {
  background: linear-gradient(135deg, #16a085 0%, #2ecc71 100%);
  color: white;
  padding: 16px 24px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 16px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(22, 160, 133, 0.3);
}

.add-photo-btn:hover, .btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(22, 160, 133, 0.4);
}

.add-photo-btn:active, .btn-primary:active {
  transform: translateY(0);
}

.btn-icon {
  font-size: 18px;
}

.btn-shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left 0.5s ease;
}

.add-photo-btn:hover .btn-shine {
  left: 100%;
}
 
/* Enhanced Timeline */
.photos-timeline {
  padding: 0 16px;
}

.day-group {
  margin-bottom: 32px;
  background: white;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0,0,0,0.08);
  border: 1px solid rgba(22, 160, 133, 0.1);
}

.day-header {
  padding: 20px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid rgba(22, 160, 133, 0.1);
  position: relative;
}

.date-badge {
  display: inline-flex;
  flex-direction: column;
  gap: 4px;
}

.date-main {
  font-size: 18px;
  font-weight: 700;
  color: #16a085;
  margin: 0;
}

.photo-count {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

.day-divider {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  width: 60px;
  height: 3px;
  background: linear-gradient(90deg, #16a085, #2ecc71);
  border-radius: 2px;
}
 
/* Enhanced Photos Grid */
.photos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  padding: 20px;
}

.photo-card {
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.photo-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0,0,0,0.15);
  border-color: rgba(22, 160, 133, 0.3);
}

.photo-thumbnail {
  position: relative;
  cursor: pointer;
  overflow: hidden;
}

.photo-thumbnail img {
  width: 100%;
  height: 180px;
  object-fit: cover;
  display: block;
  transition: transform 0.3s ease;
}

.photo-card:hover .photo-thumbnail img {
  transform: scale(1.05);
}

.photo-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(22, 160, 133, 0.9), rgba(46, 204, 113, 0.9));
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0;
  transition: all 0.3s ease;
}

.photo-thumbnail:hover .photo-overlay {
  opacity: 1;
}

.overlay-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.overlay-content i {
  font-size: 24px;
}

.photo-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: linear-gradient(135deg, #16a085, #2ecc71);
  color: white;
  padding: 6px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

.photo-info {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.photo-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.photo-time {
  background: #f1f5f9;
  padding: 4px 8px;
  border-radius: 8px;
}

.photo-source {
  background: linear-gradient(135deg, #16a085, #2ecc71);
  color: white;
  padding: 4px 8px;
  border-radius: 8px;
  text-transform: capitalize;
}

.photo-name {
  font-size: 14px;
  color: #1e293b;
  font-weight: 500;
  word-break: break-word;
}

.delete-photo-btn {
  background: transparent;
  border: none;
  color: #ef4444;
  cursor: pointer;
  align-self: flex-end;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.delete-photo-btn:hover {
  background: #fef2f2;
  color: #dc2626;
  transform: scale(1.1);
}
 
/* Enhanced Empty State */
.empty-state {
  text-align: center;
  padding: 60px 16px;
  color: #64748b;
}

.empty-illustration {
  position: relative;
  margin-bottom: 32px;
  display: inline-block;
}

.empty-circle {
  width: 120px;
  height: 120px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 48px;
  color: #16a085;
  box-shadow: 0 8px 32px rgba(22, 160, 133, 0.1);
  border: 3px solid rgba(22, 160, 133, 0.1);
}

.empty-sparkles {
  position: absolute;
  inset: 0;
}

.sparkle {
  position: absolute;
  font-size: 16px;
  animation: sparkle 2s ease-in-out infinite;
}

.sparkle-1 {
  top: 10%;
  right: 20%;
  animation-delay: 0s;
}

.sparkle-2 {
  bottom: 20%;
  left: 10%;
  animation-delay: 0.7s;
}

.sparkle-3 {
  top: 30%;
  left: -10%;
  animation-delay: 1.4s;
}

@keyframes sparkle {
  0%, 100% { transform: scale(0) rotate(0deg); opacity: 0; }
  50% { transform: scale(1) rotate(180deg); opacity: 1; }
}

.empty-state h3 {
  font-size: 24px;
  color: #1e293b;
  margin-bottom: 12px;
  font-weight: 700;
}

.empty-state p {
  font-size: 16px;
  margin-bottom: 32px;
  color: #64748b;
  max-width: 300px;
  margin-left: auto;
  margin-right: auto;
}
 
/* Enhanced Modal */
.photo-modal {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  backdrop-filter: blur(8px);
}

.modal-content {
  background: white;
  border-radius: 24px;
  max-width: 90%;
  max-height: 90%;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 24px 64px rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.2);
}

.modal-header {
  padding: 24px 24px 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  flex: 1;
  margin-right: 16px;
}

.modal-actions {
  display: flex;
  gap: 8px;
}

.close-btn, .modal-delete-btn {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  font-size: 16px;
  padding: 12px;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.close-btn:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.modal-delete-btn {
  color: #ef4444;
  border-color: #fecaca;
}

.modal-delete-btn:hover {
  background: #fef2f2;
  color: #dc2626;
  border-color: #fca5a5;
}

.image-showcase {
  display: flex;
  gap: 24px;
  justify-content: center;
  padding: 24px;
  flex-wrap: wrap;
}

.image-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.image-label {
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  padding: 6px 12px;
  background: #f8fafc;
  border-radius: 8px;
}

.image-label.analyzed {
  background: linear-gradient(135deg, #16a085, #2ecc71);
  color: white;
}

.image-showcase img {
  max-width: 320px;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.15);
  border: 2px solid rgba(22, 160, 133, 0.1);
}

.photo-details {
  padding: 0 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-card, .analysis-card {
  background: #f8fafc;
  border-radius: 16px;
  padding: 20px;
  border: 1px solid #e2e8f0;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-weight: 600;
  color: #1e293b;
}

.detail-header i {
  color: #16a085;
}

.upload-date {
  margin: 0;
  color: #64748b;
  font-size: 14px;
}

.analysis-stats {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stat-item.total {
  text-align: center;
  padding: 20px;
  background: linear-gradient(135deg, #16a085, #2ecc71);
  color: white;
  border-radius: 12px;
}

.stat-number {
  font-size: 36px;
  font-weight: 800;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  opacity: 0.9;
}

.stats-breakdown {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}

.stats-breakdown .stat-item {
  background: white;
  padding: 16px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 2px solid #f1f5f9;
  transition: all 0.3s ease;
}

.stats-breakdown .stat-item:hover {
  border-color: #16a085;
  transform: translateY(-2px);
}

.stats-breakdown .stat-item.ripe:hover {
  border-color: #ef4444;
  box-shadow: 0 4px 16px rgba(239, 68, 68, 0.2);
}

.stats-breakdown .stat-item.unripe:hover {
  border-color: #22c55e;
  box-shadow: 0 4px 16px rgba(34, 197, 94, 0.2);
}

.stats-breakdown .stat-item.overripe:hover {
  border-color: #f59e0b;
  box-shadow: 0 4px 16px rgba(245, 158, 11, 0.2);
}

.stat-icon {
  font-size: 20px;
}

.stat-value {
  font-weight: 600;
  color: #1e293b;
  font-size: 14px;
}

.analysis-card.empty {
  background: #fafafa;
  border: 2px dashed #d1d5db;
  text-align: center;
}

.analysis-card.empty p {
  margin: 0;
  color: #6b7280;
  font-style: italic;
}

/* Responsive Design */
@media (max-width: 768px) {
  .header {
    padding: 16px;
  }
  
  .header-content h1 {
    font-size: 20px;
  }
  
  .photos-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
    padding: 16px;
  }
  
  .photo-thumbnail img {
    height: 150px;
  }
  
  .image-showcase {
    flex-direction: column;
    align-items: center;
  }
  
  .image-showcase img {
    max-width: 100%;
  }
  
  .stats-breakdown {
    grid-template-columns: 1fr;
  }
  
  .modal-content {
    max-width: 95%;
    margin: 20px;
  }
}

/* Loading States */
.add-photo-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.add-photo-btn:disabled:hover {
  transform: none;
  box-shadow: 0 8px 24px rgba(22, 160, 133, 0.3);
}

/* Smooth Animations */
.photo-card {
  animation: fadeInUp 0.5s ease-out;
}

.day-group {
  animation: fadeInUp 0.6s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Enhanced Focus States for Accessibility */
.back-button:focus,
.add-photo-btn:focus,
.btn-primary:focus,
.delete-photo-btn:focus,
.close-btn:focus,
.modal-delete-btn:focus {
  outline: 2px solid #16a085;
  outline-offset: 2px;
}

/* Subtle Micro-Interactions */
.photo-card {
  transform-origin: center bottom;
}

.stat-item {
  transform-origin: center;
}

.btn-text {
  transition: all 0.3s ease;
}

.add-photo-btn:hover .btn-text {
  letter-spacing: 0.5px;
}

/* Custom Scrollbar */
.modal-content::-webkit-scrollbar {
  width: 8px;
}

.modal-content::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.modal-content::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #16a085, #2ecc71);
  border-radius: 4px;
}

.modal-content::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #138d75, #27ae60);
}

/* Enhanced Visual Hierarchy */
.page-content {
  position: relative;
}

.page-content::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100px;
  background: linear-gradient(180deg, rgba(240, 249, 255, 0.8) 0%, transparent 100%);
  pointer-events: none;
}
</style>