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
      <!-- Photos Collection -->
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
                  <img :src="photo.url" :alt="photo.filename" />
                  <div class="image-overlay">
                    <i class="bi bi-eye-fill"></i>
                  </div>
                  <div v-if="photo.hasAnalysis" class="analysis-indicator">
                    <i class="bi bi-graph-up"></i>
                    <span>Analyzed</span>
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
          </div>
        </div>
      </div>
 
      <!-- Enhanced Empty State -->
      <div v-else class="empty-state">
        <div class="empty-illustration">
          <div class="empty-circle">
            <i class="bi bi-images"></i>
          </div>
          <div class="empty-sparkles">
            <div class="sparkle sparkle-1">✨</div>
            <div class="sparkle sparkle-2">✨</div>
            <div class="sparkle sparkle-3">✨</div>
          </div>
        </div>
        <h3>No photos yet</h3>
        <p>Photos from your {{ plantName.toLowerCase() }} garden will appear here once they're uploaded</p>
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
            <div class="image-label" :class="{ 'processed': selectedPhoto.hasAnalysis }">
              {{ selectedPhoto.hasAnalysis ? 'Ripeness Analysis' : 'Original Photo' }}
            </div>
            <img :src="selectedPhoto.url" :alt="selectedPhoto.filename" />
          </div>
          <div v-if="selectedPhoto.hasAnalysis && selectedPhoto.originalUrl" class="image-container">
            <div class="image-label">Original</div>
            <img :src="selectedPhoto.originalUrl" :alt="selectedPhoto.filename + ' original'" />
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
        </div>
      </div>
    </div>
  </div>
</template>
 
<script>
import {
  getFirestore, collection, query, orderBy, getDocs,
  doc, deleteDoc
} from 'firebase/firestore'
import {
  getStorage, ref as storageRef, deleteObject
} from 'firebase/storage'
 
export default {
  name: 'PhotoList',
  data() {
    return {
      plantName: 'Plant',
      plantId: null,
      mode: 'phone',       // default (phone or hardware)
      photos: [],
      selectedPhoto: null,
      loading: true
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
            url: data.annotated_image || data.image_url, // Use processed image with ripeness results if available
            originalUrl: data.image_url, // Keep original for reference
            filename: this.extractFilename(data.storage_path) || `photo_${docSnap.id}.jpg`,
            uploadDate: data.timestamp?.toDate() || new Date(),
            source: data.source || 'unknown',
            storage_path: data.storage_path,
            hasAnalysis: !!data.annotated_image // Track if this photo has been processed
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

    async refreshPhotos() {
      this.loading = true
      await this.loadPhotos()
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

.back-button i {
  font-size: 24px;
  color: white;
}

.back-button:hover {
  background: rgba(255,255,255,0.2);
  transform: translateX(-2px);
}

.header-content {
  flex: 1;
}

.header-content h1 {
  font-size: 32px;
  margin: 0 0 8px 0;
  font-weight: 900;
  color: white;
}

.header-subtitle {
  font-size: 17px;
  opacity: 0.9;
  font-weight: 600;
}

.header-decoration {
  font-size: 28px;
  opacity: 0.7;
}
 
/* Photos Collection */
.photos-collection {
  padding: 0 16px;
}

.day-section {
  margin-bottom: 32px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 0 8px;
}

.date-title {
  font-size: 24px;
  font-weight: 700;
  color: #16a085;
  margin: 0;
}

.photo-count {
  font-size: 14px;
  color: #64748b;
  background: rgba(22, 160, 133, 0.1);
  padding: 4px 12px;
  border-radius: 20px;
  font-weight: 500;
}

.photos-flow {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.photo-item {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0,0,0,0.08);
  border: 1px solid rgba(22, 160, 133, 0.1);
  transition: all 0.3s ease;
}

.photo-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(0,0,0,0.12);
}

.photo-card {
  display: flex;
  cursor: pointer;
}

.card-image {
  position: relative;
  width: 120px;
  height: 120px;
  overflow: hidden;
  flex-shrink: 0;
}

.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.photo-card:hover .card-image img {
  transform: scale(1.05);
}

.image-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(22, 160, 133, 0.8), rgba(46, 204, 113, 0.8));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.3s ease;
  font-size: 24px;
}

.photo-card:hover .image-overlay {
  opacity: 1;
}

.analysis-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  background: linear-gradient(135deg, #16a085, #2ecc71);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.2);
}

.analysis-indicator i {
  font-size: 12px;
}

.card-content {
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.photo-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 8px;
  word-break: break-word;
}

.photo-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.upload-time {
  font-size: 14px;
  color: #64748b;
  background: rgba(100, 116, 139, 0.1);
  padding: 4px 8px;
  border-radius: 8px;
}

.delete-btn {
  background: transparent;
  border: none;
  color: #ef4444;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.3s ease;
  font-size: 16px;
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  transform: scale(1.1);
}
 
/* Enhanced Photos Grid */
.photos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  padding: 28px;
}

.photo-card {
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0,0,0,0.1), 0 1px 0 rgba(255,255,255,0.5) inset;
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  border: 2px solid transparent;
  position: relative;
  animation: cardFloat 0.6s ease-out;
}

@keyframes cardFloat {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.photo-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(22, 160, 133, 0.1), rgba(46, 204, 113, 0.1));
  opacity: 0;
  transition: all 0.4s ease;
  z-index: -1;
}

.photo-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 20px 60px rgba(0,0,0,0.2), 0 1px 0 rgba(255,255,255,0.6) inset;
  border-color: rgba(22, 160, 133, 0.4);
}

.photo-card:hover::before {
  opacity: 1;
}

.photo-thumbnail {
  position: relative;
  cursor: pointer;
  overflow: hidden;
}

.photo-thumbnail img {
  width: 100%;
  height: 200px;
  object-fit: cover;
  display: block;
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  filter: contrast(1.1) saturate(1.1);
}

.photo-card:hover .photo-thumbnail img {
  transform: scale(1.08) rotate(0.5deg);
  filter: contrast(1.2) saturate(1.2) brightness(1.05);
}

.photo-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(22, 160, 133, 0.95), rgba(46, 204, 113, 0.9));
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0;
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  backdrop-filter: blur(5px);
}

.photo-thumbnail:hover .photo-overlay {
  opacity: 1;
}

.overlay-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  animation: overlayBounce 0.6s ease;
  text-shadow: 0 2px 8px rgba(0,0,0,0.3);
}

@keyframes overlayBounce {
  0% { transform: scale(0.3); opacity: 0; }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}

.overlay-content i {
  font-size: 28px;
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
  animation: iconRotate 2s ease-in-out infinite;
}

@keyframes iconRotate {
  0%, 100% { transform: rotate(0deg) scale(1); }
  50% { transform: rotate(5deg) scale(1.1); }
}

.photo-badge {
  position: absolute;
  top: 16px;
  right: 16px;
  background: linear-gradient(135deg, #16a085, #2ecc71);
  color: white;
  padding: 8px 12px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.2);
  backdrop-filter: blur(10px);
  animation: badgeFloat 3s ease-in-out infinite;
}

@keyframes badgeFloat {
  0%, 100% { transform: translateY(0px) scale(1); }
  50% { transform: translateY(-2px) scale(1.05); }
}

.photo-info {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%);
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
  padding: 80px 20px;
  color: #64748b;
  position: relative;
}

.empty-state::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(22, 160, 133, 0.05) 0%, transparent 70%);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  animation: breathe 6s ease-in-out infinite;
}

@keyframes breathe {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.3; }
  50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.6; }
}

.empty-illustration {
  position: relative;
  margin-bottom: 40px;
  display: inline-block;
  z-index: 2;
}

.empty-circle {
  width: 140px;
  height: 140px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 56px;
  color: #16a085;
  box-shadow: 0 15px 50px rgba(22, 160, 133, 0.15), 0 1px 0 rgba(255,255,255,0.5) inset;
  border: 4px solid rgba(22, 160, 133, 0.1);
  position: relative;
  overflow: hidden;
  animation: circleFloat 4s ease-in-out infinite;
}

@keyframes circleFloat {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  25% { transform: translateY(-10px) rotate(3deg); }
  50% { transform: translateY(-5px) rotate(-2deg); }
  75% { transform: translateY(-8px) rotate(2deg); }
}

.empty-circle::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: conic-gradient(from 0deg, transparent, rgba(22, 160, 133, 0.1), transparent);
  animation: rotate 8s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.empty-circle i {
  z-index: 2;
  filter: drop-shadow(0 4px 12px rgba(22, 160, 133, 0.2));
}

.empty-sparkles {
  position: absolute;
  inset: 0;
}

.sparkle {
  position: absolute;
  font-size: 20px;
  animation: sparkle 3s ease-in-out infinite;
  filter: drop-shadow(0 2px 4px rgba(22, 160, 133, 0.3));
}

.sparkle-1 {
  top: 15%;
  right: 20%;
  animation-delay: 0s;
  color: #16a085;
}

.sparkle-2 {
  bottom: 25%;
  left: 15%;
  animation-delay: 1s;
  color: #2ecc71;
}

.sparkle-3 {
  top: 40%;
  left: -5%;
  animation-delay: 2s;
  color: #27ae60;
}

@keyframes sparkle {
  0%, 100% { transform: scale(0) rotate(0deg); opacity: 0; }
  25% { transform: scale(0.5) rotate(90deg); opacity: 0.5; }
  50% { transform: scale(1.2) rotate(180deg); opacity: 1; }
  75% { transform: scale(0.8) rotate(270deg); opacity: 0.7; }
}

.empty-state h3 {
  font-size: 28px;
  color: #1e293b;
  margin-bottom: 16px;
  font-weight: 800;
  background: linear-gradient(135deg, #16a085, #2ecc71);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: none;
}

.empty-state p {
  font-size: 18px;
  margin-bottom: 40px;
  color: #64748b;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.6;
}
 
/* Enhanced Modal */
.photo-modal {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  backdrop-filter: blur(15px);
  animation: modalFadeIn 0.4s ease-out;
}

@keyframes modalFadeIn {
  from { opacity: 0; backdrop-filter: blur(0px); }
  to { opacity: 1; backdrop-filter: blur(15px); }
}

.modal-content {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 28px;
  max-width: 95%;
  max-height: 95%;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 30px 80px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.5) inset;
  border: 1px solid rgba(255,255,255,0.3);
  animation: modalSlideIn 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

@keyframes modalSlideIn {
  from { transform: scale(0.8) translateY(50px); opacity: 0; }
  to { transform: scale(1) translateY(0); opacity: 1; }
}

.modal-header {
  padding: 28px 28px 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  background: linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(248,250,252,0.8) 100%);
  border-bottom: 1px solid rgba(22, 160, 133, 0.1);
}

.modal-header h3 {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  color: #1e293b;
  flex: 1;
  margin-right: 20px;
  background: linear-gradient(135deg, #16a085, #2ecc71);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.modal-actions {
  display: flex;
  gap: 12px;
}

.close-btn, .modal-delete-btn {
  background: rgba(248,250,252,0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(226,232,240,0.5);
  cursor: pointer;
  font-size: 18px;
  padding: 14px;
  border-radius: 14px;
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  position: relative;
  overflow: hidden;
}

.close-btn::before, .modal-delete-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: rgba(22, 160, 133, 0.1);
  border-radius: 50%;
  transition: all 0.3s ease;
  transform: translate(-50%, -50%);
}

.close-btn:hover::before, .modal-delete-btn:hover::before {
  width: 100px;
  height: 100px;
}

.close-btn:hover {
  background: rgba(241,245,249,0.9);
  color: #1e293b;
  transform: scale(1.05);
}

.modal-delete-btn {
  color: #ef4444;
  border-color: rgba(254,202,202,0.5);
}

.modal-delete-btn:hover {
  background: rgba(254,242,242,0.9);
  color: #dc2626;
  border-color: rgba(252,165,165,0.5);
  transform: scale(1.05);
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

.image-label.processed {
  background: linear-gradient(135deg, #16a085, #2ecc71);
  color: white;
  box-shadow: 0 4px 12px rgba(22, 160, 133, 0.3);
}

.image-showcase img {
  max-width: 350px;
  border-radius: 20px;
  box-shadow: 0 15px 50px rgba(0,0,0,0.2), 0 1px 0 rgba(255,255,255,0.5) inset;
  border: 3px solid rgba(22, 160, 133, 0.15);
  transition: all 0.3s ease;
}

.image-showcase img:hover {
  transform: scale(1.02);
  box-shadow: 0 20px 60px rgba(0,0,0,0.25), 0 1px 0 rgba(255,255,255,0.6) inset;
}

.photo-details {
  padding: 0 28px 28px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.detail-card {
  background: rgba(248,250,252,0.8);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 24px;
  border: 1px solid rgba(226,232,240,0.5);
  box-shadow: 0 8px 32px rgba(0,0,0,0.05), 0 1px 0 rgba(255,255,255,0.5) inset;
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

/* Responsive Design */
@media (max-width: 768px) {
  .header {
    padding: 16px;
  }
  
  .back-button {
    padding: 6px;
  }
  
  .back-button i {
    font-size: 20px;
  }
  
  .header-content h1 {
    font-size: 24px;
  }
  
  .header-subtitle {
    font-size: 15px;
  }
  
  .photos-collection {
    padding: 0 12px;
  }
  
  .card-image {
    width: 100px;
    height: 100px;
  }
  
  .card-content {
    padding: 16px;
  }
  
  .photo-title {
    font-size: 15px;
    margin-bottom: 6px;
  }
  
  .upload-time {
    font-size: 13px;
  }
  
  .date-title {
    font-size: 20px;
  }
  
  .image-showcase {
    flex-direction: column;
    align-items: center;
  }
  
  .image-showcase img {
    max-width: 100%;
  }
  
  .modal-content {
    max-width: 95%;
    margin: 20px;
  }
}

/* Smooth Animations */
.photo-card {
  animation: fadeInUp 0.6s ease-out;
}

.photo-card:nth-child(odd) {
  animation-delay: 0.1s;
}

.photo-card:nth-child(even) {
  animation-delay: 0.2s;
}

.day-group {
  animation: fadeInUp 0.8s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Enhanced Focus States for Accessibility */
.back-button:focus,
.delete-photo-btn:focus,
.close-btn:focus,
.modal-delete-btn:focus {
  outline: 3px solid rgba(22, 160, 133, 0.5);
  outline-offset: 3px;
}

/* Subtle Micro-Interactions */
.photo-card {
  transform-origin: center bottom;
}

/* Advanced Hover Effects */
.photo-meta span {
  transition: all 0.3s ease;
}

.photo-meta span:hover {
  transform: scale(1.05);
}

.delete-photo-btn {
  background: transparent;
  border: none;
  color: #ef4444;
  cursor: pointer;
  align-self: flex-end;
  padding: 10px;
  border-radius: 12px;
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  position: relative;
  overflow: hidden;
}

.delete-photo-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 50%;
  transition: all 0.3s ease;
  transform: translate(-50%, -50%);
}

.delete-photo-btn:hover::before {
  width: 100px;
  height: 100px;
}

.delete-photo-btn:hover {
  background: rgba(254,242,242,0.8);
  color: #dc2626;
  transform: scale(1.15) rotate(5deg);
  box-shadow: 0 8px 25px rgba(239, 68, 68, 0.3);
}

/* Page Content Enhancement */
.page-content {
  position: relative;
  z-index: 2;
}

.page-content::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 150px;
  background: linear-gradient(180deg, 
    rgba(240, 249, 255, 0.9) 0%,
    rgba(224, 242, 254, 0.6) 30%,
    rgba(240, 253, 244, 0.4) 60%,
    transparent 100%
  );
  pointer-events: none;
  animation: contentGlow 8s ease-in-out infinite;
}

@keyframes contentGlow {
  0%, 100% { opacity: 0.7; transform: translateY(0px); }
  50% { opacity: 1; transform: translateY(-5px); }
}

/* Custom Scrollbar */
.modal-content::-webkit-scrollbar {
  width: 10px;
}

.modal-content::-webkit-scrollbar-track {
  background: rgba(241,245,249,0.5);
  border-radius: 6px;
}

.modal-content::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #16a085, #2ecc71);
  border-radius: 6px;
  border: 2px solid transparent;
  background-clip: content-box;
}

.modal-content::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #138d75, #27ae60);
  background-clip: content-box;
}
</style>