<template>
  <div class="page-container">
    <div class="page-wrapper">
      <div class="back-button" @click="goBack">
        <i class="bi bi-arrow-left"></i>
      </div>
    </div>

    <div class="title-wrapper">
      <h1 class="page-title">🍓 Harvest Recommendations</h1>
      <p class="plant-subtitle">{{ plantName }}</p>
    </div>

    <div class="page-content">
      <!-- Loading State -->
      <div v-if="loading" class="loading-section">
        <div class="loading-card">
          <div class="loading-icon">
            <i class="bi bi-search"></i>
          </div>
          <h3>Analyzing Your Strawberries...</h3>
          <div class="loading-spinner"></div>
        </div>
      </div>

      <!-- No Analysis State -->
      <div v-else-if="!latestUpload" class="empty-state">
        <div class="empty-card">
          <div class="empty-icon">
            <i class="bi bi-exclamation-triangle"></i>
          </div>
          <h3>No Analysis Available</h3>
          <p>Please upload photos of your strawberries first to get harvest recommendations.</p>
          <button class="btn-primary" @click="goBack">
            <i class="bi bi-arrow-left"></i>
            Go Back
          </button>
        </div>
      </div>

      <!-- Harvest Results -->
      <div v-else class="harvest-results">
        <!-- Harvest Summary -->
        <div class="harvest-summary">
          <div class="summary-header">
            <h2>🎯 Best {{ harvestCount }} Strawberr{{ harvestCount > 1 ? 'ies' : 'y' }} for Harvest</h2>
            <p>Hand-picked based on optimal ripeness analysis</p>
          </div>
          
          <div class="harvest-stats">
            <div class="stat-card">
              <div class="stat-number">{{ selectedData.length }}</div>
              <div class="stat-label">Ready to Harvest</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">{{ getBestRipeness() }}%</div>
              <div class="stat-label">Best Ripeness</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">{{ (latestUpload.ranking || 'Expert').toString().split(' ')[0] }}</div>
              <div class="stat-label">Garden Level</div>
            </div>
          </div>
        </div>

        <!-- Selected Strawberries Grid -->
        <div v-if="selectedData.length > 0" class="strawberries-section">
          <div class="section-header">
            <h3><i class="bi bi-award-fill"></i> Your Selected Harvest</h3>
            <p class="harvest-note">Ordered by ripeness - pick these first!</p>
          </div>

          <div class="strawberries-grid">
            <div 
              v-for="(strawberry, index) in selectedData" 
              :key="strawberry.key"
              class="strawberry-harvest-card"
              :class="getRipenessClass(strawberry.red_precent)"
            >
              <div class="rank-badge">
                <span class="rank-number">#{{ index + 1 }}</span>
                <span class="rank-label">Best</span>
              </div>

              <div class="strawberry-header">
                <h4>{{ strawberry.key }}</h4>
                <div class="ripeness-score" :class="getRipenessClass(strawberry.red_precent)">
                  {{ (strawberry.red_precent ?? 0).toFixed(1) }}%
                </div>
              </div>

              <div class="ripeness-visual">
                <div class="ripeness-bar">
                  <div 
                    class="ripeness-fill" 
                    :class="getRipenessClass(strawberry.red_precent)"
                    :style="{ width: (strawberry.red_precent ?? 0) + '%' }"
                  ></div>
                </div>
                <div class="ripeness-label">{{ getRipenessLabel(strawberry.red_precent) }}</div>
              </div>

              <div class="mini-stats">
                <div class="mini-stat red">
                  <span class="mini-value">{{ (strawberry.red_precent ?? 0).toFixed(1) }}%</span>
                  <span class="mini-label">Red</span>
                </div>
                <div class="mini-stat green">
                  <span class="mini-value">{{ (strawberry.green_precent ?? 0).toFixed(1) }}%</span>
                  <span class="mini-label">Green</span>
                </div>
                <div class="mini-stat pixels">
                  <span class="mini-value">{{ formatPixels(strawberry.total_pixels ?? 0) }}</span>
                  <span class="mini-label">Size</span>
                </div>
              </div>

              <div class="harvest-action" :class="getRipenessClass(strawberry.red_precent)">
                <i class="bi bi-check-circle-fill"></i>
                <span>{{ getHarvestAction(strawberry.red_precent) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Analysis Images -->
        <div class="analysis-image-section">
          <div class="section-header">
            <h3><i class="bi bi-eye-fill"></i> Analysis Comparison</h3>
            <p>Original photo vs automated ripeness detection results</p>
          </div>
          
          <div class="images-grid">
            <!-- Original Photo -->
            <div class="image-container">
              <div class="image-header">
                <h4><i class="bi bi-camera"></i> Original Photo</h4>
                <span class="image-label">Latest Upload</span>
              </div>
              <div class="image-wrapper">
                <img 
                  :src="getImageUrl(latestUpload)" 
                  alt="Original Strawberry Photo" 
                  class="analysis-image"
                />
              </div>
            </div>

            <!-- Automated Analysis -->
            <div class="image-container">
              <div class="image-header">
                <h4><i class="bi bi-robot"></i> System Analysis</h4>
                <span class="image-label">Processed Result</span>
              </div>
              <div class="image-wrapper">
                <img 
                  :src="getAnnotatedUrl(latestUpload)" 
                  alt="System-Analyzed Strawberry Photo" 
                  class="analysis-image"
                />
              </div>
              <div class="image-overlay">
                <div class="overlay-badge">
                  <i class="bi bi-check-circle-fill"></i>
                  Analysis Complete
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons">
          <button class="btn-secondary" @click="goBack">
            <i class="bi bi-arrow-left"></i>
            Back to Harvest
          </button>
          <button class="btn-primary" @click="viewAllPhotos">
            <i class="bi bi-images"></i>
            View All Photos
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase'
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'

export default {
  name: 'AnalysisView',
  data() {
    return {
      plantId: null,
      plantName: '',
      harvestCount: 0,
      latestUpload: null,
      loading: true,
      selectedData: []
    }
  },
  async mounted() {
    this.plantId = this.$route.query.plantId
    this.plantName = this.$route.query.plantName || 'Plant'
    this.harvestCount = parseInt(this.$route.query.harvestCount) || 1
    const source = (this.$route.query.source || '').toLowerCase() // 'hardware' | 'phone' | ''

    if (!this.plantId) {
      this.loading = false
      return
    }

    try {
      const uploadsRef = collection(db, "plants", this.plantId, "uploads")

      // Prefer requested source if provided; otherwise take latest of any source.
      const parts = [uploadsRef]
      if (source === 'hardware') parts.push(where('mode', '==', 'hardware'))
      else if (source === 'phone') parts.push(where('mode', '==', 'phone'))
      parts.push(orderBy('timestamp', 'desc'), limit(1))

      let snap = await getDocs(query(...parts))

      // Fallback: if requested source had no docs, grab latest of any mode.
      if (snap.empty) {
        const anyQ = query(uploadsRef, orderBy('timestamp', 'desc'), limit(1))
        snap = await getDocs(anyQ)
      }

      if (!snap.empty) {
        this.latestUpload = snap.docs[0].data()

        // Build ranking list for N best strawberries
        const ripeness = this.latestUpload?.analysis?.ripeness_data
        if (ripeness && typeof ripeness === 'object') {
          const rows = Object.entries(ripeness)
            .map(([key, data]) => ({ key, ...data }))
            .sort((a, b) => (b.red_precent ?? 0) - (a.red_precent ?? 0))
          this.selectedData = rows.slice(0, this.harvestCount)
        } else {
          this.selectedData = []
        }
      } else {
        this.latestUpload = null
      }
    } catch (err) {
      console.error("Error loading analysis:", err)
    } finally {
      this.loading = false
    }
  },
  methods: {
    goBack() { this.$router.go(-1) },
    viewAllPhotos() {
      this.$router.push({
        path: '/photolist',
        query: { plantId: this.plantId, plantName: this.plantName }
      })
    },

    // ---- tolerant image getters (work for phone & Pi) ----
    getImageUrl(u) {
      // phone: image_url ; hardware: photo_url
      return u?.image_url || u?.photo_url || u?.url || ''
    },
    getAnnotatedUrl(u) {
      // phone: annotated_url ; hardware: annotated_image (base64)
      return u?.annotated_url || u?.annotated_image || ''
    },

    // ---- display helpers (unchanged UI behaviour) ----
    getRipenessClass(redPercent = 0) {
      if (redPercent >= 70) return 'perfect'
      if (redPercent >= 50) return 'good'
      if (redPercent >= 30) return 'medium'
      return 'early'
    },
    getRipenessLabel(redPercent = 0) {
      if (redPercent >= 70) return 'Perfect for Harvest'
      if (redPercent >= 50) return 'Ready to Pick'
      if (redPercent >= 30) return 'Nearly Ready'
      return 'Still Growing'
    },
    getHarvestAction(redPercent = 0) {
      if (redPercent >= 70) return 'Harvest Now!'
      if (redPercent >= 50) return 'Pick Today'
      if (redPercent >= 30) return 'Wait 1-2 Days'
      return 'Wait Longer'
    },
    getBestRipeness() {
      if (!this.selectedData.length) return 0
      const best = Math.max(...this.selectedData.map(s => s.red_precent ?? 0))
      return best.toFixed(1)
    },
    formatPixels(pixels = 0) {
      return pixels >= 1000 ? (pixels / 1000).toFixed(1) + 'K' : pixels.toString()
    }
  }
}
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #8ab58a 0%, #a8d4a8 100%);
  color: #fff;
  padding: 24px;
  position: relative;
  overflow-x: hidden;
}

.page-wrapper { position: relative; z-index: 10; }

.back-button {
  width: 44px; height: 44px; background: #fff; border-radius: 12px;
  display: inline-flex; align-items: center; justify-content: center;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.15); cursor: pointer;
  transition: all 0.3s ease; border: none;
}
.back-button:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2); }
.back-button i { font-size: 20px; color: #2e7d32; }

.title-wrapper { margin: 24px 0 32px 0; text-align: center; }
.page-title { font-size: 2.5rem; font-weight: 800; margin: 0 0 8px 0; color: #fff; text-shadow: 0 2px 4px rgba(0,0,0,.1); }
.plant-subtitle { font-size: 1.25rem; font-weight: 500; color: rgba(255,255,255,.9); margin: 0; }

.page-content {
  background: #fff; color: #2c3e50; border-radius: 24px; padding: 40px;
  box-shadow: 0 12px 48px rgba(0,0,0,.15); max-width: 1200px; margin: 0 auto;
}

/* Loading & Empty */
.loading-section, .empty-state { text-align: center; padding: 60px 20px; }
.loading-card, .empty-card { background: #fff; border-radius: 20px; padding: 40px; box-shadow: 0 8px 32px rgba(0,0,0,.08); }
.loading-icon, .empty-icon { font-size: 48px; color: #8ab58a; margin-bottom: 16px; }
.loading-icon i { animation: pulse 2s infinite; }
.loading-card h3, .empty-card h3 { font-size: 24px; font-weight: 700; color: #2c3e50; margin: 0 0 20px 0; }
.loading-spinner { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #8ab58a; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto; }
@keyframes spin { from {transform:rotate(0)} to {transform:rotate(360deg)} }
@keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1)} }

/* Summary */
.harvest-summary { margin-bottom: 40px; }
.summary-header { text-align: center; margin-bottom: 32px; }
.summary-header h2 { font-size: 28px; font-weight: 700; color: #2c3e50; margin: 0 0 8px 0; }
.summary-header p { font-size: 16px; color: #6b7b8a; margin: 0; }
.harvest-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin-bottom: 32px; }
.stat-card { background: linear-gradient(135deg, #8ab58a, #2e7d32); color: #fff; padding: 24px; border-radius: 16px; text-align: center; box-shadow: 0 8px 32px rgba(138,181,138,.3); transition: transform .3s ease; }
.stat-card:hover { transform: translateY(-4px); }
.stat-number { font-size: 36px; font-weight: 800; margin-bottom: 8px; }
.stat-label { font-size: 14px; font-weight: 600; opacity: .9; text-transform: uppercase; letter-spacing: .5px; }

/* Section header */
.section-header { margin-bottom: 24px; text-align: center; }
.section-header h3 { font-size: 24px; font-weight: 700; color: #2c3e50; margin: 0 0 8px 0; display: flex; align-items: center; justify-content: center; gap: 12px; }
.section-header h3 i { color: #8ab58a; }
.harvest-note { font-size: 14px; color: #6b7b8a; font-style: italic; margin: 0; }

/* Cards */
.strawberries-section { margin-bottom: 40px; }
.strawberries-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; }
.strawberry-harvest-card { background: #fff; border-radius: 20px; padding: 24px; box-shadow: 0 8px 32px rgba(0,0,0,.08); border: 3px solid transparent; transition: all .3s ease; position: relative; overflow: hidden; }
.strawberry-harvest-card:hover { transform: translateY(-4px); box-shadow: 0 12px 48px rgba(0,0,0,.15); }
.strawberry-harvest-card.perfect{ border-color:#4caf50; background:linear-gradient(135deg,#fff 0%,#f8fff8 100%) }
.strawberry-harvest-card.good{ border-color:#8bc34a; background:linear-gradient(135deg,#fff 0%,#f9fff9 100%) }
.strawberry-harvest-card.medium{ border-color:#ff9800; background:linear-gradient(135deg,#fff 0%,#fffaf5 100%) }
.strawberry-harvest-card.early{ border-color:#9e9e9e; background:linear-gradient(135deg,#fff 0%,#fafafa 100%) }

/* rank */
.rank-badge{ position:absolute; top:-8px; right:16px; background:linear-gradient(135deg,#ff6b6b,#ee5a24); color:#fff; padding:8px 16px; border-radius:0 0 12px 12px; font-size:12px; font-weight:700; text-align:center; box-shadow:0 4px 12px rgba(255,107,107,.3) }
.rank-number{ display:block; font-size:16px; font-weight:800 }
.rank-label{ font-size:10px; opacity:.9; text-transform:uppercase; letter-spacing:.5px }

/* header, bars */
.strawberry-header{ display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; padding-top:20px }
.strawberry-header h4{ font-size:20px; font-weight:700; color:#2c3e50; margin:0 }
.ripeness-score{ padding:8px 16px; border-radius:20px; font-size:16px; font-weight:800; color:#fff }
.ripeness-score.perfect{ background:#4caf50 } .ripeness-score.good{ background:#8bc34a }
.ripeness-score.medium{ background:#ff9800 } .ripeness-score.early{ background:#9e9e9e }

.ripeness-visual{ margin-bottom:20px }
.ripeness-bar{ height:12px; background:#ecf0f1; border-radius:6px; overflow:hidden; margin-bottom:8px }
.ripeness-fill{ height:100%; border-radius:6px; transition:width .8s ease }
.ripeness-fill.perfect{ background:linear-gradient(90deg,#4caf50,#45a049) }
.ripeness-fill.good{ background:linear-gradient(90deg,#8bc34a,#7cb342) }
.ripeness-fill.medium{ background:linear-gradient(90deg,#ff9800,#f57c00) }
.ripeness-fill.early{ background:linear-gradient(90deg,#9e9e9e,#757575) }
.ripeness-label{ font-size:14px; font-weight:600; color:#6b7b8a; text-align:center }

/* minis */
.mini-stats{ display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:16px }
.mini-stat{ background:rgba(138,181,138,.05); padding:12px 8px; border-radius:12px; text-align:center }
.mini-value{ display:block; font-size:16px; font-weight:700; color:#2c3e50; margin-bottom:4px }
.mini-label{ font-size:12px; font-weight:600; color:#6b7b8a; text-transform:uppercase; letter-spacing:.5px }

/* action strip */
.harvest-action{ padding:12px 16px; border-radius:12px; color:#fff; font-weight:600; text-align:center; display:flex; align-items:center; justify-content:center; gap:8px }
.harvest-action.perfect{ background:linear-gradient(135deg,#4caf50,#45a049) }
.harvest-action.good{ background:linear-gradient(135deg,#8bc34a,#7cb342) }
.harvest-action.medium{ background:linear-gradient(135deg,#ff9800,#f57c00) }
.harvest-action.early{ background:linear-gradient(135deg,#9e9e9e,#757575) }

/* images */
.analysis-image-section{ margin-bottom:2rem }
.images-grid{ display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; margin-top:1rem }
.image-container{ position:relative; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,.1); transition:transform .3s ease, box-shadow .3s ease; min-height:320px; display:flex; flex-direction:column }
.image-container:hover{ transform:translateY(-2px); box-shadow:0 8px 25px rgba(0,0,0,.15) }
.image-header{ padding:1rem; background:linear-gradient(135deg,#f8f9fa 0%,#e9ecef 100%); display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #dee2e6 }
.image-header h4{ margin:0; font-size:1rem; font-weight:600; color:#495057; display:flex; align-items:center; gap:.5rem }
.image-label{ background:linear-gradient(135deg,#28a745,#20c997); color:#fff; padding:.25rem .75rem; border-radius:12px; font-size:.75rem; font-weight:500 }
.analysis-image{ width:100%; height:auto; max-height:400px; object-fit:contain; display:block; background:#f8f9fa; flex:1 }
.image-wrapper{ flex:1; display:flex; align-items:center; justify-content:center; min-height:250px; padding:1rem; background:#f8f9fa }
.image-overlay{ position:absolute; top:20px; right:20px }
.overlay-badge{ background:rgba(138,181,138,.9); color:#fff; padding:8px 16px; border-radius:20px; font-size:14px; font-weight:600; backdrop-filter:blur(10px); display:flex; align-items:center; gap:8px }

/* buttons */
.action-buttons{ display:flex; gap:16px; justify-content:center; flex-wrap:wrap }
.btn-primary,.btn-secondary{ padding:14px 24px; border:none; border-radius:12px; font-weight:700; font-size:16px; display:inline-flex; align-items:center; gap:8px; cursor:pointer; transition:all .3s ease; text-decoration:none }
.btn-primary{ background:linear-gradient(135deg,#8ab58a,#2e7d32); color:#fff; box-shadow:0 6px 20px rgba(138,181,138,.3) }
.btn-primary:hover{ transform:translateY(-2px); box-shadow:0 8px 28px rgba(138,181,138,.4) }
.btn-secondary{ background:rgba(108,117,125,.1); color:#6c757d; border:2px solid rgba(108,117,125,.2) }
.btn-secondary:hover{ background:rgba(108,117,125,.15); transform:translateY(-2px) }

/* responsive */
@media (max-width: 768px){
  .images-grid{ grid-template-columns:1fr; gap:1rem }
}
</style>
