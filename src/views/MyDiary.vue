<template>
  <div class="page-container">
    <div class="back-button" @click="goBack">
      <i class="bi bi-arrow-left"></i>
    </div>

    <div class="page-header">
      <h1 class="page-title">My Diary</h1>
    </div>

    <div class="page-content">
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
            style="height: 400px"
            :time="false"
            default-view="month"
            :events="calendarEvents"
            :disable-views="['week', 'day']"
            :today-button="false"
            :selected-date="selectedDate"
            @ready="onCalendarReady"
            @view-change="onViewChange"
          />
        </div>

        <!-- Plants -->
        <div v-for="plant in allPlants" :key="plant.id">
          <!-- note the stable id -->
          <div class="diary-entry" :id="'plant-' + plant.id">
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

              <div
                v-if="plant.mode === 'hardware' && plant.moisture !== null && plant.moisture !== undefined"
                class="moisture"
              >
                <i class="bi bi-droplet"></i>
                <span class="moisture-value">{{ plant.moisture }}%</span>
                <span class="moisture-label">Soil Moisture</span>
              </div>

              <div class="plant-actions">
                <button class="view-photos-btn" @click="viewPlantPhotos(plant)">
                  <i class="bi bi-eye-fill"></i>
                  View Photos
                </button>

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

                <!-- Water button -->
                <button
                  class="water-btn"
                  :class="{
                    'water-btn--done': plant.wateredToday,
                    'water-btn--saving': savingWaterId === plant.id,
                    'water-btn--blocked': !plant.hasPhoto && !plant.wateredToday
                  }"
                  :title="!plant.hasPhoto && !plant.wateredToday ? 'Add/scan a photo first' : ''"
                  @click="markAsWatered(plant)"
                  :disabled="plant.wateredToday || savingWaterId === plant.id"
                >
                  <i class="bi bi-droplet-fill"></i>
                  {{
                    savingWaterId === plant.id
                      ? 'Saving…'
                      : (plant.wateredToday ? 'Watered Today' : 'Mark as Watered')
                  }}
                </button>

                <button
                  v-if="plant.mode === 'hardware'"
                  class="moisture-btn"
                  @click="measurePlantSoilMoisture(plant)"
                >
                  <i class="bi bi-droplet"></i>
                  Soil Moisture
                </button>

               <router-link
                v-if="plant.mode === 'phone'"
                class="harvest-btn" 
                :to="{ name:'PhoneHarvest', query:{ plantId: plant.id, plantName: plant.name } }">
                  <i class="bi bi-scissors"></i>
                  I want to harvest now
                </router-link>
                <router-link
                v-else
                class="harvest-btn" 
                :to="{ name:'StrawberryRanking', query:{ plantId: plant.id, plantName: plant.name } }">
                  <i class="bi bi-scissors"></i>
                  I want to harvest now
                </router-link>
              </div>
            </div>

            <img src="/basket.png" alt="Basket" class="basket-icon" />
          </div>
        </div>

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
              <div class="mode-icon"><i class="bi bi-cpu"></i></div>
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
              <div class="mode-icon"><i class="bi bi-camera"></i></div>
              <div class="mode-content">
                <h3>Phone Reminders</h3>
                <p>Manual care tracking with reminders</p>
                <ul>
                  <li>Care reminders and notifications</li>
                  <li>Manual watering tracking</li>
                  <li>Simple growth monitoring</li>
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

import {
  getFirestore,
  Timestamp,
  collection,
  getDocs,
  deleteDoc,
  query,
  limit,
  doc,
  updateDoc,
  addDoc,
  getDoc,
  onSnapshot,
} from 'firebase/firestore'

import {
  addPlant,
  getPlants,
  deletePlantCascade,
  createPlantData,
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

      loading: false,
      plantsLoading: true,

      calendarEvents: [],
      selectedDate: new Date().toISOString().split('T')[0],
      calendarKey: 0,

      nextPlantNumber: 1,
      savingWaterId: null,

      _wateringTimer: null,
      _midnightTimer: null,

      // live mirror of Settings toggle
      notificationsEnabled: false,
      _userUnsub: null,
    }
  },
  computed: {
    allPlants() {
      // Extract the first number from a name like "Strawberry Plant 02" -> 2
      const numFromName = (s = '') => {
        const m = String(s).match(/\d+/)
        return m ? parseInt(m[0], 10) : Number.MAX_SAFE_INTEGER // names without a number go last
      }

      return this.plants
        .slice() // don't mutate original array
        .sort((a, b) => numFromName(a.name) - numFromName(b.name)) // ASC: 1,2,3...
        .map(plant => {
          const ts = plant.lastWateredAt || plant.last_watered
          return {
            ...plant,
            wateredToday: this.isWateredToday(ts),
            hasPhoto: !!(plant.photo_count > 0 || plant.last_photo_url || plant.latestPhotoPath || plant.firstPhotoAt)
          }
        })
    },
  },

  mounted() {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        await this.loadPlants()

        // jump to plant if linked from Home
        const pid = this.$route.query.plantId
        if (pid) this.scrollToPlant(pid)

        this.startWateringCheck()
        this._scheduleMidnightTick()

        // Subscribe to user doc to respect Settings toggle
        const db = getFirestore()
        this._userUnsub?.()
        this._userUnsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
          const enabled = !!snap.data()?.notifications
          this.notificationsEnabled = enabled

          if (!enabled && this._wateringTimer) {
            clearInterval(this._wateringTimer)
            this._wateringTimer = null
          }
          if (enabled && !this._wateringTimer) {
            this.startWateringCheck()
            this.checkWateringSchedule({ force: true })
          }
        })
      } else {
        console.warn('No user logged in, skipping plant load.')
      }
    })
  },

  watch: {
    '$route.query.plantId'(pid) {
      if (pid) this.scrollToPlant(pid)
    }
  },

  beforeUnmount() {
    if (this._wateringTimer) clearInterval(this._wateringTimer)
    if (this._midnightTimer) clearTimeout(this._midnightTimer)
    if (this._userUnsub) { this._userUnsub(); this._userUnsub = null }
  },

  methods: {
    /* ------------ Time helpers ------------ */
    ymdInTZ(date, tz = 'Asia/Bangkok') {
      const validDate = date instanceof Date ? date : new Date(date)
      if (isNaN(validDate.getTime())) {
        console.warn('Invalid date passed to ymdInTZ:', date)
        return null
      }
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit'
      }).format(validDate)
    },

    isWateredToday(ts, tz = 'Asia/Bangkok') {
      if (!ts) return false
      try {
        let date
        if (ts instanceof Date) date = ts
        else if (ts?.toDate && typeof ts.toDate === 'function') date = ts.toDate()
        else if (typeof ts === 'string' || typeof ts === 'number') date = new Date(ts)
        else return false

        const todayStr = this.ymdInTZ(new Date(), tz)
        const waterDateStr = this.ymdInTZ(date, tz)
        return todayStr === waterDateStr
      } catch (error) {
        console.error('Error in isWateredToday:', error)
        return false
      }
    },

    _scheduleMidnightTick() {
      const tz = 'Asia/Bangkok'
      const nowTZ = new Date(new Date().toLocaleString('en-US', { timeZone: tz }))
      const nextMidnight = new Date(nowTZ)
      nextMidnight.setDate(nowTZ.getDate() + 1)
      nextMidnight.setHours(0, 0, 0, 0)
      const ms = Math.max(1000, nextMidnight - nowTZ)
      this._midnightTimer = setTimeout(() => {
        this.calendarKey = Date.now()
        this.$forceUpdate()
        this._scheduleMidnightTick()
      }, ms)
    },

    /* ----------------------------- Data loading ---------------------------- */
    async loadPlants() {
      try {
        this.plantsLoading = true
        const plantsFromFirebase = await getPlants()
        this.plants = plantsFromFirebase

        let max = 0
        for (const p of this.plants) {
          const m = (p.name || '').match(/Strawberry Plant (\d+)/)
          if (m) max = Math.max(max, parseInt(m[1], 10) || 0)
        }
        this.nextPlantNumber = max + 1
      } catch (error) {
        console.error('loadPlants() error:', error)
        alert('Failed to load plants. Please refresh the page.')
      } finally {
        this.plantsLoading = false
      }
    },

    /* ----------------------------- Add/remove ------------------------------ */
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
    selectMode(mode) { this.selectedMode = mode },

    async confirmAddPlant() {
      if (!this.selectedMode) return
      try {
        this.loading = true
        const finalName = this.newPlantName.trim()
          || `Strawberry Plant ${String(this.nextPlantNumber).padStart(2, '0')}`

        const plantData = createPlantData(finalName, this.selectedMode)
        const plantId = await addPlant(plantData)

        await addDiaryEntry(plantId, {
          title: 'Plant created',
          note: `Mode: ${this.selectedMode}`
        }).catch(e => console.error('Diary entry error:', e))

        await this.loadPlants()
        this.closeChooseMode()
      } catch (error) {
        console.error('Failed to add plant:', error)
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
        await this.deleteWateringHistory(plantId)
        await deletePlantCascade(plantId)
        await this.loadPlants()
        console.log(`Completely removed plant and all data: ${plant.name}`)
      } catch (error) {
        console.error('Failed to remove plant:', error)
        alert('Failed to remove plant. Please try again.')
      }
    },

    async deleteWateringHistory(plantId) {
      try {
        const db = getFirestore()
        const wateringRef = collection(db, 'plants', plantId, 'watering_history')
        const snapshot = await getDocs(wateringRef)
        const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref))
        await Promise.all(deletePromises)
      } catch (error) {
        console.error('Failed to delete watering history:', error)
      }
    },

    /* ------------------------------ UI helpers ----------------------------- */
    viewPlantPhotos(plant) {
      this.$router.push({
        path: '/photolist',
        query: { plantId: plant.id, plantName: plant.name, mode: plant.mode || 'phone' }
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

    onCalendarReady() {},
    onViewChange() {},
    harvestPlant(plant) { alert(`Harvest feature coming soon!\n\nPlant: ${plant.name}`) },
    measurePlantSoilMoisture(plant) { alert(`Moisture measurement coming soon!\n\nPlant: ${plant.name}\nMode: ${plant.mode}`) },

    /* ---------------------------- Photo check ----------------------------- */
    async ensurePlantHasPhoto(plant) {
      if (plant.hasPhoto) return true
      const db = getFirestore()
      const qy = query(collection(db, 'plants', plant.id, 'uploads'), limit(1))
      const snap = await getDocs(qy)
      const ok = !snap.empty
      if (ok) {
        const idx = this.plants.findIndex(p => p.id === plant.id)
        if (idx !== -1) {
          const current = this.plants[idx]
          const photo_count = Math.max((current.photo_count || 0), 1)
          this.plants.splice(idx, 1, { ...current, photo_count })
        }
      }
      return ok
    },

    /* --------------------- Mark as Watered --------------------- */
    async markAsWatered(plant) {
      if (this.savingWaterId === plant.id || plant.wateredToday) return

      const ok = await this.ensurePlantHasPhoto(plant)
      if (!ok) {
        alert('Please add or scan a photo of this plant before marking as watered.')
        return
      }

      try {
        this.savingWaterId = plant.id
        const now = new Date()
        const db = getFirestore()

        await updateDoc(doc(db, 'plants', plant.id), {
          lastWateredAt: Timestamp.fromDate(now),
          last_watered: Timestamp.fromDate(now),
          last_watering_type: 'manual'
        })

        try {
          const wateringRef = collection(db, 'plants', plant.id, 'watering_history')
          await addDoc(wateringRef, {
            timestamp: Timestamp.fromDate(now),
            type: 'manual',
            user_id: auth.currentUser?.uid || null,
            schedule: {
              next_watering: new Date(now.getTime() + 24 * 60 * 60 * 1000),
              frequency: 'daily'
            }
          })
        } catch (historyError) {
          console.warn('Failed to create watering history:', historyError)
        }

        await this.loadPlants()

        if (this._wateringTimer) {
          clearInterval(this._wateringTimer)
          setTimeout(() => this.startWateringCheck(), 1000)
        }
      } catch (error) {
        console.error('Failed to mark plant as watered:', error)
        alert('Failed to record watering. Please try again.')
        await this.loadPlants()
      } finally {
        this.savingWaterId = null
      }
    },

    /* ---------------- Watering notification system ------------------- */
    async startWateringCheck() {
      await this.checkWateringSchedule({ force: false })
      if (this._wateringTimer) clearInterval(this._wateringTimer)
      this._wateringTimer = setInterval(() => this.checkWateringSchedule({ force: false }), 3600000) // hourly
    },

    async checkWateringSchedule(opts = {}) {
      try {
        if (!this.notificationsEnabled) return
        const force = opts.force === true

        const now = new Date()
        if (!force && now.getHours() < 20) return // Only after 8 PM unless forced

        if (Notification.permission !== 'granted') {
          const perm = await Notification.requestPermission()
          if (perm !== 'granted') return
        }

        const regs = await navigator.serviceWorker.getRegistrations()
        const rootReg = regs.find(r => r.scope.endsWith('/'))
        if (!rootReg) return

        const tz = 'Asia/Bangkok'
        const notWatered = this.allPlants.filter(plant => {
          return !this.isWateredToday(plant.lastWateredAt || plant.last_watered, tz)
        })

        if (notWatered.length === 0) {
          if (force) {
            await rootReg.showNotification('All watered ✅', {
              body: 'No reminders needed today.',
              data: { ts: Date.now() },
            })
          }
          return
        }

        const first = notWatered[0]?.name || 'your plant'
        const extra = notWatered.length > 1 ? ` and ${notWatered.length - 1} more` : ''

        await rootReg.showNotification('Don\'t forget to water 🌱', {
          body: `${first}${extra} haven't been watered today`,
          data: { ts: Date.now() },
        })
      } catch (e) {
        console.warn('checkWateringSchedule error:', e)
      }
    },

    /* ------------------------------- Misc -------------------------------- */
    goBack() { this.$router.push('/home') },

    async refreshPlantPhotoCount(plantId) {
      const db = getFirestore()
      const uploadsRef = collection(db, 'plants', plantId, 'uploads')
      const snap = await getDocs(uploadsRef)
      const count = snap.size
      const idx = this.plants.findIndex(p => p.id === plantId)
      if (idx !== -1) this.plants[idx].photo_count = count
    },

    // Jump & highlight a plant when coming from Home
    scrollToPlant(plantId) {
      this.$nextTick(() => {
        const el = document.getElementById(`plant-${plantId}`)
        if (!el) return
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        el.classList.add('highlight-plant')
        setTimeout(() => el.classList.remove('highlight-plant'), 2000)
      })
    },

    // Debug helper
    async debugPlantData(plantName = null) {
      const plant = plantName ? this.plants.find(p => p.name === plantName) : this.plants[0]
      if (!plant) return console.log('No plant found')

      console.log('Plant debug data:', {
        name: plant.name,
        lastWateredAt: plant.lastWateredAt,
        last_watered: plant.last_watered,
        wateredToday: this.isWateredToday(plant.lastWateredAt || plant.last_watered),
        today: this.ymdInTZ(new Date())
      })

      const db = getFirestore()
      const snap = await getDoc(doc(db, 'plants', plant.id))
      if (snap.exists()) {
        const data = snap.data()
        console.log('Firebase data:', {
          lastWateredAt: data.lastWateredAt,
          last_watered: data.last_watered
        })
      }
    }
  }
}
</script>

<style scoped>
/* keep your existing MyDiary styles */

/* subtle highlight when navigated from Home */
.highlight-plant {
  outline: 3px solid #a7f3d0;
  border-radius: 16px;
  transition: outline 0.3s ease-in-out;
}
</style>
