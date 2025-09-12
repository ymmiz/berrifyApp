<!-- Add this to your Profile template after the profile-name -->
<template>
  <div class="profile-page">
    <!-- Top Section -->
    <div class="profile-header">
      <div class="profile-avatar-container">
        <img 
          :src="user.photoURL || '/userImage.png'" 
          class="profile-avatar" 
          :alt="userProfile.name || 'User'"
        />
        <!-- Add upload button overlay -->
        <input
          type="file"
          ref="fileInput"
          accept="image/*"
          style="display: none"
          @change="handleImageUpload"
        />
        <button 
          class="upload-photo-btn"
          @click="$refs.fileInput.click()"
          :disabled="uploadingImage"
        >
          <i class="bi" :class="uploadingImage ? 'bi-hourglass-split' : 'bi-camera-fill'"></i>
        </button>
      </div>
      
      <!-- Editable Name Section -->
      <div v-if="editingName" class="name-edit-section">
        <input 
          v-model="tempName" 
          class="name-input"
          @keyup.enter="saveName"
          @keyup.escape="cancelEditName"
          placeholder="Enter your name"
          maxlength="50"
        />
        <div class="name-actions">
          <button class="save-btn" @click="saveName">
            <i class="bi bi-check-lg"></i>
          </button>
          <button class="cancel-btn" @click="cancelEditName">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      </div>
      
      <div v-else class="name-display-section">
        <h2 class="profile-name">{{ userProfile.name || user.displayName || user.email || 'User' }}</h2>
        <button class="edit-name-btn" @click="startEditName">
          <i class="bi bi-pencil"></i>
        </button>
      </div>
      
      <p v-if="user.email" class="profile-email">{{ user.email }}</p>
      <div v-if="userProfile.is_admin" class="admin-badge">
        <i class="bi bi-shield-check"></i>
        Admin
      </div>
      <p v-if="userProfile.join_date" class="profile-join-date">
        Member since {{ formatJoinDate(userProfile.join_date) }}
      </p>
    </div>

    <!-- User Stats Section
    <section class="section">
      <h3 class="section-title">My Stats</h3>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">
            <i class="bi bi-flower2"></i>
          </div>
          <div class="stat-info">
            <h4>{{ userPlants.length }}</h4>
            <p>Plants</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="bi bi-camera-fill"></i>
          </div>
          <div class="stat-info">
            <h4>{{ totalPhotos }}</h4>
            <p>Photos</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="bi bi-calendar-check"></i>
          </div>
          <div class="stat-info">
            <h4>{{ daysSinceFirstPlant }}</h4>
            <p>Days Growing</p>
          </div>
        </div>
      </div>
    </section> -->

    <!-- My Strawberries Section -->
    <section class="section">
      <h3 class="section-title">My Strawberries</h3>
      <div class="strawberries-grid" v-if="userPlants.length">
        <div
          class="strawberry-card"
          v-for="plant in userPlants"
          :key="plant.id"
          @click="viewPlant(plant)"
        >
          <img
            :src="plant.latest_photo"
            :alt="plant.name"
            class="strawberry-img"
          />
          <div class="plant-info">
            <h5>{{ plant.name }}</h5>
            <p>{{ formatPlantDate(plant.created_at) }}</p>
          </div>
        </div>
      </div>
      <div v-else class="empty-plants">
        <p>No plants yet. <a @click="$router.push('/mydiary')">Add your first plant!</a></p>
      </div>
    </section>

    <!-- My Achievement Section -->
    <section class="section">
      <h3 class="section-title">My Achievement</h3>
      <div class="achievement-card">
        <img src="/basket.png" class="achievement-img" />
        <div class="achievement-info">
          <h4 class="harvest-count">{{ totalHarvests }}</h4>
          <p class="harvest-times">Harvest times</p>
        </div>
      </div>
    </section>

    <!-- Bottom Icon Navigation -->
    <div class="icon-nav">
      <div class="nav-item" @click="$router.push('/home')">
        <i class="bi bi-house-door-fill"></i>
      </div>
      <div class="nav-item" @click="$router.push('/tips')">
        <i class="bi bi-list-ul"></i>
      </div>
      <div class="nav-item" @click="$router.push('/mydiary')">
        <span class="emoji">🌱</span>
      </div>
      <div class="nav-item" @click="$router.push('/setting')">
        <i class="bi bi-gear-fill"></i>
      </div>
      <div class="nav-item active" @click="$router.push('/profile')">
        <i class="bi bi-person-fill"></i>
      </div>
    </div>
  </div>
</template>

<script>
import "../styles/Profile.css";
import { getAuth, onAuthStateChanged, updateProfile } from 'firebase/auth'
import { getFirestore, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import { getUserData, createUserIfNotExists, updateUserData } from '../scripts/userService.js'
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'

export default {
  name: "Profile",
  data() {
    return {
      user: {
        email: '',
        displayName: '',
        photoURL: '',
        uid: ''
      },
      userProfile: {
        join_date: null,
        name: '',
        user_type: '',
        is_admin: false,
        preferences: {}
      },
      userPlants: [],
      totalPhotos: 0,
      totalHarvests: 0,
      loading: true,
      editingName: false,
      tempName: '',
      uploadingImage: false,
    };
  },
  computed: {
    daysSinceFirstPlant() {
      if (!this.userPlants.length) return 0
      
      const oldestPlant = this.userPlants.reduce((oldest, plant) => {
        const plantDate = plant.created_at?.toDate() || new Date()
        const oldestDate = oldest.created_at?.toDate() || new Date()
        return plantDate < oldestDate ? plant : oldest
      })
      
      const firstPlantDate = oldestPlant.created_at?.toDate() || new Date()
      const daysDiff = Math.floor((new Date() - firstPlantDate) / (1000 * 60 * 60 * 24))
      return Math.max(daysDiff, 0)
    }
  },
  mounted() {
    this.initializeAuth()
  },
  methods: {
    initializeAuth() {
      const auth = getAuth()
      
      onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          this.user = {
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            uid: firebaseUser.uid
          }
          
          await this.loadUserProfile()
          await this.loadUserPlants()
          await this.loadUserStats()
        } else {
          this.$router.push('/login')
        }
        this.loading = false
      })
    },

    async loadUserProfile() {
      try {
        const userData = await getUserData()
        
        if (userData) {
          this.userProfile = userData
        } else {
          await createUserIfNotExists()
          const newUserData = await getUserData()
          this.userProfile = newUserData || {}
        }
      } catch (error) {
        console.error('Error loading user profile:', error)
      }
    },

    async loadUserPlants() {
      try {
        const db = getFirestore()
        const plantsQuery = query(
          collection(db, 'plants'),
          where('user_id', '==', this.user.uid)
        )
        
        const snapshot = await getDocs(plantsQuery)
        const plants = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

        // Load latest photo for each plant
        for (const plant of plants) {
          const uploadsRef = collection(db, 'plants', plant.id, 'uploads')
          const latestPhotoQuery = query(
            uploadsRef,
            orderBy('timestamp', 'desc'),
            limit(1)
          )
          
          const photoSnapshot = await getDocs(latestPhotoQuery)
          if (!photoSnapshot.empty) {
            const latestPhoto = photoSnapshot.docs[0].data()
            plant.latest_photo = latestPhoto.image_url // Use image_url from upload document
          }
        }
        
        this.userPlants = plants
      } catch (error) {
        console.error('Error loading user plants:', error)
      }
    },

    async loadUserStats() {
      try {
        const db = getFirestore()
        let photoCount = 0
        
        // Count all photos in uploads subcollection for each plant
        for (const plant of this.userPlants) {
          const uploadsQuery = query(collection(db, 'plants', plant.id, 'uploads'))
          const uploadsSnapshot = await getDocs(uploadsQuery)
          
          // Add only valid photo uploads to count
          uploadsSnapshot.docs.forEach(doc => {
            const data = doc.data()
            if (data.photo_url) {
              photoCount++
            }
          })
        }
        
        this.totalPhotos = photoCount
        
        // Get harvest count from diary entries
        let harvestCount = 0
        for (const plant of this.userPlants) {
          const entriesQuery = query(
            collection(db, 'plants', plant.id, 'diary_entries'),
            where('type', '==', 'harvest')
          )
          const entriesSnapshot = await getDocs(entriesQuery)
          harvestCount += entriesSnapshot.size
        }
        
        this.totalHarvests = harvestCount
      } catch (error) {
        console.error('Error loading user stats:', error)
      }
    },

    // Name editing methods
    startEditName() {
      this.tempName = this.userProfile.name || this.user.displayName || ''
      this.editingName = true
      
      // Focus input after Vue updates DOM
      this.$nextTick(() => {
        const input = this.$el.querySelector('.name-input')
        if (input) input.focus()
      })
    },

    async saveName() {
      if (!this.tempName.trim()) {
        alert('Name cannot be empty')
        return
      }

      try {
        await updateUserData({ name: this.tempName.trim() })
        this.userProfile.name = this.tempName.trim()
        this.editingName = false
        console.log('Name updated successfully')
      } catch (error) {
        console.error('Error updating name:', error)
        alert('Failed to update name. Please try again.')
      }
    },

    cancelEditName() {
      this.editingName = false
      this.tempName = ''
    },

    formatJoinDate(date) {
      if (!date) return ''
      const joinDate = date.toDate ? date.toDate() : new Date(date)
      return joinDate.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'long'
      })
    },

    formatPlantDate(date) {
      if (!date) return ''
      const plantDate = date.toDate ? date.toDate() : new Date(date)
      const daysDiff = Math.floor((new Date() - plantDate) / (1000 * 60 * 60 * 24))
      
      if (daysDiff === 0) return 'Today'
      if (daysDiff === 1) return 'Yesterday'
      if (daysDiff < 7) return `${daysDiff} days ago`
      if (daysDiff < 30) return `${Math.floor(daysDiff / 7)} weeks ago`
      return `${Math.floor(daysDiff / 30)} months ago`
    },

    viewPlant(plant) {
      this.$router.push({
        path: '/photolist',
        query: {
          plantId: plant.id,
          plantName: plant.name
        }
      })
    },

    async handleImageUpload(event) {
      const file = event.target.files?.[0]
      if (!file) return

      try {
        this.uploadingImage = true
        const storage = getStorage()
        const auth = getAuth()
        const currentUser = auth.currentUser
        
        if (!currentUser) {
          throw new Error('No authenticated user')
        }

        // Create a storage reference
        const timestamp = Date.now()
        const filename = `${timestamp}_${file.name}`
        const path = `users/${currentUser.uid}/profile/${filename}`
        const fileRef = storageRef(storage, path)

        // Upload file
        await uploadBytes(fileRef, file)
        const photoURL = await getDownloadURL(fileRef)

        // Update auth profile using imported updateProfile
        await updateProfile(currentUser, {
          photoURL: photoURL
        })

        // Update local state
        this.user.photoURL = photoURL
        await updateProfile(currentUser, { photo_url: photoURL});

        // Update user profile in Firestore
        await updateUserData({ photo_url: photoURL })

      } catch (error) {
        console.error('Error uploading image:', error)
        alert('Failed to upload image. Please try again.')
      } finally {
        this.uploadingImage = false
        if (event.target) event.target.value = ''
      }
    },
  }
};
</script>

<style scoped>
.profile-avatar-container {
  position: relative;
  display: inline-block;
}

.profile-avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid #fff;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.upload-photo-btn {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #2e7d32;
  color: white;
  border: 3px solid #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.upload-photo-btn:hover {
  transform: scale(1.1);
  background: #1b5e20;
}

.upload-photo-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}
.upload-photo-btn {
  cursor: pointer;
  transition: all 0.3s ease;
}

</style>
