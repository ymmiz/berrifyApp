<template>
  <div class="admin-dashboard">
    <!-- Auth guard -->
    <div v-if="!isAuthenticated" class="auth-guard">
      <div class="auth-message">
        <h2>🔐 Admin Authentication Required</h2>
        <p>Please sign in to access the admin dashboard.</p>
        <button @click="signInWithGoogle" class="sign-in-btn" :disabled="signingIn">
          {{ signingIn ? 'Signing in...' : 'Sign in with Google' }}
        </button>
      </div>
    </div>

    <!-- Permission guard -->
    <div v-else-if="!isAdmin" class="permission-guard">
      <div class="permission-message">
        <h2>⚠️ Access Denied</h2>
        <p>You don't have admin privileges. Contact the system administrator.</p>
        <button @click="signOut" class="sign-out-btn">Sign Out</button>
      </div>
    </div>

    <!-- Main dashboard -->
    <div v-else>
      <div class="dashboard-header">
        <div class="header-content">
          <div>
            <h1>Admin User Dashboard</h1>
            <p>Manage users and monitor plant cultivation activities</p>
          </div>
          <div class="user-info">
            <span>Welcome, {{ currentUser?.displayName || currentUser?.email }}</span>
            <button @click="signOut" class="sign-out-btn">Sign Out</button>
          </div>
        </div>

        <div class="connection-status">
          <span :class="['status-indicator', connectionStatus]">{{ connectionStatusText }}</span>
          <div v-if="loading" class="loading-spinner">
            <div class="spinner"></div>
            <span>Loading data from Firebase...</span>
          </div>
        </div>
      </div>

      <div v-if="lastError" class="error-banner">
        <span>⚠️ {{ lastError }}</span>
        <button @click="lastError = null" class="close-error">×</button>
      </div>

      <div class="tab-navigation">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="['tab-btn', { active: activeTab === tab.id }]"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Users tab -->
      <div v-if="activeTab === 'users'" class="tab-content">
        <div class="user-list-view">
          <div class="table-header">
            <h2>User Management</h2>
            <div class="header-actions">
              <input v-model="searchQuery" placeholder="Search users..." class="search-input" />
              <select v-model="userSortBy" class="filter-select">
                <option value="name">Sort by Name</option>
                <option value="harvest">Sort by Strawberries Harvested</option>
                <option value="joinDate">Sort by Join Date</option>
                <option value="lastActive">Sort by Last Active</option>
              </select>
              <button class="refresh-btn" @click="loadUsersData" :disabled="loading">
                🔄 {{ loading ? 'Loading...' : 'Refresh' }}
              </button>
            </div>
          </div>

          <div class="data-table">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Device</th>
                  <th>Plant Count</th>
                  <th>Strawberries Harvested</th>
                  <th>Status</th>
                  <th>Join Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="sortedUsers.length === 0">
                  <td colspan="7" class="empty-state">
                    {{ loading ? 'Loading users...' : 'No users found' }}
                  </td>
                </tr>

                <tr v-for="user in sortedUsers" :key="user.id">
                  <td class="user-cell">
                    <div class="user-info">
                      <div class="user-name">
                        {{ user.name || 'Unknown' }}
                        <span v-if="adminsMap.get(user.id) === true" class="badge-admin">ADMIN</span>
                      </div>
                      <div class="user-email">{{ user.email || 'No email' }}</div>
                    </div>
                  </td>
                  <td>
                    <div class="device-info">
                      <span class="device-icon">
                        {{ user.device === "Raspberry Pi" ? "🥧" : (user.device === "Phone" ? "📱" : "🧩") }}
                      </span>
                      {{ user.device || 'Unknown' }}
                    </div>
                  </td>
                  <td><span class="plant-count">{{ user.plantCount || 0 }}</span></td>
                  <td><span class="harvest-total">{{ user.totalHarvest || 0 }}</span></td>
                  <td>
                    <span :class="['status-badge', (user.status || 'unknown').toLowerCase()]">
                      {{ user.status || 'Unknown' }}
                    </span>
                  </td>
                  <td>{{ formatDate(user.joinDate) }}</td>
                  <td>
                    <div class="action-buttons">
                      <button class="action-btn view" @click="openUserDetails(user)">👁️ Details</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Details Modal -->
          <div v-if="showDetails" class="modal-backdrop" @click.self="closeUserDetails">
            <div class="modal-card" role="dialog" aria-modal="true">
              <div class="modal-header">
                <h3>User Details</h3>
                <button class="modal-close" @click="closeUserDetails">×</button>
              </div>

              <div class="modal-body">
                <div class="info-grid">
                  <div><strong>Name:</strong> {{ detailUser?.name || 'Unknown' }}</div>
                  <div><strong>Email:</strong> {{ detailUser?.email || 'No email' }}</div>
                  <div><strong>Device:</strong> {{ detailUser?.device || 'Unknown' }}</div>
                  <div><strong>Status:</strong> {{ detailUser?.status || 'Unknown' }}</div>
                  <div><strong>Join Date:</strong> {{ formatDate(detailUser?.joinDate) }}</div>
                  <div><strong>Last Active:</strong> {{ formatDate(detailUser?.lastActive) }}</div>
                  <div><strong>Plant Count:</strong> {{ selectedUserPlants.length }}</div>
                  <div><strong>Total Harvest Records:</strong> {{ selectedUserHarvests.length }}</div>
                </div>

                <hr />

                <h4>Plants ({{ selectedUserPlants.length }})</h4>
                <div v-if="selectedUserPlants.length === 0" class="muted">No plants found</div>
                <div class="plants-grid" v-else>
                  <div v-for="p in selectedUserPlants" :key="p.id" class="plant-card">
                    <div class="plant-name">{{ p.name || 'Unnamed Plant' }}</div>
                    <div class="plant-details">
                      <div>Mode: {{ p.mode || 'phone' }}</div>
                      <div>Status: {{ p.status || 'Unknown' }}</div>
                      <div>Last Scan: {{ formatDate(p.last_scan_time || p.lastScanTime) }}</div>
                    </div>
                  </div>
                </div>

                <h4 style="margin-top:16px;">Harvests ({{ selectedUserHarvests.length }})</h4>
                <div v-if="selectedUserHarvests.length === 0" class="muted">No harvests found</div>
                <div class="harvests-table" v-else>
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Plant</th>
                        <th>Yield</th>
                        <th>Quality</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="h in selectedUserHarvests" :key="h.id">
                        <td>{{ formatDate(h.date) }}</td>
                        <td>{{ h.plantName || 'Unknown' }}</td>
                        <td>{{ h.yield ?? 0 }}</td>
                        <td>{{ h.quality || 'Unknown' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="modal-footer">
                <button class="btn" @click="closeUserDetails">Close</button>
              </div>
            </div>
          </div>
          <!-- /Details Modal -->
        </div>
      </div>

      <!-- Harvest tab -->
      <div v-if="activeTab === 'harvests'" class="tab-content">
        <div class="table-header">
          <h2>Harvest Records</h2>
          <div class="header-actions">
            <input type="date" v-model="harvestDateFilter" class="date-input" />
            <button class="refresh-btn" @click="loadHarvestsData" :disabled="loading">
              🔄 {{ loading ? 'Loading...' : 'Refresh' }}
            </button>
          </div>
        </div>

        <div class="data-table">
          <table>
            <thead>
              <tr>
                <th>Harvest Date</th>
                <th>Plant</th>
                <th>Owner</th>
                <th>Strawberries</th>
                <th>Quality</th>
                <th>Growth Duration</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredHarvests.length === 0">
                <td colspan="7" class="empty-state">
                  {{ loading ? 'Loading harvests...' : 'No harvest records found' }}
                </td>
              </tr>
              <tr v-for="harvest in filteredHarvests" :key="harvest.id">
                <td>{{ formatDate(harvest.date) }}</td>
                <td>{{ harvest.plantName || 'Unknown' }}</td>
                <td>{{ harvest.owner || 'Unknown' }}</td>
                <td><strong>{{ harvest.yield || 0 }}</strong></td>
                <td>
                  <span :class="['quality-badge', (harvest.quality || 'unknown').toLowerCase()]">
                    {{ harvest.quality || 'Unknown' }}
                  </span>
                </td>
                <td>{{ harvest.growthDuration || 0 }} days</td>
                <td>
                  <div class="action-buttons">
                    <button class="action-btn view" @click="viewHarvestDetails(harvest)">👁️</button>
                    <button class="action-btn edit" @click="editHarvest(harvest)">✏️</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <!-- /Harvest tab -->
    </div>
  </div>
</template>

<script>
import "../styles/AdminPage.css";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { ensureUserDoc } from "@/scripts/userService";
import {
  checkAdminStatus,
  testFirebaseConnection,
  getAllUsers,
  getAllPlants,
  getAllHarvests,
  getAllAdmins,
  setupUsersListener,
  setupPlantsListener,
  setupAdminsListener,
  formatFirebaseError,
  getUserPlants as getPlantsByUser,
  getUserHarvests as getHarvestsByUser,
  isUserAdmin,
} from "@/scripts/adminService";

export default {
  name: "AdminDashboard",
  data() {
    return {
      // Auth
      isAuthenticated: false,
      currentUser: null,
      isAdmin: false,
      signingIn: false,

      // Connection
      connectionStatus: "unknown",
      lastError: null,

      // UI
      activeTab: "users",
      searchQuery: "",
      userSortBy: "harvest",
      harvestDateFilter: "",
      loading: false,
      tabs: [
        { id: "users", label: "User Management" },
        { id: "harvests", label: "Harvest Records" },
      ],

      // Data
      users: [],
      plants: [],
      harvests: [],
      adminsMap: new Map(),

      // Unsubs
      unsubscribeUsers: null,
      unsubscribeHarvests: null,
      unsubscribePlants: null,
      unsubscribeAdmins: null,

      // Details modal state
      showDetails: false,
      detailUser: null,
    };
  },

  computed: {
    connectionStatusText() {
      switch (this.connectionStatus) {
        case "connected":
          return "🟢 Connected to Firebase";
        case "error":
          return "🔴 Connection Error";
        default:
          return "🟡 Checking Connection...";
      }
    },

    filteredUsers() {
      const base = (this.users || []).filter((u) => !this.isUserAdminCheck(u.id));
      const q = (this.searchQuery || "").toLowerCase();
      if (!q) return base;
      return base.filter(
        (u) =>
          (u.name || "").toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q)
      );
    },

    sortedUsers() {
      const users = [...this.filteredUsers];
      switch (this.userSortBy) {
        case "harvest":
          return users.sort((a, b) => (b.totalHarvest || 0) - (a.totalHarvest || 0));
        case "name":
          return users.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        case "joinDate":
          return users.sort(
            (a, b) => new Date(a.joinDate || 0) - new Date(b.joinDate || 0)
          );
        case "lastActive":
          return users.sort(
            (a, b) => new Date(b.lastActive || 0) - new Date(a.lastActive || 0)
          );
        default:
          return users;
      }
    },

    filteredHarvests() {
      if (!this.harvestDateFilter) return this.harvests;
      return this.harvests.filter(
        (h) => this.formatDateISO(h.date) === this.harvestDateFilter
      );
    },

    selectedUserPlants() {
      if (!this.detailUser) return [];
      return this.getUserPlants(this.detailUser);
    },
    selectedUserHarvests() {
      if (!this.detailUser) return [];
      return this.getUserHarvests(this.detailUser);
    },
  },

  async mounted() {
    this.setupAuthListener();
  },

  beforeUnmount() {
    this.cleanupListeners();
  },

  methods: {
    /* Auth */
    setupAuthListener() {
      const auth = getAuth();
      onAuthStateChanged(auth, async (user) => {
        this.currentUser = user;
        this.isAuthenticated = !!user;

        if (user) {
          await ensureUserDoc(user.uid);
          // checkAdminStatus may return boolean; that's enough here
          this.isAdmin = !!(await checkAdminStatus());
          if (this.isAdmin) await this.initializeAdminDashboard();
        } else {
          this.isAdmin = false;
          this.cleanupListeners();
        }
      });
    },

    async signInWithGoogle() {
      this.signingIn = true;
      try {
        const auth = getAuth();
        await signInWithPopup(auth, new GoogleAuthProvider());
      } catch (e) {
        this.showError("Sign in failed: " + e.message);
      } finally {
        this.signingIn = false;
      }
    },

    async signOut() {
      try {
        const auth = getAuth();
        await firebaseSignOut(auth);
      } catch (e) {
        this.showError("Sign out failed: " + e.message);
      }
    },

    /* Init */
    async initializeAdminDashboard() {
      const ok = await testFirebaseConnection();
      this.connectionStatus = ok ? "connected" : "error";
      if (!ok) return;

      await this.loadAllData();
      this.setupRealtimeListeners();
    },

    cleanupListeners() {
      if (this.unsubscribeUsers) this.unsubscribeUsers();
      if (this.unsubscribePlants) this.unsubscribePlants();
      if (this.unsubscribeAdmins) this.unsubscribeAdmins();
      if (this.unsubscribeHarvests) this.unsubscribeHarvests();

      this.users = [];
      this.plants = [];
      this.harvests = [];
      this.adminsMap = new Map();
    },

    /* Loading */
    async loadAllData() {
      this.loading = true;
      try {
        const [users, plants, harvests, admins] = await Promise.all([
          getAllUsers(),
          getAllPlants(),
          getAllHarvests(),
          getAllAdmins(),
        ]);
        this.users = users;
        this.plants = plants;
        this.harvests = harvests;
        this.adminsMap = admins;

        this.recomputeUserAggregates();
        this.lastError = null;
      } catch (e) {
        this.handleError(e);
      } finally {
        this.loading = false;
      }
    },

    async loadUsersData() {
      this.loading = true;
      try {
        this.users = await getAllUsers();
        this.recomputeUserAggregates();
        this.lastError = null;
      } catch (e) {
        this.handleError(e);
      } finally {
        this.loading = false;
      }
    },

    async loadHarvestsData() {
      this.loading = true;
      try {
        this.harvests = await getAllHarvests();
      } catch (e) {
        this.handleError(e);
      } finally {
        this.loading = false;
      }
    },

    setupRealtimeListeners() {
      try {
        this.unsubscribeUsers = setupUsersListener((users) => {
          this.users = users;
          this.recomputeUserAggregates();
        });
        this.unsubscribePlants = setupPlantsListener((plants) => {
          this.plants = plants;
          this.recomputeUserAggregates();
        });
        this.unsubscribeAdmins = setupAdminsListener((admins) => {
          this.adminsMap = admins;
        });
      } catch (e) {
        this.handleError(e);
      }
    },

    /* Aggregates: plantCount + device */
    recomputeUserAggregates() {
      const agg = new Map(); // uid -> { count, hasPhone, hasHardware }

      for (const p of this.plants || []) {
        const uid = p.ownerId || p.user_id || p.userId;
        if (!uid) continue;

        const entry = agg.get(uid) || {
          count: 0,
          hasPhone: false,
          hasHardware: false,
        };
        entry.count += 1;

        const m = String(p.mode || "").toLowerCase();
        if (/(hardware|pi|rasp)/.test(m)) entry.hasHardware = true;
        if (/(phone|mobile|camera)/.test(m)) entry.hasPhone = true;

        agg.set(uid, entry);
      }

      this.users = (this.users || []).map((u) => {
        const a = agg.get(u.id) || {
          count: 0,
          hasPhone: false,
          hasHardware: false,
        };
        let device = u.device || "Unknown";
        if (a.hasHardware) device = "Raspberry Pi";
        else if (a.hasPhone) device = "Phone";
        return { ...u, plantCount: a.count, device };
      });
    },

    /* Details modal */
    openUserDetails(user) {
      const fresh = this.users.find((x) => x.id === user.id) || user;
      this.detailUser = fresh;
      this.showDetails = true;
      document.documentElement.style.overflow = "hidden";
    },
    closeUserDetails() {
      this.showDetails = false;
      this.detailUser = null;
      document.documentElement.style.overflow = "";
    },

    /* Helpers */
    formatDate(d) {
      if (!d) return "N/A";
      const dt = d instanceof Date ? d : new Date(d);
      return isNaN(dt) ? "N/A" : dt.toLocaleDateString();
    },
    formatDateISO(d) {
      if (!d) return "";
      const dt = d instanceof Date ? d : new Date(d);
      return isNaN(dt) ? "" : dt.toISOString().split("T")[0];
    },

    isUserAdminCheck(uid) {
      // Keep admins visible in the table; return true here if you want to hide them
      return isUserAdmin(uid, this.adminsMap, this.currentUser) && false;
    },

    getUserPlants(user) {
      return getPlantsByUser(user, this.plants);
    },
    getUserHarvests(user) {
      return getHarvestsByUser(user, this.harvests);
    },

    handleError(error) {
      const message = formatFirebaseError(error);
      this.lastError = message;
      this.connectionStatus = "error";
      console.error(error);
    },

    showError(message) {
      this.lastError = message;
    },

    showSuccess(message) {
      alert(message);
    },

    /* UI stubs */
    viewHarvestDetails(h) {
      console.log("View harvest:", h);
    },
    editHarvest(h) {
      console.log("Edit harvest:", h);
    },
  },
};
</script>

<style scoped>
/* Keep your existing AdminPage.css styles loaded; only essentials here */

.badge-admin {
  margin-left: 8px;
  padding: 2px 6px;
  font-size: 12px;
  border-radius: 6px;
  background: #e9f5ff;
  color: #0369a1;
  border: 1px solid #bae6fd;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.35);
  display: grid;
  place-items: center;
  z-index: 1000;
}

.modal-card {
  width: min(900px, 92vw);
  max-height: 85vh;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 10px 30px rgba(0,0,0,.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #333;
}

.modal-header, .modal-footer {
  padding: 12px 16px;
  background: #f7f7f7;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #333;
}

.modal-body {
  padding: 16px;
  overflow: auto;
  color: #333;
}

.modal-close {
  border: none;
  background: transparent;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  color: #333;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0,1fr));
  gap: 8px 16px;
  margin-bottom: 8px;
  color: #333;
}

.plants-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.plant-card {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 10px;
  background: #fafafa;
  color: #333;
}

.plant-name {
  font-weight: 600;
  color: #000;
  margin-bottom: 4px;
}

.plant-details { color: #555; }

.muted { color: #000; font-weight: 500; }

.btn {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #fff;
  cursor: pointer;
  color: #333;
}

.harvests-table th {
  background: #f8f9fa;
  color: #333 !important;
  font-weight: 600;
}
.harvests-table td { color: #333 !important; }
</style>
