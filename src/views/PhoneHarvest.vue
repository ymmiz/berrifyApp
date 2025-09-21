<template>
  <div class="page-container">
    <div class="back-button" @click="goBack"> &larr; </div>

    <div class="page-header">
      <h1 class="page-title">Harvest {{ plantName }}</h1>
      <p class="page-subtitle">Record your strawberry harvest</p>
    </div>

    <div class="page-content">
      <div class="harvest-card">
        <h2>How many strawberries did you harvest?</h2>
        <p class="harvest-description">
          Enter the number of strawberries you collected from {{ plantName }}
        </p>

        <div class="number-input-section">
          <div class="number-input-container">
            <button class="decrease-btn" @click="decreaseCount" :disabled="harvestCount <= 0">−</button>
            <input type="number" v-model.number="harvestCount" min="0" max="100"
                   class="harvest-input" @input="validateInput"/>
            <button class="increase-btn" @click="increaseCount">+</button>
          </div>
          <div class="input-label"><span>Strawberries</span></div>
        </div>

        <div class="quick-select">
          <h3>Quick Select</h3>
          <div class="quick-buttons">
            <button v-for="n in quickCounts" :key="n"
                    class="quick-btn" :class="{ active: harvestCount === n }"
                    @click="setCount(n)">
              {{ n }}
            </button>
          </div>
        </div>

        <div v-if="previousHarvests.length" class="history-preview">
          <h3>Previous Harvests</h3>
          <div class="history-items">
            <div v-for="(h, i) in previousHarvests.slice(0,3)" :key="i" class="history-item">
              <span class="history-count">{{ h.count }} strawberries</span>
              <span class="history-date">{{ formatDate(h.date) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="action-buttons">
        <button class="btn-secondary" @click="goBack">Cancel</button>
        <button class="btn-primary" @click="saveHarvest" :disabled="harvestCount < 0">Save Harvest</button>
      </div>
    </div>
  </div>
</template>

<script>
import { db, auth } from "@/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default {
  name: "PhoneHarvest",
  data() {
    return {
      plantName: "Plant",
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
      if (this.$route.query.plantName) this.plantName = this.$route.query.plantName;
      if (this.$route.query.plantId) this.plantId = this.$route.query.plantId;
    },
    loadHarvestHistory() {
      const key = this.plantId ? `harvestHistory_${this.plantId}` : "harvestHistory_default";
      const saved = localStorage.getItem(key);
      if (saved) {
        this.previousHarvests = JSON.parse(saved).sort((a,b)=>new Date(b.date)-new Date(a.date));
      }
    },
    increaseCount(){ if (this.harvestCount < 100) this.harvestCount++; },
    decreaseCount(){ if (this.harvestCount > 0) this.harvestCount--; },
    setCount(n){ this.harvestCount = n; },
    validateInput(){
      if (this.harvestCount < 0) this.harvestCount = 0;
      if (this.harvestCount > 100) this.harvestCount = 100;
    },
    async saveHarvest() {
      if (this.harvestCount < 0) return;
      const user = auth.currentUser;
      if (!user) { console.error("No logged in user"); return; }

      // ✅ COUNT-ONLY payload
      const harvestData = {
        count: this.harvestCount,
        date: serverTimestamp(),
        plantName: this.plantName,
        plantId: this.plantId,
        user_id: user.uid,
        owner: user.email || "Unknown",
        quality: "Unknown"
      };

      try {
        await addDoc(collection(db, "plants", this.plantId, "harvests"), harvestData);

        // local preview
        this.previousHarvests.unshift({ ...harvestData, date: new Date().toISOString() });
        if (this.previousHarvests.length > 20) this.previousHarvests = this.previousHarvests.slice(0,20);
        const key = this.plantId ? `harvestHistory_${this.plantId}` : "harvestHistory_default";
        localStorage.setItem(key, JSON.stringify(this.previousHarvests));

        // Emit event to refresh profile stats if user is on profile page
        this.$root.$emit('harvest-saved');

        this.$router.push({ path: "/analysis", query: {
          plantId: this.plantId, plantName: this.plantName, harvestCount: this.harvestCount
        }});
      } catch (err) {
        console.error("Failed to save harvest:", err);
      }
    },
    formatDate(d){
      const dt = new Date(d);
      const diff = (Date.now() - dt.getTime())/(1000*60*60*24);
      if (diff < 1) return "Today";
      if (diff < 2) return "Yesterday";
      if (diff < 7) return `${Math.floor(diff)} days ago`;
      return dt.toLocaleDateString();
    },
    goBack(){ this.$router.push("/mydiary"); }
  }
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
.harvest-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 25px;
  padding: 40px 30px;
  text-align: center;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  margin-bottom: 30px;
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
/* Number Input */
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
.decrease-btn,
.increase-btn {
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
.decrease-btn:hover,
.increase-btn:hover {
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
/* History */
.history-preview {
  border-top: 1px solid #ecf0f1;
  padding-top: 20px;
  margin-top: 20px;
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
/* Buttons */
.action-buttons {
  display: flex;
  gap: 15px;
  padding: 20px 0;
}
.btn-secondary,
.btn-primary {
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
</style>
