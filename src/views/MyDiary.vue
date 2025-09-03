<template>
  <div class="page-container">
    <!-- Back Button -->
    <div class="back-button" @click="goBack">
      <i class="bi bi-arrow-left"></i>
    </div>

    <!-- Page Header -->
    <div class="page-header">
      <h1 class="page-title">My Diary</h1>
    </div>

    <!-- Page Content -->
    <div class="page-content">
      <!-- Loading State -->
      <div v-if="plantsLoading" class="loading-container">
        <p>Loading plants...</p>
      </div>

      <div v-else>
        <!-- Calendar -->
        <div class="calendar-card">
          <div class="calendar-header">
            <button class="today-btn" @click="goToToday">Today</button>
          </div>
          <vue-cal
            ref="vuecal"
            :key="calendarKey"
            style="height: 400px;"
            :time="false"
            default-view="month"
            :events="calendarEvents"
            :disable-views="['week','day']"
            :today-button="false"
            :selected-date="selectedDate"
            @ready="onCalendarReady"
            @view-change="onViewChange"
          />
        </div>

        <!-- Plant Entries -->
        <div v-for="plant in allPlants" :key="plant.id">
          <div class="diary-entry">
            <div class="entry-content">
              <div class="plant-header">
                <h2>{{ plant.name }}</h2>
                <button
                  v-if="!plant.isDefault"
                  class="remove-plant-btn"
                  @click="removePlant(plant.id)"
                  title="Remove Plant"
                >
                  <i class="bi bi-x-lg"></i>
                </button>
              </div>

              <!-- Read-only mode badge -->
              <div class="mode-badge" :class="plant.mode">
                <i :class="plant.trackingIcon || 'bi bi-camera'"></i>
                {{ plant.mode === 'hardware' ? 'Hardware Device' : 'Phone Camera' }}
              </div>

              <p class="tracking-description">
                <i :class="plant.trackingIcon || 'bi bi-camera'"></i>
                {{ plant.trackingDescription || 'Tracking: Phone Camera - Manual photo scanning' }}
              </p>
              <p>{{ plant.status || 'Not yet scanned' }}</p>
              <p class="status-alert">{{ plant.statusAlert || 'Scan to check status' }}</p>

             <!-- Only show soil moisture for hardware plants -->
              <div
                v-if="plant.mode === 'hardware' && plant.moisture !== null && plant.moisture !== undefined"
                class="moisture"
              >
                <i class="bi bi-droplet"></i>
                <span class="moisture-value">{{ plant.moisture }}%</span>
                <span class="moisture-label">Soil Moisture</span>
              </div>
              <!-- Action Buttons -->
              <div class="plant-actions">
                <!-- View Photos Button -->
                <button class="view-photos-btn" @click="viewPlantPhotos(plant)">
                  <i class="bi bi-eye-fill"></i>
                  View Photos
                </button>
              </div>

              <!-- Action Buttons (placeholder) -->
              <div class="plant-actions">
                <router-link
                  v-if="plant.mode === 'hardware'"
                  class="scan-btn"
                  :to="{ name:'HardwareAnalysis', query:{ plantId: plant.id, plantName: plant.name } }">
                  <i class="bi bi-qr-code-scan"></i> Scan Now
                </router-link>
                <router-link
                  v-else
                  class="scan-btn"
                  :to="{ name:'PlantScan', query:{ plantId: plant.id, plantName: plant.name } }">
                  <i class="bi bi-qr-code-scan"></i> Scan Now
                </router-link>
               <button
                  v-if="plant.mode === 'hardware'"
                  class="moisture-btn"
                  @click="measurePlantSoilMoisture(plant)"
                >
                  <i class="bi bi-droplet"></i>
                  Soil Moisture
                </button>
                <button class="harvest-btn" @click="harvestPlant(plant)">
                  <i class="bi bi-scissors"></i>
                  I want to harvest now
                </button>
              </div>
            </div>

            <img src="/basket.png" alt="Basket" class="basket-icon" />

            <div class="dropdown-icon" @click="toggleExpandPlant(plant.id)">
              <i :class="plant.expanded ? 'bi bi-chevron-up' : 'bi bi-chevron-down'"></i>
            </div>
          </div>

          <!-- Expanded Image for This Plant -->
          <transition name="fade">
            <div v-if="plant.expanded" class="plant-photo-container">
              <img src="/strawberry_pot.png" alt="Strawberry plant" class="plant-photo" />
            </div>
          </transition>
        </div>

        <!-- Add Another Plant Button -->
        <div class="add-plant-card">
          <button class="add-plant-btn" @click="showAddPlantDialog" :disabled="loading">
            <i class="bi bi-plus-lg"></i>
            {{ loading ? 'Adding...' : 'Add Another Plant' }}
          </button>
        </div>
      </div>

      <!-- Choose Mode Modal -->
      <div v-if="showChooseMode" class="modal-overlay" @click="closeChooseMode">
        <div class="choose-mode-modal" @click.stop>
          <h2>Choose Tracking Mode</h2>
          <p>Select how you want to track your new strawberry plant</p>

          <div class="mode-options">
            <div
              class="mode-option"
              :class="{ selected: selectedMode === 'hardware' }"
              @click="selectMode('hardware')"
            >
              <div class="mode-icon">
                <i class="bi bi-cpu"></i>
              </div>
              <div class="mode-content">
                <h3>Hardware Device</h3>
                <p>Real-time monitoring with specialized sensors</p>
                <ul>
                  <li>Automatic soil moisture tracking</li>
                  <li>24/7 environmental monitoring</li>
                  <li>Instant alerts and notifications</li>
                </ul>
              </div>
            </div>

            <div
              class="mode-option"
              :class="{ selected: selectedMode === 'phone' }"
              @click="selectMode('phone')"
            >
              <div class="mode-icon">
                <i class="bi bi-camera"></i>
              </div>
              <div class="mode-content">
                <h3>Phone Camera</h3>
                <p>Manual photo scanning and analysis</p>
                <ul>
                  <li>Take photos when convenient</li>
                  <li>AI-powered strawberry detection</li>
                  <li>Manual growth tracking</li>
                </ul>
              </div>
            </div>
          </div>

          <div v-if="selectedMode" class="plant-name-section">
            <h3>Name Your Plant</h3>
            <input
              v-model="newPlantName"
              placeholder="Enter plant name or leave empty for auto-naming"
              class="plant-name-input"
              @keyup.enter="confirmAddPlant"
            />
          </div>

          <div class="modal-actions">
            <button class="btn-cancel" @click="closeChooseMode">Cancel</button>
            <button class="btn-confirm" @click="confirmAddPlant" :disabled="!selectedMode || loading">
              {{ loading ? 'Adding...' : 'Add Plant' }}
            </button>
          </div>

          <!-- FIX: badge uses selectedMode (not `plant`) -->
          <div v-if="selectedMode" class="mode-badge" :class="selectedMode" title="Tracking mode is fixed">
            <i :class="selectedMode === 'hardware' ? 'bi bi-cpu' : 'bi bi-camera'"></i>
            {{ selectedMode === 'hardware' ? 'Hardware Device' : 'Phone Camera' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import VueCal from 'vue-cal'
import 'vue-cal/dist/vuecal.css'
import '../styles/MyDiary.css'

import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'

// ✅ Use ONE service import (adjust path if yours differs)
import {
  addPlant,
  getPlants,
  updatePlant,
  deletePlant,
  deletePlantCascade,
  getNextPlantNumber,
  createPlantData,
  getPlantById,
} from '../scripts/plantService.js'
import { addDiaryEntry } from '../scripts/diaryService.js'

export default {
  name: 'MyDiary',
  components: { VueCal },
  data() {
    return {
      plants: [],
      showChooseMode: false,
      selectedMode: null,
      newPlantName: '',

      // Loading states
      loading: false,
      plantsLoading: true,

      // Calendar
      calendarEvents: [],
      selectedDate: new Date().toISOString().split('T')[0],
      calendarKey: 0,

      // for auto-naming fallback
      nextPlantNumber: 1
    }
  },
  computed: {
    allPlants() {
      return this.plants
    }
  },
  mounted() {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log('✅ Auth user detected:', user.uid)
        await this.loadPlants()
      } else {
        console.warn('⚠️ No user logged in, skipping plant load.')
      }
    })
  },
  methods: {
    async loadPlants() {
      try {
        console.log('🔄 loadPlants() started...')
        this.plantsLoading = true

        console.log('📡 Calling getPlants()...')
        const plantsFromFirebase = await getPlants()
        console.log('📊 Plants from Firebase:', plantsFromFirebase)

        this.plants = plantsFromFirebase

        // Compute nextPlantNumber
        let max = 0
        for (const p of this.plants) {
          const m = (p.name || '').match(/Strawberry Plant (\d+)/)
          if (m) max = Math.max(max, parseInt(m[1], 10) || 0)
        }
        this.nextPlantNumber = max + 1
      } catch (error) {
        console.error('❌ loadPlants() error:', error)
        alert('Failed to load plants. Please refresh the page.')
      } finally {
        this.plantsLoading = false
      }
    },
    showAddPlantDialog() {
      this.showChooseMode = true
      this.selectedMode = null
      this.newPlantName = ''
    },
    closeChooseMode() {
      this.showChooseMode = false
      this.selectedMode = null
      this.newPlantName = ''
    },
    selectMode(mode) {
      this.selectedMode = mode
    },
    async confirmAddPlant() {
      if (!this.selectedMode) return
      try {
        this.loading = true

        const finalName = this.newPlantName.trim() ||
          `Strawberry Plant ${String(this.nextPlantNumber).padStart(2, '0')}`

        const plantData = createPlantData(finalName, this.selectedMode)
        const plantId = await addPlant(plantData)

        await addDiaryEntry(plantId, {
          title: 'Plant created',
          note: `Mode: ${this.selectedMode}`
        }).catch(e => console.error('Diary entry error:', e))

        await this.loadPlants()
        this.closeChooseMode()
      } catch (error) {
        console.error('❌ Failed to add plant:', error)
        alert(`Failed to add plant: ${error.message}`)
      } finally {
        this.loading = false
      }
    },
    async removePlant(plantId) {
      const plant = this.plants.find(p => p.id === plantId)
      if (!plant) return
      
      if (!confirm(`Are you sure you want to remove "${plant.name}"? This will delete all associated data including diary entries and uploads.`)) return
      
      try {
        // ✅ Use cascade delete instead of regular delete
        await deletePlantCascade(plantId) // Changed from deletePlant to deletePlantCascade
        await this.loadPlants()
        console.log(`✅ Completely removed plant and all data: ${plant.name}`)
      } catch (error) {
        console.error('❌ Failed to remove plant:', error)
        alert('Failed to remove plant. Please try again.')
      }
    },
    async toggleExpandPlant(plantId) {
      try {
        const plant = this.plants.find(p => p.id === plantId)
        if (plant) {
          const newExpanded = !plant.expanded
          await updatePlant(plantId, { expanded: newExpanded })
          plant.expanded = newExpanded // optimistic UI
        }
      } catch (error) {
        console.error('Failed to toggle plant expansion:', error)
      }
    },
        viewPlantPhotos(plant) {
      this.$router.push({
        path: '/photolist',
        query: {
          plantId: plant.id,
          plantName: plant.name,
          mode: plant.mode || 'phone'
        }
      })
    },

    goToToday() {
      const today = new Date()
      const todayString = today.toISOString().split('T')[0]
      this.selectedDate = todayString

      this.$nextTick(() => {
        const vuecal = this.$refs.vuecal
        try {
          if (vuecal?.switchToToday) return vuecal.switchToToday()
          if (vuecal?.goToDate) return vuecal.goToDate(today)
          if (vuecal?.switchView) return vuecal.switchView('month', today)
          if (vuecal?.updateSelectedDate) return vuecal.updateSelectedDate(today)
          if (vuecal?.$forceUpdate) vuecal.$forceUpdate()
        } catch (e) {
          console.error('Error with VueCal navigation:', e)
        }
        this.calendarKey = Date.now()
      })
    },
    onCalendarReady() {
      console.log('Calendar is ready')
    },
    onViewChange(view) {
      console.log('Calendar view changed:', view)
    },
    harvestPlant(plant) {
      alert(`Harvest feature coming soon!\n\nPlant: ${plant.name}`)
    },
    measurePlantSoilMoisture(plant) {
      alert(`Moisture measurement coming soon!\n\nPlant: ${plant.name}\nMode: ${plant.mode}`)
    },
    goBack() {
      this.$router.push('/home')
    }
  }
}
</script>