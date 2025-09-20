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
      <img :src="latestUpload.annotated_url" alt="Annotated Strawberry" class="annotated-img"/>

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
            <td>{{ strawberry.red_precent.toFixed(2) }}%</td>
            <td>{{ strawberry.green_precent.toFixed(2) }}%</td>
            <td>{{ strawberry.total_pixels }}</td>
          </tr>
        </tbody>
      </table>

      <!-- Ranking -->
      <h2>🏆 Ranking</h2>
      <p>{{ latestUpload.ranking }} (Avg Red: {{ latestUpload.avgRedPercent?.toFixed(2) || 0 }}%)</p>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase'
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore'

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

    if (!this.plantId) {
      this.loading = false
      return
    }

    try {
      const uploadsRef = collection(db, "plants", this.plantId, "uploads")
      const q = query(uploadsRef, orderBy("timestamp", "desc"), limit(1))
      const snap = await getDocs(q)

      if (!snap.empty) {
        this.latestUpload = snap.docs[0].data()

        if (this.latestUpload.analysis?.ripeness_data) {
          const strawberries = Object.entries(this.latestUpload.analysis.ripeness_data)
            .map(([key, data]) => ({ key, ...data }))

          // Sort by red % descending
          strawberries.sort((a, b) => b.red_precent - a.red_precent)

          // Pick top N based on harvestCount
          this.selectedData = strawberries.slice(0, this.harvestCount)
        }
      }
    } catch (err) {
      console.error("Error loading analysis:", err)
    } finally {
      this.loading = false
    }
  }
}
</script>

<style scoped>
.analysis-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.annotated-img {
  max-width: 100%;
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

.analysis-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}

.analysis-table th, .analysis-table td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: center;
}

.analysis-table th {
  background: #f5f5f5;
}
</style>
