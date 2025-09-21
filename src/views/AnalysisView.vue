<template>
  <div class="analysis-page">
    <h1>Analysis Results for {{ plantName }}</h1>

    <div v-if="loading">Loading analysis...</div>

    <div v-else-if="!latestUpload">
      <p>No analysis available yet for this plant.</p>
    </div>

    <div v-else>
      <!-- Annotated Image -->
      <h2>📷 Annotated Image</h2>
      <p class="subtle">Annotated Strawberry</p>

      <div v-if="imgLoading" class="img-state">Loading annotated image…</div>
      <div v-else-if="imgError" class="img-state error">
        Couldn’t load annotated image.
        <button class="retry" @click="resolveAnnotatedUrl(true)">Retry</button>
      </div>

      <img
        v-if="resolvedAnnotatedUrl && !imgLoading && !imgError"
        :src="resolvedAnnotatedUrl"
        alt="Annotated Strawberry"
        class="annotated-img"
        @error="onImgError"
        @load="onImgLoad"
      />

      <!-- Ripeness Data -->
      <h2>📊 Selected Harvest (Top {{ harvestCount }} Ripe)</h2>
      <table v-if="selectedData.length > 0" class="analysis-table">
        <thead>
          <tr>
            <th>Strawberry</th>
            <th>Red %</th>
            <th>Green %</th>
            <th>Total Pixels</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(strawberry, i) in selectedData" :key="i">
            <td>{{ strawberry.key }}</td>
            <td>{{ fmt(strawberry.red_precent) }}%</td>
            <td>{{ fmt(strawberry.green_precent) }}%</td>
            <td>{{ strawberry.total_pixels }}</td>
          </tr>
        </tbody>
      </table>

      <!-- Ranking -->
      <!-- <h2>🏆 Ranking</h2>
      <p>
        {{ latestUpload.ranking }}
        (Avg Red: {{ fmt(latestUpload.avgRedPercent) }}%)
      </p> -->
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase'
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { getStorage, ref as storageRef, getDownloadURL } from 'firebase/storage'

export default {
  name: 'AnalysisView',
  data() {
    return {
      plantId: null,
      plantName: '',
      harvestCount: 0,
      latestUpload: null,
      loading: true,
      selectedData: [],
      resolvedAnnotatedUrl: '',
      imgLoading: false,
      imgError: false,
      triedFallback: false,
    }
  },
  async mounted() {
    this.plantId = this.$route.query.plantId
    this.plantName = this.$route.query.plantName || 'Plant'
    this.harvestCount = parseInt(this.$route.query.harvestCount) || 1

    if (!this.plantId) { this.loading = false; return }

    try {
      const uploadsRef = collection(db, 'plants', this.plantId, 'uploads')
      const q = query(uploadsRef, orderBy('timestamp', 'desc'), limit(1))
      const snap = await getDocs(q)

      if (!snap.empty) {
        this.latestUpload = snap.docs[0].data()

        const ripeness = this.latestUpload?.analysis?.ripeness_data
        if (ripeness && typeof ripeness === 'object') {
          const list = Object.entries(ripeness).map(([key, data]) => ({ key, ...data }))
          list.sort((a, b) => (b.red_precent || 0) - (a.red_precent || 0))
          this.selectedData = list.slice(0, this.harvestCount)
        }

        await this.resolveAnnotatedUrl()
      }
    } catch (e) {
      console.error('Error loading analysis:', e)
    } finally {
      this.loading = false
    }
  },
  methods: {
    fmt(v) { const n = Number(v || 0); return Number.isFinite(n) ? n.toFixed(2) : '0.00' },

    async resolveAnnotatedUrl(forceRetry = false) {
      try {
        this.imgError = false
        this.imgLoading = true
        const lu = this.latestUpload || {}

        // 1) Prefer data URL saved as a Firestore string
        const dataUrl =
          lu.annotated_image ||
          lu?.analysis?.annotated_image ||
          lu?.analysis?.annotated?.data_url ||
          ''

        if (typeof dataUrl === 'string' && /^data:image\//i.test(dataUrl)) {
          this.resolvedAnnotatedUrl = dataUrl   // just use it directly
          return
        }

        // 2) Next, try a direct https URL
        const directUrl =
          lu.annotated_url ||
          lu?.analysis?.annotated_url ||
          lu?.annotatedPathUrl ||
          ''
        if (directUrl && /^https?:\/\//i.test(directUrl)) {
          this.resolvedAnnotatedUrl = directUrl
          return
        }

        // 3) Storage path or gs://
        const storage = getStorage()
        let path =
          lu.annotated_path ||
          lu?.analysis?.annotated_path ||
          lu.annotatedPath ||
          ''

        if (path) {
          if (/^gs:\/\//i.test(path)) {
            const parts = path.replace(/^gs:\/\//i, '').split('/')
            parts.shift() // bucket name (not needed by ref)
            path = parts.join('/')
          }
          path = path.replace(/^\/+/, '')
          const url = await getDownloadURL(storageRef(storage, path))
          this.resolvedAnnotatedUrl = url
          return
        }

        // 4) Fallback to original image (so user still sees something)
        const original = lu.photo_url || lu.image_url || ''
        this.resolvedAnnotatedUrl = original || ''
      } catch (e) {
        console.warn('Resolve annotated image failed:', e)
        if (!this.triedFallback && !forceRetry) {
          this.triedFallback = true
          const lu = this.latestUpload || {}
          this.resolvedAnnotatedUrl = lu.photo_url || lu.image_url || ''
        } else {
          this.imgError = true
        }
      } finally {
        this.imgLoading = false
      }
    },

    onImgError() {
      if (!this.triedFallback) {
        const lu = this.latestUpload || {}
        const fb = lu.photo_url || lu.image_url || ''
        if (fb && fb !== this.resolvedAnnotatedUrl) {
          this.triedFallback = true
          this.resolvedAnnotatedUrl = fb
          return
        }
      }
      this.imgError = true
    },
    onImgLoad() { this.imgError = false },
  },
}
</script>

<style scoped>
.analysis-page { max-width: 800px; margin: 0 auto; padding: 20px; }
.subtle { margin-top: -6px; color: rgba(0,0,0,0.45); font-size: 13px; }
.img-state { padding: 10px 12px; border-radius: 10px; background: rgba(0,0,0,0.05); display: inline-block; margin-bottom: 10px; }
.img-state.error { background: rgba(220,53,69,0.08); }
.retry { margin-left: 8px; border: 0; padding: 6px 10px; border-radius: 8px; background: #2e7d32; color: #fff; cursor: pointer; }
.annotated-img { max-width: 100%; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
.analysis-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
.analysis-table th, .analysis-table td { border: 1px solid #ddd; padding: 8px; text-align: center; }
.analysis-table th { background: #f5f5f5; }
</style>
