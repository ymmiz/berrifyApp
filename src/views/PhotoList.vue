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
      <!-- Add Photo Button -->
      <div class="add-photo-section">
        <button class="add-photo-btn" @click="addMorePhotos">
          <i class="bi bi-camera-fill"></i>
          Add More Photos
        </button>
      </div>

      <!-- Photos grouped by day -->
      <div v-if="photosByDay.length" class="photos-timeline">
        <div 
          v-for="dayGroup in photosByDay" 
          :key="dayGroup.date" 
          class="day-group"
        >
          <div class="day-header">
            <div class="date-info">
              <h3>{{ formatDate(dayGroup.date) }}</h3>
              <span class="photo-count">{{ dayGroup.photos.length }} photo{{ dayGroup.photos.length > 1 ? 's' : '' }}</span>
            </div>
            <!-- <div class="day-stats" v-if="dayGroup.totalStrawberries">
              <i class="bi bi-basket-fill"></i>
              {{ dayGroup.totalStrawberries }} strawberries
            </div> -->
          </div>

          <div class="photos-grid">
            <div 
              v-for="photo in dayGroup.photos" 
              :key="photo.id"
              class="photo-item"
            >
              <div class="photo-thumbnail" @click="viewPhoto(photo)">
                <img :src="photo.url" :alt="photo.filename" />
                <div class="photo-overlay">
                  <i class="bi bi-eye-fill"></i>
                </div>
              </div>
              <div class="photo-info">
                <span class="photo-time">{{ formatTime(photo.uploadDate) }}</span>
                <span class="photo-name">{{ photo.filename }}</span>
                <!-- Delete button -->
                <button 
                  class="delete-photo-btn" 
                  @click.stop="deletePhoto(photo)"
                  title="Delete photo"
                >
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
        <button class="btn-primary" @click="addMorePhotos">
          <i class="bi bi-camera-fill"></i>
          Take First Photo
        </button>
      </div>
    </div>

    <!-- Photo Viewer Modal -->
    <div v-if="selectedPhoto" class="photo-modal" @click="closePhotoViewer">
      <div class="modal-content" @click.stop>
        <button class="close-btn" @click="closePhotoViewer">
          <i class="bi bi-x-lg"></i>
        </button>
        <!-- Delete button in modal -->
        <button class="modal-delete-btn" @click="deletePhoto(selectedPhoto)" title="Delete photo">
          <i class="bi bi-trash-fill"></i>
        </button>
        
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
import { getFirestore, collection, query, orderBy, getDocs, doc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { getStorage, ref as storageRef, deleteObject } from 'firebase/storage'
import { getAuth } from 'firebase/auth'

export default {
  name: 'PhotoList',
  data() {
    return {
      plantName: 'Plant',
      plantId: null,
      photos: [],
      selectedPhoto: null,
      loading: true
    }
  },
  computed: {
    photosByDay() {
      if (!this.photos.length) return []
      
      // Group photos by date
      const groups = {}
      this.photos.forEach(photo => {
        const date = new Date(photo.uploadDate).toDateString()
        if (!groups[date]) {
          groups[date] = {
            date: date,
            photos: [],
            totalStrawberries: 0
          }
        }
        groups[date].photos.push(photo)
        if (photo.detected) {
          groups[date].totalStrawberries += photo.detected
        }
      })

      // Convert to array and sort by date (newest first)
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
      
      if (!this.plantId) {
        this.$router.push('/mydiary')
      }
    },

    async loadPhotos() {
      if (!this.plantId) return
      
      try {
        const db = getFirestore()
        
        // Load from the subcollection 'uploads' under the specific plant document
        const photosQuery = query(
          collection(db, 'plants', this.plantId, 'uploads'),
          orderBy('timestamp', 'desc')
        )
        
        const snapshot = await getDocs(photosQuery)
        
        this.photos = snapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            url: data.image_url,
            filename: this.extractFilename(data.storage_path) || `photo_${doc.id}.jpg`,
            uploadDate: data.timestamp?.toDate() || new Date(),
            source: data.source || 'unknown',
            detected: data.detected_count || 0,
            storage_path: data.storage_path // Important: include this for deletion
          }
        })
        
      } catch (error) {
        console.error('Error loading photos:', error)
        // Optionally show user-friendly error message
        this.$emit('show-error', 'Failed to load photos')
      } finally {
        this.loading = false
      }
    },

    // Helper method to extract filename from storage path
    extractFilename(storagePath) {
      if (!storagePath) return null
      const parts = storagePath.split('/')
      const fullName = parts[parts.length - 1]
      // Remove timestamp prefix if it exists (e.g., "1234567890_photo.jpg" -> "photo.jpg")
      return fullName.replace(/^\d+_/, '')
    },

    // Delete photo from both Firestore and Storage
    async deletePhoto(photo) {
      // Show confirmation dialog
      if (!confirm(`Are you sure you want to delete "${photo.filename}"? This cannot be undone.`)) {
        return
      }

      try {
        const db = getFirestore()
        const storage = getStorage()
        const auth = getAuth()
        
        // Check if user is authenticated
        if (!auth.currentUser) {
          throw new Error('You must be logged in to delete photos')
        }

        // Delete from Firestore uploads subcollection
        await deleteDoc(doc(db, 'plants', this.plantId, 'uploads', photo.id))
        
        // Delete from Firebase Storage if storage_path exists
        if (photo.storage_path) {
          const fileRef = storageRef(storage, photo.storage_path)
          await deleteObject(fileRef)
        }
        
        // Remove from local array to update UI immediately
        this.photos = this.photos.filter(p => p.id !== photo.id)
        
        // Update the main plant document
        await this.updatePlantPhotoUrl(photo)
        
        // Close photo viewer if this photo was being viewed
        if (this.selectedPhoto && this.selectedPhoto.id === photo.id) {
          this.selectedPhoto = null
        }
        
        console.log('Photo deleted successfully')
        
      } catch (error) {
        console.error('Error deleting photo:', error)
        alert('Failed to delete photo. Please try again.')
      }
    },

    // Update the main plant document's photo_url after deletion
    async updatePlantPhotoUrl(deletedPhoto) {
      try {
        const db = getFirestore()
        const plantDocRef = doc(db, 'plants', this.plantId)
        
        // Check if the deleted photo was the current plant photo_url
        const remainingPhotos = this.photos.filter(p => p.id !== deletedPhoto.id)
        
        if (remainingPhotos.length > 0) {
          // Set to the most recent remaining photo
          const mostRecent = remainingPhotos[0] // Already sorted by timestamp desc
          await setDoc(plantDocRef, {
            photo_url: mostRecent.url,
            last_photo_at: mostRecent.uploadDate
          }, { merge: true })
        } else {
          // No photos left, remove photo_url and last_photo_at
          await setDoc(plantDocRef, {
            photo_url: null,
            last_photo_at: null
          }, { merge: true })
        }
        
      } catch (error) {
        console.error('Error updating plant photo URL:', error)
        // Don't throw error here as the main deletion was successful
      }
    },

    // Method to refresh photos after new upload
    async refreshPhotos() {
      this.loading = true
      await this.loadPhotos()
    },

    formatDate(dateString) {
      const date = new Date(dateString)
      const today = new Date()
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      
      if (date.toDateString() === today.toDateString()) {
        return 'Today'
      } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday'
      } else {
        return date.toLocaleDateString('en-GB', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      }
    },

    formatTime(dateString) {
      return new Date(dateString).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
      })
    },

    formatDateTime(dateString) {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    },

    viewPhoto(photo) {
      this.selectedPhoto = photo
    },

    closePhotoViewer() {
      this.selectedPhoto = null
    },

    addMorePhotos() {
      this.$router.push({
        path: '/phone',  // Changed from '/plant-scan' to '/scan'
        query: {
          mode: 'add',  // Add mode parameter
          plantId: this.plantId,
          plantName: this.plantName,
          returnTo: '/photolist'  // Add return path
        }
      })
    },

    goBack() {
      this.$router.push('/mydiary')
    }
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