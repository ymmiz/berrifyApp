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
      <!-- Harvest Card -->
      <div class="harvest-card">
        <!-- Removed Font Awesome icon as it's not available -->
        
        <h2>How many strawberries did you harvest?</h2>
        <p class="harvest-description">Enter the number of strawberries you collected from {{ plantName }}</p>
        
        <!-- Number Input -->
        <div class="number-input-section">
          <div class="number-input-container">
            <button class="decrease-btn" @click="decreaseCount" :disabled="harvestCount <= 0">
              −
            </button>
            
            <input 
              type="number" 
              v-model.number="harvestCount" 
              min="0" 
              max="100"
              class="harvest-input"
              @input="validateInput"
            />
            
            <button class="increase-btn" @click="increaseCount">
              +
            </button>
          </div>
          
          <div class="input-label">
            <span>Strawberries</span>
          </div>
        </div>

        <!-- Quick Select Buttons -->
        <div class="quick-select">
          <h3>Quick Select</h3>
          <div class="quick-buttons">
            <button 
              v-for="count in quickCounts" 
              :key="count"
              class="quick-btn"
              :class="{ active: harvestCount === count }"
              @click="setCount(count)">
              {{ count }}
            </button>
          </div>
        </div>

        <!-- Harvest History Preview -->
        <div v-if="previousHarvests.length > 0" class="history-preview">
          <h3>Previous Harvests</h3>
          <div class="history-items">
            <div v-for="(harvest, index) in previousHarvests.slice(0, 3)" :key="index" class="history-item">
              <span class="history-count">{{ harvest.count }} strawberries</span>
              <span class="history-date">{{ formatDate(harvest.date) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="action-buttons">
              <button class="btn-secondary" @click="goBack">
        Cancel
      </button>
      <button 
        class="btn-primary" 
        @click="saveHarvest"
        :disabled="harvestCount < 0">
        Save Harvest
      </button>
      </div>
    </div>
  </div>
</template>

<script>
//import { notify } from '../services/NotificationService';
//import '../styles/PhoneHarvest.css';

export default {
  name: 'PhoneHarvest',
  data() {
    return {
      plantName: 'Plant',
      plantId: null,
      harvestCount: 0,
      quickCounts: [5, 10, 15, 20, 25],
      previousHarvests: []
    };
  },
  mounted() {
    this.loadPlantDetails();
    this.loadHarvestHistory();
  },
  methods: {
    loadPlantDetails() {
      // Get plant details from query parameters
      if (this.$route.query.plantName) {
        this.plantName = this.$route.query.plantName;
      }
      if (this.$route.query.plantId) {
        this.plantId = this.$route.query.plantId;
      }
    },

    loadHarvestHistory() {
      // Load previous harvests for this plant
      const historyKey = this.plantId ? `harvestHistory_${this.plantId}` : 'harvestHistory_default';
      const savedHistory = localStorage.getItem(historyKey);
      
      if (savedHistory) {
        this.previousHarvests = JSON.parse(savedHistory);
        // Sort by date (most recent first)
        this.previousHarvests.sort((a, b) => new Date(b.date) - new Date(a.date));
      }
    },

    increaseCount() {
      if (this.harvestCount < 100) {
        this.harvestCount++;
      }
    },

    decreaseCount() {
      if (this.harvestCount > 0) {
        this.harvestCount--;
      }
    },

    setCount(count) {
      this.harvestCount = count;
    },

    validateInput() {
      // Ensure the input is within valid range
      if (this.harvestCount < 0) {
        this.harvestCount = 0;
      } else if (this.harvestCount > 100) {
        this.harvestCount = 100;
      }
    },

    saveHarvest() {
      if (this.harvestCount < 0) return;

      const harvestData = {
        count: this.harvestCount,
        date: new Date().toISOString(),
        plantName: this.plantName,
        plantId: this.plantId
      };

      // Add to harvest history
      this.previousHarvests.unshift(harvestData);
      
      // Keep only last 20 harvests
      if (this.previousHarvests.length > 20) {
        this.previousHarvests = this.previousHarvests.slice(0, 20);
      }

      // Save to localStorage
      const historyKey = this.plantId ? `harvestHistory_${this.plantId}` : 'harvestHistory_default';
      localStorage.setItem(historyKey, JSON.stringify(this.previousHarvests));

      // Update total harvest count for the plant
      this.updateTotalHarvest();

      // Show success notification
      if (this.harvestCount === 0) {
        notify.info(`No strawberries harvested from ${this.plantName} today.`);
      } else if (this.harvestCount === 1) {
        notify.success(`Harvested 1 strawberry from ${this.plantName}! 🍓`);
      } else {
        notify.success(`Harvested ${this.harvestCount} strawberries from ${this.plantName}! 🍓`);
      }

      // Navigate back to My Diary
      this.$router.push('/mydiary');
    },

    updateTotalHarvest() {
      // Calculate total harvests for this plant
      const totalStrawberries = this.previousHarvests.reduce((total, harvest) => total + harvest.count, 0);
      
      // Save total harvest count
      const totalKey = this.plantId ? `totalHarvest_${this.plantId}` : 'totalHarvest_default';
      localStorage.setItem(totalKey, totalStrawberries.toString());
    },

    formatDate(dateString) {
      const date = new Date(dateString);
      const today = new Date();
      const diffTime = today - date;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      
      return date.toLocaleDateString();
    },

    goBack() {
      this.$router.push('/mydiary');
    }
  }
};
</script>

<style scoped>

/* PhoneHarvest.css */

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

.page-header {
  padding: 80px 20px 30px;
  text-align: center;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 10px 0;
}

.page-subtitle {
  font-size: 16px;
  color: #7f8c8d;
  margin: 0;
}

.page-content {
  flex: 1;
  padding: 20px;
  max-width: 500px;
  width: 100%;
  margin: 0 auto;
}

/* Harvest Card */
.harvest-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 25px;
  padding: 40px 30px;
  text-align: center;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  margin-bottom: 30px;
}

.harvest-icon {
  margin-bottom: 20px;
}

.harvest-icon i {
  font-size: 48px;
  color: #e74c3c;
}

.harvest-card h2 {
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 10px 0;
}

.harvest-description {
  font-size: 16px;
  color: #7f8c8d;
  margin: 0 0 30px 0;
}

/* Number Input Section */
.number-input-section {
  margin-bottom: 30px;
}

.number-input-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin-bottom: 15px;
}

.decrease-btn, .increase-btn {
  width: 50px;
  height: 50px;
  border: none;
  border-radius: 15px;
  background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
  color: white;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.decrease-btn:hover, .increase-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(74, 144, 226, 0.3);
}

.decrease-btn:disabled {
  background: linear-gradient(135deg, #bdc3c7 0%, #95a5a6 100%);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.harvest-input {
  width: 120px;
  height: 60px;
  border: 3px solid #e8f4f8;
  border-radius: 20px;
  font-size: 28px;
  font-weight: 700;
  text-align: center;
  color: #2c3e50;
  background: white;
  transition: all 0.3s ease;
}

.harvest-input:focus {
  outline: none;
  border-color: #4a90e2;
  box-shadow: 0 0 20px rgba(74, 144, 226, 0.2);
}

.input-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #7f8c8d;
  font-weight: 500;
}

.input-label i {
  color: #e74c3c;
  font-size: 16px;
}

/* Quick Select */
.quick-select {
  margin-bottom: 30px;
}

.quick-select h3 {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 15px 0;
}

.quick-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.quick-btn {
  width: 50px;
  height: 50px;
  border: 2px solid #e8f4f8;
  border-radius: 15px;
  background: white;
  color: #2c3e50;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.quick-btn:hover {
  border-color: #4a90e2;
  color: #4a90e2;
  transform: translateY(-2px);
}

.quick-btn.active {
  background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
  border-color: #4a90e2;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(74, 144, 226, 0.3);
}

/* History Preview */
.history-preview {
  border-top: 1px solid #ecf0f1;
  padding-top: 20px;
  margin-top: 20px;
}

.history-preview h3 {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 15px 0;
}

.history-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background: rgba(74, 144, 226, 0.05);
  border-radius: 12px;
  border-left: 3px solid #4a90e2;
}

.history-count {
  font-weight: 600;
  color: #2c3e50;
  font-size: 14px;
}

.history-date {
  font-size: 12px;
  color: #7f8c8d;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 15px;
  padding: 20px 0;
}

.btn-secondary, .btn-primary {
  flex: 1;
  padding: 16px 24px;
  border: none;
  border-radius: 15px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.btn-secondary {
  background: linear-gradient(135deg, #bdc3c7 0%, #95a5a6 100%);
  color: white;
}

.btn-secondary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(149, 165, 166, 0.3);
}

.btn-primary {
  background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(39, 174, 96, 0.3);
}

.btn-primary:disabled {
  background: linear-gradient(135deg, #bdc3c7 0%, #95a5a6 100%);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Responsive Design */
@media (max-width: 768px) {
  .page-content {
    padding: 15px;
  }
  
  .harvest-card {
    padding: 30px 20px;
  }
  
  .harvest-input {
    width: 100px;
    height: 50px;
    font-size: 24px;
  }
  
  .decrease-btn, .increase-btn {
    width: 45px;
    height: 45px;
    font-size: 18px;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 24px;
  }
  
  .harvest-card h2 {
    font-size: 20px;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .quick-buttons {
    gap: 8px;
  }
  
  .quick-btn {
    width: 45px;
    height: 45px;
    font-size: 14px;
  }
}
</style>
