<template>
  <div class="page-container">
    <!-- Back Button -->
    <div class="back-button" @click="goBack">
      &larr;
    </div>

    <!-- Page Header -->
    <div class="page-header">
      <h1 class="page-title">Harvest {{ plantName }}</h1>
      <p class="page-subtitle">Record your strawberry harvest</p>
    </div>

    <!-- Page Content -->
    <div class="page-content">
      <!-- Loading -->
      <div v-if="loadingAnalysis" class="loading-state">
        <div class="spinner"></div>
        <p>Loading detection…</p>
      </div>

      <!-- Ready + have detections -->
      <div v-else-if="totalDetectedStrawberries > 0" class="harvest-card">
        <div class="detection-results">
          <div class="detection-icon">
            <i class="bi bi-camera-fill"></i>
          </div>
          <h3>{{ totalDetectedStrawberries }} strawberries detected</h3>
          <p class="detection-subtitle">
            Found in your latest photo analysis
            <span v-if="lastDetectionMode">
              ({{ lastDetectionMode === 'hardware' ? 'Raspberry Pi' : 'Phone' }})
            </span>
          </p>
        </div>

        <h2>How many strawberries did you harvest?</h2>
        <p class="harvest-description">
          Choose how many strawberries you want to harvest from the {{ totalDetectedStrawberries }} detected in {{ plantName }}
        </p>

        <div class="number-input-section">
          <div class="number-input-container">
            <button
              class="decrease-btn"
              @click="decreaseCount"
              :disabled="harvestCount <= 0"
            >−</button>

            <input
              type="number"
              v-model.number="harvestCount"
              min="0"
              :max="Math.max(100, totalDetectedStrawberries)"
              class="harvest-input"
              @input="validateInput"
            />

            <button class="increase-btn" @click="increaseCount"> + </button>
          </div>

          <div class="input-label"><span>Strawberries</span></div>
        </div>

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
              v-if="totalDetectedStrawberries > 0 && !availableQuickCounts.includes(totalDetectedStrawberries)"
              class="quick-btn all-btn"
              :class="{ active: harvestCount === totalDetectedStrawberries }"
              @click="setCount(totalDetectedStrawberries)"
            >
              All {{ totalDetectedStrawberries }}
            </button>
          </div>
        </div>

        <div class="action-buttons">
          <button class="btn-secondary" @click="goBack">Cancel</button>
          <button
            class="btn-primary"
            @click="saveHarvest"
            :disabled="harvestCount < 0 || harvestCount > totalDetectedStrawberries"
          >
            <span v-if="harvestCount > totalDetectedStrawberries">Cannot exceed detected amount</span>
            <span v-else>Save Harvest</span>
          </button>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="empty-state">
        <h3>No strawberries detected yet</h3>
        <p>Upload or analyze a photo first, then record your harvest.</p>
        <div class="action-buttons">
          <button class="btn-secondary" @click="goBack">Back</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import {
  collection, query, orderBy, limit, getDocs, where,
  addDoc, serverTimestamp
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export default {
  name: "PhoneHarvest",
  data() {
    return {
      plantName: "Plant",
      plantId: null,
      harvestCount: 0,
      quickCounts: [5, 10, 15, 20, 25],
      totalDetectedStrawberries: 0,
      previousHarvests: [],
      uploading: false,
      loadingAnalysis: true,
      lastDetectionMode: null, // 'hardware' | 'phone' | null
    };
  },
  mounted() {
    this.loadPlantDetails();
    this.loadLatestAnalysis();
    this.loadHarvestHistory();
  },
  computed: {
    availableQuickCounts() {
      if (this.totalDetectedStrawberries === 0) return this.quickCounts;
      return this.quickCounts.filter(c => c <= this.totalDetectedStrawberries);
    }
  },
  methods: {
    loadPlantDetails() {
      if (this.$route?.query?.plantName) this.plantName = this.$route.query.plantName;
      if (this.$route?.query?.plantId)   this.plantId   = this.$route.query.plantId;
    },

    async loadLatestAnalysis() {
      if (!this.plantId) { this.loadingAnalysis = false; return; }
      try {
        this.loadingAnalysis = true;

        const uploadsRef = collection(db, "plants", this.plantId, "uploads");

        // Helper to fetch latest upload, optionally by mode
        const latestOf = async (mode /* 'hardware' | null */) => {
          const parts = [uploadsRef];
          if (mode) parts.push(where("mode", "==", mode));
          parts.push(orderBy("timestamp", "desc"), limit(1));
          const qy = query(...parts);
          const snap = await getDocs(qy);
          return snap.empty ? null : snap.docs[0].data();
        };

        // Prefer hardware if available, else any
        let latestUpload = await latestOf('hardware');
        if (!latestUpload) latestUpload = await latestOf(null);

        let count = 0;
        let mode = latestUpload?.mode ?? null;

        if (latestUpload) {
          if (typeof latestUpload.detected_count === 'number') {
            count = latestUpload.detected_count;
          } else if (latestUpload.analysis?.ripeness_data) {
            count = Object.keys(latestUpload.analysis.ripeness_data).length;
          }
        }

        this.totalDetectedStrawberries = count || 0;
        this.lastDetectionMode = count > 0 ? mode : null;

      } catch (err) {
        console.error("Error loading analysis:", err);
        this.totalDetectedStrawberries = 0;
        this.lastDetectionMode = null;
      } finally {
        this.loadingAnalysis = false;
      }
    },

    loadHarvestHistory() {
      const key = this.plantId ? `harvestHistory_${this.plantId}` : "harvestHistory_default";
      const saved = localStorage.getItem(key);
      if (saved) {
        this.previousHarvests = JSON.parse(saved)
          .sort((a,b)=> new Date(b.date) - new Date(a.date));
      }
    },

    increaseCount(){ if (this.harvestCount < Math.max(100, this.totalDetectedStrawberries)) this.harvestCount++; },
    decreaseCount(){ if (this.harvestCount > 0)  this.harvestCount--; },
    setCount(n){ this.harvestCount = n; },

    validateInput() {
      if (this.harvestCount < 0) this.harvestCount = 0;
      else if (this.totalDetectedStrawberries > 0 && this.harvestCount > this.totalDetectedStrawberries) {
        this.harvestCount = this.totalDetectedStrawberries;
      } else if (this.harvestCount > Math.max(100, this.totalDetectedStrawberries)) {
        this.harvestCount = Math.max(100, this.totalDetectedStrawberries);
      }
    },

    async saveHarvest() {
      if (!this.plantId) { console.error("No plantId provided"); return; }
      if (this.harvestCount < 0) return;

      const auth = getAuth();
      const user = auth.currentUser;

      try {
        this.uploading = true;

        const payload = {
          count: this.harvestCount,
          date: serverTimestamp(),
          plantName: this.plantName,
          plantId: this.plantId,
          ...(user ? { user_id: user.uid, owner: user.email || null } : {}),
          detection_source: this.lastDetectionMode || 'unknown',
          detected_total_at_save: this.totalDetectedStrawberries
        };

        await addDoc(collection(db, "plants", this.plantId, "harvests"), payload);

        // local cache
        const localItem = { ...payload, date: new Date().toISOString() };
        this.previousHarvests.unshift(localItem);
        if (this.previousHarvests.length > 20) {
          this.previousHarvests = this.previousHarvests.slice(0, 20);
        }
        const key = this.plantId ? `harvestHistory_${this.plantId}` : "harvestHistory_default";
        localStorage.setItem(key, JSON.stringify(this.previousHarvests));

        this.updateTotalHarvest();

        this.$router.push({
          path: "/analysis",
          query: {
            plantId: this.plantId,
            plantName: this.plantName,
            harvestCount: this.harvestCount,
          },
        });
      } catch (err) {
        console.error("Failed to save harvest:", err);
      } finally {
        this.uploading = false;
      }
    },

    updateTotalHarvest() {
      const total = this.previousHarvests.reduce((sum, h) => sum + (h.count || 0), 0);
      const key = this.plantId ? `totalHarvest_${this.plantId}` : "totalHarvest_default";
      localStorage.setItem(key, total.toString());
    },

    goBack() { this.$router.push("/mydiary"); },
  },
};
</script>

<style scoped>
/* 🔹 Same CSS as your version (kept unchanged for design) */
.page-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #8ab58a 0%, #a8d4a8 100%);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow-x: hidden;
}
.back-button {
  position: absolute;
  top: 20px;
  left: 20px;
  width: 45px;
  height: 45px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  z-index: 10;
}
.back-button:hover {
  background: #ffffff;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}
.back-button {
  color: #070808;
  font-size: 22px;
  font-weight: bold;
}
.page-header { padding: 80px 20px 30px; text-align: center; }
.page-title { font-size: 28px; font-weight: 700; color: #2c3e50; margin: 0 0 10px 0; }
.page-subtitle { font-size: 16px; color: #7f8c8d; margin: 0; }
.page-content { flex: 1; padding: 20px; max-width: 500px; width: 100%; margin: 0 auto; }
.harvest-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 25px;
  padding: 40px 30px;
  text-align: center;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  margin-bottom: 30px;
}
.harvest-card h2 { font-size: 24px; font-weight: 600; color: #2c3e50; margin: 0 0 10px 0; }

/* Detection Results */
.detection-results {
  background: linear-gradient(135deg, #e8f5e8 0%, #d4edd4 100%);
  border-radius: 20px;
  padding: 25px;
  margin-bottom: 30px;
  border: 2px solid #a8d4a8;
  text-align: center;
}
.detection-icon {
  width: 60px; height: 60px;
  background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 15px;
  box-shadow: 0 8px 25px rgba(39, 174, 96, 0.3);
}
.detection-icon i { font-size: 24px; color: white; }
.detection-results h3 { font-size: 22px; font-weight: 700; color: #27ae60; margin: 0 0 8px 0; }
.detection-subtitle { font-size: 14px; color: #7f8c8d; margin: 0; font-style: italic; }
.harvest-description { font-size: 16px; color: #7f8c8d; margin: 0 0 30px 0; }

/* Number Input */
.number-input-section { margin-bottom: 30px; }
.number-input-container { display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 15px; }
.decrease-btn, .increase-btn {
  width: 50px; height: 50px; border: none; border-radius: 15px;
  background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
  color: white; font-size: 20px; cursor: pointer; transition: all 0.3s ease;
  display: flex; align-items: center; justify-content: center;
}
.decrease-btn:hover, .increase-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(74, 144, 226, 0.3); }
.decrease-btn:disabled { background: linear-gradient(135deg, #bdc3c7 0%, #95a5a6 100%); cursor: not-allowed; transform: none; box-shadow: none; }
.harvest-input {
  width: 120px; height: 60px; border: 3px solid #e8f4f8; border-radius: 20px;
  font-size: 28px; font-weight: 700; text-align: center; color: #2c3e50; background: white; transition: all 0.3s ease;
}
.harvest-input:focus { outline: none; border-color: #4a90e2; box-shadow: 0 0 20px rgba(74, 144, 226, 0.2); }

/* Quick Select */
.quick-select { margin-bottom: 30px; }
.quick-select h3 { font-size: 18px; font-weight: 600; color: #2c3e50; margin: 0 0 15px 0; }
.quick-buttons { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
.quick-btn {
  width: 50px; height: 50px; border: 2px solid #e8f4f8; border-radius: 15px;
  background: white; color: #2c3e50; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.3s ease;
}
.quick-btn:hover { border-color: #4a90e2; color: #4a90e2; transform: translateY(-2px); }
.quick-btn.active {
  background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
  border-color: #4a90e2; color: white; transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(74, 144, 226, 0.3);
}
.quick-btn.all-btn {
  background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
  border-color: #27ae60; color: white; font-weight: 700; min-width: 70px;
}
.quick-btn.all-btn:hover { border-color: #27ae60; transform: translateY(-2px); box-shadow: 0 8px 25px rgba(39, 174, 96, 0.3); }
.quick-btn.all-btn.active { background: linear-gradient(135deg, #229954 0%, #1e8449 100%); }

/* Buttons */
.action-buttons { display: flex; gap: 15px; padding: 20px 0; }
.btn-secondary, .btn-primary {
  flex: 1; padding: 16px 24px; border: none; border-radius: 15px;
  font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.3s ease;
  display: flex; align-items: center; justify-content: center; gap: 10px;
}
.btn-secondary { background: linear-gradient(135deg, #bdc3c7 0%, #95a5a6 100%); color: white; }
.btn-secondary:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(149, 165, 166, 0.3); }
.btn-primary { background: linear-gradient(135deg, #27ae60 0%, #229954 100%); color: white; }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(39, 174, 96, 0.3); }
.btn-primary:disabled { background: linear-gradient(135deg, #bdc3c7 0%, #95a5a6 100%); cursor: not-allowed; transform: none; box-shadow: none; }

/* Tiny loader & empty state */
.loading-state{ display:flex; flex-direction:column; align-items:center; gap:12px; padding:48px; color:#64748b }
.spinner{ width:36px; height:36px; border:4px solid rgba(22,160,133,.2); border-top-color:#16a085; border-radius:50%; animation:spin .8s linear infinite }
@keyframes spin{ to{ transform:rotate(360deg) } }
.empty-state{ text-align:center; padding:32px 0; color:#64748b; }
</style>
