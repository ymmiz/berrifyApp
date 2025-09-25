<template>
  <div class="page-container">
    <!-- Back -->
    <div class="back-button" @click="goBack">
      <i class="bi bi-arrow-left"></i>
    </div>

    <!-- Header -->
    <div class="page-header">
      <h1 class="page-title">Harvest {{ plantName }}</h1>
      <p class="page-subtitle">Based on the latest Raspberry Pi photo</p>
    </div>

    <!-- Content -->
    <div class="page-content">
      <!-- Banner: detection summary (no image) -->
      <div class="harvest-card">
        <div v-if="analysisLoading" class="detection-results">
          <div class="detection-icon"><i class="bi bi-cpu"></i></div>
          <h3>Checking your latest Raspberry Pi photo…</h3>
          <p class="detection-subtitle">Please wait a moment.</p>
        </div>

        <div v-else-if="totalDetectedStrawberries > 0" class="detection-results">
          <div class="detection-icon"><i class="bi bi-cpu"></i></div>
          <h3>{{ totalDetectedStrawberries }} strawberry{{ totalDetectedStrawberries === 1 ? '' : 'ies' }} detected</h3>
          <p class="detection-subtitle">Found in your latest Raspberry Pi photo</p>
        </div>

        <div v-else class="detection-results">
          <div class="detection-icon"><i class="bi bi-cpu"></i></div>
          <h3>No strawberries detected yet</h3>
          <p class="detection-subtitle">Wait for the Pi analysis to finish, then record your harvest.</p>
        </div>
      </div>

      <!-- Number chooser -->
      <div class="harvest-card">
        <h2>How many strawberries did you harvest?</h2>
        <p class="harvest-description">
          Choose how many strawberries you want to harvest
          <span v-if="totalDetectedStrawberries > 0">
            from the {{ totalDetectedStrawberries }} detected in {{ plantName }}
          </span>
        </p>

        <div class="number-input-section">
          <div class="number-input-container">
            <button class="decrease-btn" @click="decreaseCount" :disabled="harvestCount <= 0">−</button>

            <input
              type="number"
              v-model.number="harvestCount"
              min="0"
              :max="Math.max(100, totalDetectedStrawberries)"
              class="harvest-input"
              @input="validateInput"
            />

            <button class="increase-btn" @click="increaseCount">+</button>
          </div>
          <div class="input-label"><span>Strawberries</span></div>
        </div>

        <!-- Quick select -->
        <div class="quick-select">
          <h3>Quick Select</h3>
          <div class="quick-buttons">
            <button
              v-for="count in availableQuickCounts"
              :key="count"
              class="quick-btn"
              :class="{ active: harvestCount === count }"
              @click="setCount(count)"
            >
              {{ count }}
            </button>

            <button
              v-if="totalDetectedStrawberries > 0"
              class="quick-btn all-btn"
              :class="{ active: harvestCount === totalDetectedStrawberries }"
              @click="setCount(totalDetectedStrawberries)"
            >
              All {{ totalDetectedStrawberries }}
            </button>
          </div>
        </div>

        <!-- Actions -->
        <div class="action-buttons">
          <button class="btn-secondary" @click="goBack">Cancel</button>
          <button
            class="btn-primary"
            @click="saveHarvest"
            :disabled="harvestCount < 0 || (totalDetectedStrawberries > 0 && harvestCount > totalDetectedStrawberries)"
          >
            Save Harvest
          </button>
        </div>
      </div>

      <!-- Empty state when nothing detected and input=0 -->
      <div v-if="!analysisLoading && totalDetectedStrawberries === 0" class="empty-state">
        <p>No hardware detections yet for this plant. The Pi will upload and analyze automatically.</p>
        <div class="action-buttons">
          <button class="btn-secondary" @click="goBack">Back</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {
  getFirestore, collection, query, where, orderBy, limit, getDocs,
  addDoc, serverTimestamp, doc
} from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

export default {
  name: 'HardwareHarvest',
  data() {
    return {
      plantName: this.$route?.query?.plantName || 'Plant',
      plantId: this.$route?.query?.plantId || null,

      analysisLoading: true,
      totalDetectedStrawberries: 0,

      harvestCount: 0,
      quickCounts: [1, 2, 3, 5, 10],
    }
  },
  computed: {
    availableQuickCounts() {
      if (!this.totalDetectedStrawberries) return this.quickCounts
      return this.quickCounts.filter(n => n <= this.totalDetectedStrawberries)
    }
  },
  mounted() {
    if (!this.plantId) {
      alert('Missing plantId. Open this page from a plant card.')
      this.$router.push('/mydiary')
      return
    }
    this.loadLatestHardwareDetection()
  },
  methods: {
    async loadLatestHardwareDetection() {
      this.analysisLoading = true
      try {
        const db = getFirestore()
        const uploadsRef = collection(db, 'plants', String(this.plantId), 'uploads')

        // newest "hardware" upload (analysis may be pending/complete)
        const qy = query(
          uploadsRef,
          where('mode', '==', 'hardware'),
          orderBy('timestamp', 'desc'),
          limit(1)
        )
        const snap = await getDocs(qy)
        if (snap.empty) {
          this.totalDetectedStrawberries = 0
          return
        }
        const data = snap.docs[0].data() || {}
        this.totalDetectedStrawberries = this.countFromAnalysisData(data)

        // default harvestCount to the detected count (you can remove this line if undesired)
        this.harvestCount = Math.min(this.totalDetectedStrawberries || 0, 100)
      } catch (e) {
        console.error('loadLatestHardwareDetection failed:', e)
        this.totalDetectedStrawberries = 0
      } finally {
        this.analysisLoading = false
      }
    },

    // Be tolerant of different shapes: detected_count, analysis.total_strawberries,
    // arrays (boxes/detections), or ripeness_data object shape.
    countFromAnalysisData(upload) {
      const a = upload.analysis || {}

      if (typeof upload.detected_count === 'number') return upload.detected_count
      if (typeof upload.total_strawberries === 'number') return upload.total_strawberries
      if (typeof a.total_strawberries === 'number') return a.total_strawberries
      if (Array.isArray(a.boxes)) return a.boxes.length
      if (Array.isArray(a.detections)) return a.detections.length
      if (a.ripeness_data && typeof a.ripeness_data === 'object') {
        return Object.keys(a.ripeness_data).length
      }
      return 0
    },

    // input helpers
    increaseCount() {
      const max = Math.max(100, this.totalDetectedStrawberries || 0)
      if (this.harvestCount < max) this.harvestCount++
    },
    decreaseCount() {
      if (this.harvestCount > 0) this.harvestCount--
    },
    setCount(n) {
      this.harvestCount = n
    },
    validateInput() {
      if (this.harvestCount < 0) this.harvestCount = 0
      const hardMax = Math.max(100, this.totalDetectedStrawberries || 0)
      if (this.harvestCount > hardMax) this.harvestCount = hardMax
      if (this.totalDetectedStrawberries && this.harvestCount > this.totalDetectedStrawberries) {
        this.harvestCount = this.totalDetectedStrawberries
      }
    },

    async saveHarvest() {
      if (!this.plantId) return
      const auth = getAuth()
      const user = auth.currentUser || {}

      try {
        const db = getFirestore()
        await addDoc(collection(db, 'plants', String(this.plantId), 'harvests'), {
          count: this.harvestCount,
          date: serverTimestamp(),
          plantName: this.plantName,
          plantId: String(this.plantId),
          user_id: user.uid || null,
          detection_source: 'hardware',
          detected_total_at_save: this.totalDetectedStrawberries
        })

        // optional: also write a light status to the root plant document
        await addDoc(collection(db, 'plants', String(this.plantId), 'events'), {
          type: 'harvest_saved',
          count: this.harvestCount,
          created_at: serverTimestamp()
        })

        this.$router.push({
          path: '/analysis',
          query: {
            plantId: this.plantId,
            plantName: this.plantName,
            harvestCount: this.harvestCount,
          },
        })
      } catch (err) {
        console.error('Failed to save harvest:', err)
        alert('Failed to save harvest.')
      }
    },

    goBack() {
      this.$router.push('/mydiary')
    },
  }
}
</script>

<style scoped>
/* Reuse your existing look & feel */
.page-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #8ab58a 0%, #a8d4a8 100%);
  display: flex; flex-direction: column; position: relative; overflow-x: hidden;
}
.back-button {
  position: absolute; top: 20px; left: 20px; width: 45px; height: 45px;
  background: rgba(255,255,255,.9); border-radius: 12px; display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all .3s ease; box-shadow: 0 4px 15px rgba(0,0,0,.1); z-index: 10;
}
.back-button:hover { background: #fff; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,.15); }
.back-button i { color:#070808; font-size:22px; font-weight: bold; }

.page-header { padding: 80px 20px 30px; text-align: center; }
.page-title { font-size: 28px; font-weight: 700; color:#2c3e50; margin: 0 0 10px 0; }
.page-subtitle { font-size: 16px; color:#7f8c8d; margin: 0; }

.page-content { flex: 1; padding: 20px; max-width: 520px; width: 100%; margin: 0 auto; }

.harvest-card {
  background: rgba(255,255,255,.95); border-radius: 25px; padding: 30px 24px; text-align: center;
  box-shadow: 0 15px 35px rgba(0,0,0,.1); border: 1px solid rgba(255,255,255,.3); margin-bottom: 24px;
}
.harvest-card h2 { font-size: 24px; font-weight: 600; color:#2c3e50; margin: 0 0 10px 0; }

/* Banner */
.detection-results {
  background: linear-gradient(135deg, #e8f5e8 0%, #d4edd4 100%);
  border-radius: 20px; padding: 24px; margin-bottom: 10px; border: 2px solid #a8d4a8; text-align: center;
}
.detection-icon {
  width: 60px; height: 60px; background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
  border-radius: 50%; display:flex; align-items:center; justify-content:center; margin: 0 auto 12px;
  box-shadow: 0 8px 25px rgba(39,174,96,.3);
}
.detection-icon i { font-size: 24px; color: #fff; }
.detection-results h3 { font-size: 22px; font-weight: 700; color:#27ae60; margin: 0 0 6px 0; }
.detection-subtitle { font-size: 14px; color:#7f8c8d; margin: 0; font-style: italic; }

.harvest-description { font-size: 16px; color:#7f8c8d; margin: 0 0 22px 0; }

/* Number input */
.number-input-section { margin-bottom: 24px; }
.number-input-container { display:flex; align-items:center; justify-content:center; gap: 14px; margin-bottom: 10px; }
.decrease-btn, .increase-btn {
  width: 50px; height: 50px; border: none; border-radius: 15px;
  background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
  color:#fff; font-size: 22px; cursor: pointer; transition: all .3s ease; display:flex; align-items:center; justify-content:center;
}
.decrease-btn:hover, .increase-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(74,144,226,.3); }
.decrease-btn:disabled { background: linear-gradient(135deg, #bdc3c7 0%, #95a5a6 100%); cursor:not-allowed; transform:none; box-shadow:none; }
.harvest-input {
  width: 120px; height: 60px; border: 3px solid #e8f4f8; border-radius: 20px; font-size: 28px; font-weight: 700; text-align:center; color:#2c3e50; background:#fff;
}
.input-label { margin-top: 6px; color:#7f8c8d; font-size: 13px; }

/* Quick select */
.quick-select { margin-top: 10px; }
.quick-select h3 { font-size: 18px; font-weight: 600; color:#2c3e50; margin: 0 0 14px 0; }
.quick-buttons { display:flex; gap:10px; justify-content:center; flex-wrap: wrap; }
.quick-btn {
  min-width: 50px; height: 44px; border: 2px solid #e8f4f8; border-radius: 14px; background:#fff; color:#2c3e50; font-size: 16px; font-weight: 600; cursor:pointer; transition: all .3s ease;
}
.quick-btn:hover { border-color:#4a90e2; color:#4a90e2; transform: translateY(-2px); }
.quick-btn.active { background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%); border-color:#4a90e2; color:#fff; transform: translateY(-2px); box-shadow: 0 8px 25px rgba(74,144,226,.3); }
.quick-btn.all-btn { background: linear-gradient(135deg, #27ae60 0%, #229954 100%); border-color:#27ae60; color:#fff; font-weight: 700; min-width: 70px; }
.quick-btn.all-btn:hover { border-color:#27ae60; transform: translateY(-2px); box-shadow: 0 8px 25px rgba(39,174,96,.3); }
.quick-btn.all-btn.active { background: linear-gradient(135deg, #229954 0%, #1e8449 100%); }

/* Buttons */
.action-buttons { display:flex; gap: 12px; padding: 8px 0 0; }
.btn-secondary, .btn-primary {
  flex: 1; padding: 14px 18px; border: none; border-radius: 15px; font-size: 16px; font-weight: 600; cursor:pointer; transition: all .3s ease; display:flex; align-items:center; justify-content:center; gap:10px;
}
.btn-secondary { background: linear-gradient(135deg, #bdc3c7 0%, #95a5a6 100%); color:#fff; }
.btn-secondary:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(149,165,166,.3); }
.btn-primary { background: linear-gradient(135deg, #27ae60 0%, #229954 100%); color:#fff; }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(39,174,96,.3); }
.btn-primary:disabled { background: linear-gradient(135deg, #bdc3c7 0%, #95a5a6 100%); cursor:not-allowed; transform:none; box-shadow:none; }

.empty-state { text-align:center; padding: 16px 0; color:#64748b; }
</style>
