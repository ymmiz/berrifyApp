<template>
  <div class="page-container">
    <!-- Header with back button -->
    <div class="header">
      <div class="back-button" @click="goBack">
        <i class="bi bi-arrow-left"></i>
      </div>
      <h1>{{ plantName }} Photos</h1>
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

      <!-- Add Photo Button -->
      <div class="add-photo-section">
        <button class="add-photo-btn" @click="addMorePhotos" :disabled="loadingUpload">
          <i class="bi bi-camera-fill"></i>
          {{ loadingUpload ? 'Uploading…' : 'Add More Photos' }}
        </button>
      </div>

      <!-- Photos grouped by day -->
      <div v-if="photosByDay.length" class="photos-timeline">
        <div v-for="dayGroup in photosByDay" :key="dayGroup.date" class="day-group">
          <div class="day-header">
            <div class="date-info">
              <h3>{{ formatDate(dayGroup.date) }}</h3>
              <span class="photo-count">{{ dayGroup.photos.length }} photo{{ dayGroup.photos.length > 1 ? 's' : '' }}</span>
            </div>
          </div>

          <div class="photos-grid">
            <div v-for="photo in dayGroup.photos" :key="photo.id" class="photo-item">
              <div class="photo-thumbnail" @click="viewPhoto(photo)">
                <img :src="photo.url" :alt="photo.filename" />
                <div class="photo-overlay">
                  <i class="bi bi-eye-fill"></i>
                </div>
              </div>
              <div class="photo-info">
                <span class="photo-time">{{ formatTime(photo.uploadDate) }}</span>
                <span class="photo-name">{{ photo.filename }}</span>
                <span class="photo-source">({{ photo.source }})</span>
                <button class="delete-photo-btn" @click.stop="deletePhoto(photo)" title="Delete photo">
                  <i class="bi bi-trash-fill"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="empty-state">
        <div class="empty-icon">
          <i class="bi bi-camera"></i>
        </div>
        <h3>No photos yet</h3>
        <p>Start by taking some photos of your {{ plantName.toLowerCase() }}</p>
        <button class="btn-primary" @click="addMorePhotos" :disabled="loadingUpload">
          <i class="bi bi-camera-fill"></i>
          {{ loadingUpload ? 'Uploading…' : 'Take First Photo' }}
        </button>
      </div>
    </div>

    <!-- Photo Viewer Modal -->
    <div v-if="selectedPhoto" class="photo-modal" @click="closePhotoViewer">
      <div class="modal-content" @click.stop>
        <button class="close-btn" @click="closePhotoViewer"><i class="bi bi-x-lg"></i></button>
        <button class="modal-delete-btn" @click="deletePhoto(selectedPhoto)" title="Delete photo"><i class="bi bi-trash-fill"></i></button>
        <img :src="selectedPhoto.url" :alt="selectedPhoto.filename" />
        <div class="photo-details">
          <h4>{{ selectedPhoto.filename }}</h4>
          <p>Uploaded: {{ formatDateTime(selectedPhoto.uploadDate) }}</p>
          <div v-if="selectedPhoto.detected" class="detection-info">
            <i class="bi bi-basket-fill"></i>
            {{ selectedPhoto.detected }} strawberries detected
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
        if (!groups[date]) groups[date] = { date, photos: [], totalStrawberries: 0 }
        groups[date].photos.push(photo)
        if (photo.detected) groups[date].totalStrawberries += photo.detected
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
            filename: this.extractFilename(data.storage_path) || `photo_${docSnap.id}.jpg`,
            uploadDate: data.timestamp?.toDate() || new Date(),
            source: data.source || 'unknown',
            detected: data.detected_count || 0,
            storage_path: data.storage_path
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
          detected_count: 0
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
  background: linear-gradient(135deg, #8AB58A 0%, #A8D4A8 100%);
  color: #fff;
  padding: 24px;
}

.header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.back-button {
  width: 44px;
  height: 44px;
  background: #fff;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 18px rgba(0,0,0,.15);
  cursor: pointer;
  transition: all 0.3s ease;
}

.back-button:hover {
  transform: translateY(-2px);
}

.back-button i {
  font-size: 20px;
  color: #2e7d32;
}

.header h1 {
  font-size: 28px;
  font-weight: 700;
  margin: 0;
  color: #fff;
}

.page-content {
  background: #fff;
  color: #2c3e50;
  border-radius: 20px;
  padding: 32px 28px;
  box-shadow: 0 8px 32px rgba(0,0,0,.12);
  max-width: 800px;
  margin: 0 auto;
}

.add-photo-section {
  margin-bottom: 32px;
  text-align: center;
}

.add-photo-btn {
  background: linear-gradient(135deg, #8AB58A, #2e7d32);
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 14px 24px;
  font-size: 16px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.add-photo-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(46,125,50,.28);
}

.photos-timeline {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.day-group {
  border-radius: 16px;
  overflow: hidden;
}

.day-header {
  background: rgba(46,125,50,.08);
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(46,125,50,.12);
}

.date-info h3 {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  color: #2c3e50;
}

.photo-count {
  font-size: 14px;
  color: #6b7b8a;
  font-weight: 600;
}

.day-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #2e7d32;
  font-weight: 600;
  font-size: 16px;
}

.day-stats i {
  font-size: 18px;
}

.photos-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* Force 3 columns */
  gap: 20px;
  padding: 24px;
}

.photo-item {
  width: 100%;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,.08);
  transition: all 0.3s ease;
  aspect-ratio: 1; /* Make items square */
}

.photo-thumbnail {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  cursor: pointer;
}

.photo-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Delete button styles */
.delete-photo-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(220, 53, 69, 0.9);
  color: white;
  border: none;
  border-radius: 6px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: all 0.3s ease;
  font-size: 12px;
}

.photo-item:hover .delete-photo-btn {
  opacity: 1;
}

.delete-photo-btn:hover {
  background: #dc3545;
  transform: scale(1.1);
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 64px;
  color: #d0d7cf;
  margin-bottom: 24px;
}

.empty-state h3 {
  font-size: 24px;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 12px;
}

.empty-state p {
  font-size: 16px;
  color: #6b7b8a;
  margin: 0 0 32px;
}

.btn-primary {
  background: linear-gradient(135deg, #8AB58A, #2e7d32);
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 14px 24px;
  font-size: 16px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(46,125,50,.28);
}

/* Photo Modal */
.photo-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: #fff;
  border-radius: 16px;
  max-width: 90vw;
  max-height: 90vh;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(0,0,0,.6);
  color: #fff;
  border: none;
  border-radius: 8px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
}

.modal-delete-btn {
  position: absolute;
  top: 16px;
  right: 60px; /* Position to the left of close button */
  background: rgba(220, 53, 69, 0.9);
  color: #fff;
  border: none;
  border-radius: 8px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: all 0.3s ease;
}

.modal-delete-btn:hover {
  background: #dc3545;
  transform: scale(1.1);
}

.modal-content img {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
}

.photo-details {
  padding: 20px 24px;
  background: #f8f9fa;
}

.photo-details h4 {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 8px;
  color: #2c3e50;
}

.photo-details p {
  font-size: 14px;
  color: #6b7b8a;
  margin: 0 0 12px;
}

.detection-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #2e7d32;
  font-weight: 600;
}

@media (max-width: 768px) {
  .page-container {
    padding: 16px;
  }
  
  .page-content {
    padding: 24px 20px;
  }
  
  .photos-grid {
    grid-template-columns: repeat(2, 1fr); /* 2 columns on mobile */
    gap: 12px;
    padding: 16px;
  }
  
  .day-header {
    padding: 16px 20px;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .delete-photo-btn {
    opacity: 1; /* Always show on mobile */
  }
}
</style>