<template>
  <div class="page-container">
    <div class="page-wrapper">
      <div class="back-button" @click="goBack">
        <i class="bi bi-arrow-left"></i>
      </div>
    </div>

    <div class="title-wrapper">
      <p class="plant-name">{{ plantName }}</p>
    </div>

    <div class="page-content">
      <!-- Upload Area -->
      <div class="upload-section">
        <div
          class="upload-area"
          :class="{
            'has-image': selectedImages.length,
            'drag-over': isDragOver,
          }"
          @click="triggerFileInput"
          @drop="handleDrop"
          @dragover.prevent="isDragOver = true"
          @dragleave="isDragOver = false"
          @dragenter.prevent
        >
          <div v-if="!selectedImages.length" class="upload-content">
            <div class="upload-icon"><i class="bi bi-camera"></i></div>
            <h3>Take or Upload Plant Photos</h3>
            <p>Click to select photos or drag and drop multiple</p>
            <div class="supported-formats">
              <span>Supported: JPG, PNG, WEBP (≤10MB each)</span>
            </div>
          </div>

          <!-- Thumbnails before upload -->
          <div v-else class="thumb-grid">
            <div
              v-for="(src, idx) in imagePreviews"
              :key="idx"
              class="thumb"
              :title="selectedImages[idx]?.name || 'photo'"
            >
              <img :src="src" :alt="plantName + ' photo ' + (idx + 1)" />
              <button
                class="thumb-remove"
                @click.stop="removeAt(idx)"
                aria-label="Remove photo"
              >
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
          </div>
        </div>

        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          multiple
          style="display: none"
          @change="handleFileSelect"
        />
      </div>

      <!-- Upload Progress -->
      <div v-if="uploading" class="upload-progress-section">
        <div class="progress-card">
          <h3>
            <i class="bi bi-cloud-upload"></i>
            Uploading {{ selectedImages.length }} photo<span
              v-if="selectedImages.length > 1"
              >s</span
            >
          </h3>
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: uploadProgress + '%' }"
            ></div>
          </div>
          <span class="progress-text">{{ uploadProgress }}% Complete</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="action-buttons">
        <button class="btn-secondary" @click="goBack">
          <i class="bi bi-arrow-left"></i>
          Cancel
        </button>

        <button
          class="btn-primary"
          @click="uploadPhotos"
          :disabled="!selectedImages.length || uploading"
        >
          <i class="bi bi-cloud-upload"></i>
          {{
            uploading
              ? "Uploading…"
              : `Upload ${selectedImages.length} Photo${
                  selectedImages.length > 1 ? "s" : ""
                }`
          }}
        </button>
      </div>

      <!-- View Photos Button - Always available -->
      <div class="view-photos-section">
        <button class="btn-view-photos" @click="viewPhotos">
          <i class="bi bi-images"></i>
          View All Photos
        </button>
        <p class="view-photos-hint">See your complete photo history and analysis results</p>
      </div>

      <!-- Session Results - Only show results from current session -->
      <div v-if="sessionUploads.length" class="session-results">
        <h3>Today's Analysis Results</h3>

        <div class="session-uploads">
          <div v-for="u in sessionUploads" :key="u.id" class="upload-result">
            <img
              :src="u.annotated_image || u.image_url"
              class="result-thumb"
              :alt="plantName + ' analysis result'"
            />
            <div class="upload-info">
              <span class="status-badge" :class="u.status">{{ u.status }}</span>
              <div v-if="u.analysis && (u.analysis.red_precent !== undefined || u.avgRedPercent !== undefined)" class="analysis-details">
                <p v-if="u.analysis.red_precent !== undefined">Red: {{ u.analysis.red_precent?.toFixed(1) }}%</p>
                <p v-else-if="u.avgRedPercent !== undefined">Red Avg: {{ Number(u.avgRedPercent).toFixed(1) }}%</p>
                <p v-if="u.analysis.green_precent !== undefined">Green: {{ u.analysis.green_precent?.toFixed(1) }}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
// 🔁 Use the unified uploader
import { uploadFromPhone } from '@/scripts/uploadService'

import {
  getFirestore,
  doc,
  updateDoc,
  serverTimestamp,
  collection,
  onSnapshot,
} from "firebase/firestore";

const notify = {
  info: (m) => console.info(m) || alert(m),
  error: (m) => console.error(m) || alert(m),
  success: (m) => console.log(m) || alert(m),
};

export default {
  name: "PlantScan",
  data() {
    return {
      selectedImages: [],
      imagePreviews: [],
      isDragOver: false,
      plantName: "Plant",
      plantId: null,
      uploading: false,
      uploadProgress: 0,
      uploads: [], // results from Firestore
      summary: { ripe: 0, unripe: 0, overripe: 0, pending: 0 },
      sessionStartTime: null, // Track when this session started
      sessionUploads: [], // Only uploads from current session
    };
  },
  mounted() {
    this.sessionStartTime = new Date(); // Mark session start time
    this.loadPlantDetails();
    if (!this.plantId) {
      notify.error("Missing plantId. Please open from a plant card.");
      this.$router.push("/mydiary");
    } else {
      this.watchUploads();
    }
  },
  methods: {
    loadPlantDetails() {
      if (this.$route.query.plantName)
        this.plantName = this.$route.query.plantName;
      if (this.$route.query.plantId) this.plantId = this.$route.query.plantId;
    },

    watchUploads() {
      const db = getFirestore();
      const uploadsRef = collection(db, "plants", this.plantId, "uploads");
      onSnapshot(uploadsRef, (snapshot) => {
        this.uploads = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        this.filterSessionUploads();
        this.computeSummary();
      });
    },

    // Filter uploads to only include those from current session
    filterSessionUploads() {
      if (!this.sessionStartTime) {
        this.sessionUploads = [];
        return;
      }
      this.sessionUploads = this.uploads.filter(upload => {
        const uploadTime = upload.timestamp?.toDate?.() || new Date(0);
        return uploadTime >= this.sessionStartTime;
      });
    },

    // 🔸 Push a phone-scan summary up to the plant document
    async writeSummaryToPlant(counts) {
      const db = getFirestore();
      const plantRef = doc(db, "plants", this.plantId);

      const totalDone = counts.ripe + counts.unripe + counts.overripe;
      const hasPending = counts.pending > 0;

      let status = "Not yet scanned";
      let statusAlert = "Scan to check status";

      if (hasPending && totalDone === 0) {
        status = "Scanning…";
        statusAlert = "Analyzing phone photos";
      } else if (hasPending && totalDone > 0) {
        status = "Scanning…";
        statusAlert = `Partial results: ${totalDone} analyzed, ${counts.pending} pending`;
      } else if (!hasPending && totalDone > 0) {
        status = "Scan complete";
        statusAlert = `Ripe ${counts.ripe}, Unripe ${counts.unripe}, Overripe ${counts.overripe}`;
      }

      await updateDoc(plantRef, {
        last_scan_time: serverTimestamp(),
        status,
        status_alert: statusAlert,
        ripeCount: counts.ripe,
        unripeCount: counts.unripe,
        overripeCount: counts.overripe,
        lastScanSource: "phone",
      });
    },

    async computeSummary() {
      const counts = { ripe: 0, unripe: 0, overripe: 0, pending: 0 };
      // Only count session uploads for display
      for (const u of this.sessionUploads) {
        if (u.status === "ripe") counts.ripe++;
        else if (u.status === "unripe") counts.unripe++;
        else if (u.status === "overripe") counts.overripe++;
        else counts.pending++;
      }
      this.summary = counts;

      // Compute across all uploads for plant doc
      const allCounts = { ripe: 0, unripe: 0, overripe: 0, pending: 0 };
      for (const u of this.uploads) {
        if (u.status === "ripe") allCounts.ripe++;
        else if (u.status === "unripe") allCounts.unripe++;
        else if (u.status === "overripe") allCounts.overripe++;
        else allCounts.pending++;
      }

      if (this.sessionUploads.length > 0) {
        try {
          await this.writeSummaryToPlant(allCounts);
        } catch (e) {
          console.error("Failed to update plant summary:", e);
        }
      }
    },

    triggerFileInput() { this.$refs.fileInput.click(); },
    handleFileSelect(e) {
      const files = Array.from(e.target.files || []);
      this.addFiles(files);
      e.target.value = "";
    },
    handleDrop(e) {
      e.preventDefault();
      this.isDragOver = false;
      const files = Array.from(e.dataTransfer.files || []);
      this.addFiles(files);
    },
    addFiles(files) {
      const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      const accepted = [];
      for (const f of files) {
        if (!validTypes.includes(f.type)) {
          notify.error(`Unsupported: ${f.name}. Use JPG/PNG/WEBP.`);
          continue;
        }
        if (f.size > 10 * 1024 * 1024) {
          notify.error(`Too large: ${f.name}. Max 10MB.`);
          continue;
        }
        accepted.push(f);
      }
      if (!accepted.length) return;

      for (const f of accepted) {
        this.selectedImages.push(f);
        const reader = new FileReader();
        reader.onload = (ev) => this.imagePreviews.push(ev.target.result);
        reader.readAsDataURL(f);
      }
      notify.info(`${accepted.length} photo(s) added`);
    },
    removeAt(idx) {
      this.selectedImages.splice(idx, 1);
      this.imagePreviews.splice(idx, 1);
    },

    // ⬇️ The only real functional change: use the unified uploader
    async uploadPhotos() {
      if (!this.selectedImages.length || !this.plantId) return;
      this.uploading = true;
      this.uploadProgress = 0;

      try {
        for (let i = 0; i < this.selectedImages.length; i++) {
          const file = this.selectedImages[i];
          await uploadFromPhone(this.plantId, file);  // ✅ unified service
          this.uploadProgress = Math.round(((i + 1) / this.selectedImages.length) * 100);
        }

        notify.success(
          `${this.selectedImages.length} photo(s) uploaded successfully for ${this.plantName}!`
        );
      } catch (err) {
        console.error("❌ Upload failed:", err);
        notify.error(err?.message || "Upload failed. Please try again.");
      } finally {
        this.uploading = false;
        this.uploadProgress = 0;
      }
    },

    goBack() { this.$router.push("/mydiary"); },
    viewPhotos() {
      this.$router.push({
        path: '/photolist',
        query: { plantId: this.plantId, plantName: this.plantName }
      });
    },
  },
};
</script>

<style scoped>
/* ——— your styles kept as-is ——— */
.page-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #8ab58a 0%, #a8d4a8 100%);
  color: #fff;
  padding: 24px;
  position: relative;
  overflow-x: hidden;
}
.page-content {
  background: #fff;
  color: #2c3e50;
  border-radius: 20px;
  padding: 32px 28px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  width: 100%;
  max-width: 760px;
  margin: 0 auto 32px;
}
.back-button {
  position: relative !important;
  top: 0 !important;
  left: 0 !important;
  transform: none !important;
  z-index: auto !important;
  width: 44px;
  height: 44px;
  background: #fff;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.15);
  cursor: pointer;
}
.back-button i { font-size: 20px; color: #2e7d32; }
.plant-name { font-size: 1.25rem; font-weight: 500; color: #f3ecec; margin: 0.5rem 0; text-align: left; }
.upload-section { margin-bottom: 30px; }
.upload-area {
  border: 3px dashed #d0d7cf; border-radius: 20px; padding: 40px 20px; text-align: center;
  background: rgba(250, 250, 250, 0.9); min-height: 250px; display: flex; align-items: center; justify-content: center;
  transition: all 0.3s ease;
}
.upload-area:hover { border-color: #8ab58a; background: #fff; transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.08); }
.upload-area.drag-over { border-color: #2e7d32; background: rgba(46,125,50,0.08); transform: scale(1.01); }
.upload-area.has-image { padding: 20px; }
.upload-content { display: flex; flex-direction: column; align-items: center; gap: 16px; }
.upload-icon { font-size: 48px; color: #8ab58a; }
.upload-content h3 { font-size: 24px; font-weight: 700; color: #2c3e50; margin: 0; }
.upload-content p { font-size: 16px; color: #6b7b8a; margin: 0; }
.supported-formats { font-size: 14px; color: #95a5a6; }
.thumb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; width: 100%; }
.thumb { position: relative; border-radius: 12px; overflow: hidden; aspect-ratio: 1/1; box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12); }
.thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.thumb-remove { position: absolute; top: 6px; right: 6px; border: none; background: rgba(255,255,255,0.9); width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.thumb-remove:hover { background: #fff; }
.upload-progress-section { margin-bottom: 30px; }
.progress-card { background: #fff; border-radius: 20px; padding: 24px; box-shadow: 0 8px 25px rgba(0,0,0,0.08); border-left: 4px solid #2e7d32; }
.progress-card h3 { font-size: 20px; font-weight: 800; margin: 0 0 16px; color: #1f2d3a; display: flex; align-items: center; }
.progress-card h3 i { margin-right: 10px; color: #2e7d32; }
.progress-bar { width: 100%; height: 8px; background: #ecf0f1; border-radius: 4px; overflow: hidden; margin-bottom: 8px; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #8ab58a, #2e7d32); transition: width 0.2s ease; border-radius: 4px; }
.progress-text { font-size: 14px; color: #6b7b8a; font-weight: 600; }
.action-buttons { display: flex; gap: 12px; margin-top: auto; padding-top: 16px; }
.btn-secondary, .btn-primary { flex: 1; padding: 14px 18px; border: none; border-radius: 12px; font-weight: 800; font-size: 16px; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: 0.25s; }
.btn-secondary { background: rgba(127,140,141,0.12); color: #6b7b8a; }
.btn-secondary:hover { background: rgba(127,140,141,0.22); transform: translateY(-2px); }
.btn-primary { background: linear-gradient(135deg, #8ab58a, #2e7d32); color: #fff; }
.btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(46,125,50,0.28); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.view-photos-section { text-align: center; margin-top: 24px; padding: 20px; background: rgba(138,181,138,0.08); border-radius: 16px; border: 2px dashed rgba(138,181,138,0.3); }
.btn-view-photos { background: linear-gradient(135deg, #6c8e6c, #4a7c4a); color: #fff; border: none; border-radius: 12px; padding: 14px 24px; font-size: 16px; font-weight: 700; display: inline-flex; align-items: center; gap: 10px; cursor: pointer; transition: all .3s ease; box-shadow: 0 6px 20px rgba(108,142,108,.3); }
.btn-view-photos:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(108,142,108,.4); background: linear-gradient(135deg, #4a7c4a, #6c8e6c); }
.view-photos-hint { margin: 12px 0 0 0; font-size: 14px; color: #6b7b8a; font-style: italic; }
.session-results { margin-top: 32px; padding: 24px; background: rgba(138,181,138,0.05); border-radius: 16px; border: 2px solid rgba(138,181,138,0.2); }
.session-results h3 { font-size: 24px; font-weight: 700; color: #2c3e50; margin: 0 0 20px 0; text-align: center; }
.session-uploads { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
.upload-result { background: #fff; border-radius: 12px; padding: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); transition: transform .2s ease; }
.upload-result:hover { transform: translateY(-2px); }
.result-thumb { width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 12px; }
.upload-info { text-align: center; }
.status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 8px; }
.status-badge.ripe { background: #4caf50; color: #fff; }
.status-badge.unripe { background: #ff9800; color: #fff; }
.status-badge.overripe { background: #f44336; color: #fff; }
.status-badge.pending { background: #9e9e9e; color: #fff; }
.analysis-details { font-size: 14px; color: #6b7b8a; }
.analysis-details p { margin: 4px 0; font-weight: 600; }
</style>
