<template>
  <div class="hardware-analysis">
    <div class="page-container">
      <div class="header">
        <div class="back-button" @click="$router.go(-1)">
          <i class="bi bi-arrow-left"></i>
        </div>
        <h1>Hardware Analysis</h1>
      </div>

      <div class="device-card">
        <div class="device-icon"><i class="bi bi-hdd-fill"></i></div>
        <h2>Hardware Device</h2>

        <div class="connection-status">
          <h3>Device Connected</h3>
          <p>Tap once to enable autoscan. The Pi will keep taking photos on a schedule.</p>
        </div>

        <button class="scan-button" @click="enableAutoscan" :disabled="isWorking">
          <i v-if="isWorking" class="bi bi-arrow-repeat spin"></i>
          <i v-else class="bi bi-power"></i>
          {{ isWorking ? "Enabling..." : "Enable Autoscan" }}
        </button>

        <button class="back-to-diary-button" @click="goToHardwareGallery">
          <i class="bi bi-images"></i> Open Hardware Photos
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import "../styles/HardwareAnalysis.css"
import { getFirestore, doc, setDoc } from 'firebase/firestore'

export default {
  name: 'HardwareAnalysis',
  data() {
    const q = this.$route?.query || {}
    const p = this.$route?.params || {}
    return {
      plantId: q.plantId || p.plantId || null,
      plantName: q.plantName || 'Plant',
      isWorking: false,
      deviceId: import.meta.env.VITE_DEVICE_ID || 'pi-01'
    }
  },
  mounted() {
    if (!this.plantId) {
      alert('Missing plantId. Please open this page from a plant card.')
      this.$router.push('/mydiary')
    }
  },
  methods: {
    async enableAutoscan() {
      if (!this.plantId) return
      this.isWorking = true
      try {
        const db = getFirestore()
        await setDoc(
          doc(db, 'devices', String(this.deviceId)),
          {
            plant_id: String(this.plantId),
            autoscan_enabled: true,
            interval_sec: 120 // set your desired cadence
          },
          { merge: true }
        )
        // After enabling autoscan, jump to the hardware gallery
        this.goToHardwareGallery()
      } catch (e) {
        console.error(e)
        alert(e?.message || 'Failed to enable autoscan')
      } finally {
        this.isWorking = false
      }
    },
    goToHardwareGallery() {
      this.$router.push({
        name: 'PhotoListHardware',
        query: { plantId: this.plantId, plantName: this.plantName }
      })
    }
  }
}
</script>


<style scoped>
/* your original styles, untouched */
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
.back-button { color: #070808; font-size: 22px; font-weight: bold; }
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
.action-buttons { display: flex; gap: 15px; padding: 20px 0; }
.btn-secondary, .btn-primary {
  flex: 1; padding: 16px 24px; border: none; border-radius: 15px; font-size: 16px; font-weight: 600;
  cursor: pointer; transition: all 0.3s ease; display: flex; align-items: center; justify-content: center; gap: 10px;
}
.btn-secondary { background: linear-gradient(135deg, #bdc3c7 0%, #95a5a6 100%); color: white; }
.btn-secondary:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(149, 165, 166, 0.3); }
.btn-primary { background: linear-gradient(135deg, #27ae60 0%, #229954 100%); color: white; }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(39, 174, 96, 0.3); }
.btn-primary:disabled { background: linear-gradient(135deg, #bdc3c7 0%, #95a5a6 100%); cursor: not-allowed; transform: none; box-shadow: none; }
.loading-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 48px; color: #64748b; }
.spinner { width: 36px; height: 36px; border: 4px solid rgba(22, 160, 133, 0.2); border-top-color: #16a085; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-state { text-align: center; padding: 32px 0; color: #64748b; }
</style>
