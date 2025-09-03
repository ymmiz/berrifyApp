<template>
  <div class="scanned-photo">
    <!-- Header with back button -->
    <div class="header">
      <div class="back-button" @click="$router.go(-1)">
        <i class="fas fa-arrow-left"></i>
      </div>
      <h1>Scanned Photo</h1>
    </div>

    <!-- Timestamp -->
    <div class="timestamp">
      {{ currentDate }}, {{ currentTime }}
    </div>

    <!-- Results Card -->
    <div class="results-card">
      <!-- Strawberry Image and Detection Info -->
      <div class="detection-section">
        <div class="strawberry-image">
          <img src="/strawberry_pot.png" alt="Detected Strawberries" />
        </div>
        <div class="detection-info">
          <h2>{{ detectedCount }} strawberries</h2>
          <h3>Detected</h3>
        </div>
      </div>

      <!-- Selection Section -->
      <div class="selection-section">
        <p class="instruction">Choose the number of strawberries you want to keep</p>
        
        <div class="counter">
          <button class="counter-btn" @click="decreaseCount" :disabled="selectedCount <= 1">
            <i class="fas fa-minus"></i>
          </button>
          <span class="count">{{ selectedCount }}</span>
          <button class="counter-btn" @click="increaseCount" :disabled="selectedCount >= detectedCount">
            <i class="fas fa-plus"></i>
          </button>
        </div>

        <button class="proceed-button" @click="proceedToRanking">
          Proceed
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import "../Styles/ScannedPhoto.css";

export default {
  name: "ScannedPhoto",
  data() {
    return {
      detectedCount: 4, // Default value, will be updated from query params
      selectedCount: 1,
      currentDate: "",
      currentTime: "",
      plantName: "Strawberry Plant" // Default name, will be updated from query params
    };
  },
  mounted() {
    this.setCurrentDateTime();
    this.loadDetectionData();
  },
  methods: {
    setCurrentDateTime() {
      const now = new Date();
      this.currentDate = now.toLocaleDateString('en-GB');
      this.currentTime = now.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    },
    loadDetectionData() {
      // Get data from query parameters
      if (this.$route.query.detected) {
        this.detectedCount = parseInt(this.$route.query.detected);
      } else {
        // Fallback to localStorage
        const storedCount = localStorage.getItem('detectedStrawberries');
        if (storedCount) {
          this.detectedCount = parseInt(storedCount);
        }
      }
      
      // Get plant name
      if (this.$route.query.plantName) {
        this.plantName = this.$route.query.plantName;
      } else {
        const storedName = localStorage.getItem('currentPlantName');
        if (storedName) {
          this.plantName = storedName;
        }
      }
    },
    decreaseCount() {
      if (this.selectedCount > 1) {
        this.selectedCount--;
      }
    },
    increaseCount() {
      if (this.selectedCount < this.detectedCount) {
        this.selectedCount++;
      }
    },
    proceedToRanking() {
      // Store the selected count for the ranking page
      localStorage.setItem('strawberriesToKeep', this.selectedCount);
      localStorage.setItem('detectedStrawberries', this.detectedCount);
      
      // Navigate to ranking page with selected count
      this.$router.push({
        path: '/strawberry-ranking',
        query: {
          detected: this.detectedCount,
          selected: this.selectedCount,
          plantName: this.plantName
        }
      });
    }
  }
};
</script>
