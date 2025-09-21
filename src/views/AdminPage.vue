<template>
  <div class="admin-dashboard">
    <!-- Auth -->
    <div v-if="!isAuthenticated" class="auth-guard">
      <div class="auth-message">
        <h2>🔐 Admin Authentication Required</h2>
        <p>Please sign in to access the admin dashboard.</p>
        <button @click="signInWithGoogle" class="sign-in-btn" :disabled="signingIn">
          {{ signingIn ? 'Signing in...' : 'Sign in with Google' }}
        </button>
      </div>
    </div>

    <!-- No admin -->
    <div v-else-if="!isAdmin" class="permission-guard">
      <div class="permission-message">
        <h2>⚠️ Access Denied</h2>
        <p>You don't have admin privileges. Contact the system administrator.</p>
        <button @click="signOut" class="sign-out-btn">Sign Out</button>
      </div>
    </div>

    <!-- Main -->
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

                <tr v-for="user in sortedUsers" :key="user.id || user.uid">
                  <td class="user-cell">
                    <div class="user-info">
                      <div class="user-name">
                        {{ user.name || 'Unknown' }}
                        <span v-if="adminsMap.get(user.id || user.uid) === true" class="badge-admin">ADMIN</span>
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
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="h in selectedUserHarvests" :key="h.id">
                        <td>{{ formatDate(h.date) }}</td>
                        <td>{{ h.plantName || 'Unknown' }}</td>
                        <td>{{ getCount(h) }}</td>
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

      <!-- Harvests tab -->
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
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredHarvests.length === 0">
                <td colspan="4" class="empty-state">
                  {{ loading ? 'Loading harvests...' : 'No harvest records found' }}
                </td>
              </tr>
              <tr v-for="harvest in filteredHarvests" :key="harvest.id">
                <td>{{ formatDate(harvest.date) }}</td>
                <td>{{ harvest.plantName || 'Unknown' }}</td>
                <td>{{ harvest.owner || 'Unknown' }}</td>
                <td><strong>{{ getCount(harvest) }}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <!-- /Harvests tab -->
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

      // Connection/UI
      connectionStatus: "unknown",
      lastError: null,
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

      // Listeners
      unsubscribeUsers: null,
      unsubscribeHarvests: null,
      unsubscribePlants: null,
      unsubscribeAdmins: null,

      // Details modal
      showDetails: false,
      detailUser: null,
    };
  },

  computed: {
    connectionStatusText() {
      switch (this.connectionStatus) {
        case "connected": return "🟢 Connected to Firebase";
        case "error": return "🔴 Connection Error";
        default: return "🟡 Checking Connection...";
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
        case "harvest": return users.sort((a,b)=>(b.totalHarvest||0)-(a.totalHarvest||0));
        case "name": return users.sort((a,b)=>(a.name||"").localeCompare(b.name||""));
        case "joinDate": return users.sort((a,b)=>new Date(a.joinDate||0)-new Date(b.joinDate||0));
        case "lastActive": return users.sort((a,b)=>new Date(b.lastActive||0)-new Date(a.lastActive||0));
        default: return users;
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
    /* ---------- Auth ---------- */
    setupAuthListener() {
      const auth = getAuth();
      onAuthStateChanged(auth, async (user) => {
        this.currentUser = user;
        this.isAuthenticated = !!user;

        if (user) {
          await ensureUserDoc(user.uid);
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

    /* ---------- Init ---------- */
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

    /* ---------- Loading ---------- */
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
        this.harvests = this.normalizeHarvests(harvests); // keep quality if present, just don't render
        this.adminsMap = admins;

        this.updateHarvestOwners();
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
        this.updateHarvestOwners();
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
        this.harvests = this.normalizeHarvests(await getAllHarvests());
        this.updateHarvestOwners();
        this.recomputeUserAggregates();
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
          this.updateHarvestOwners();
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

    /* ---------- Aggregates & helpers ---------- */
    // Read "count" only for UI (preserves 0; supports nested data.count)
    getCount(h) {
      const vals = [h?.count, h?.data?.count];
      for (const v of vals) {
        if (v === 0) return 0;
        if (v == null) continue;
        const n = typeof v === "string" ? parseFloat(v) : v;
        if (Number.isFinite(n)) return n;
      }
      return 0;
    },

    recomputeUserAggregates() {
      // plants
      const plantAgg = new Map(); // uid -> { count, hasPhone, hasHardware }
      for (const p of this.plants || []) {
        const uid = p.ownerId || p.user_id || p.userId;
        if (!uid) continue;
        const entry = plantAgg.get(uid) || { count: 0, hasPhone: false, hasHardware: false };
        entry.count += 1;
        const m = String(p.mode || "").toLowerCase();
        if (/(hardware|pi|rasp)/.test(m)) entry.hasHardware = true;
        if (/(phone|mobile|camera)/.test(m)) entry.hasPhone = true;
        plantAgg.set(uid, entry);
      }

      // harvest totals (count-only for UI)
      const harvestAgg = new Map();
      for (const h of this.harvests || []) {
        const uid = h.user_id || h.owner_uid || h.userId || h?.data?.user_id || h?.data?.userId;
        if (!uid) continue;
        const qty = this.getCount(h);
        harvestAgg.set(uid, (harvestAgg.get(uid) || 0) + qty);
      }

      // merge into users (key by id || uid)
      this.users = (this.users || []).map((u) => {
        const key = u.id || u.uid;
        const p = plantAgg.get(key) || { count: 0, hasPhone: false, hasHardware: false };
        const t = harvestAgg.get(key) || 0;
        let device = u.device || "Unknown";
        if (p.hasHardware) device = "Raspberry Pi";
        else if (p.hasPhone) device = "Phone";
        return { ...u, plantCount: p.count, device, totalHarvest: t };
      });
    },

    /* ---------- Details modal ---------- */
    openUserDetails(user) {
      const fresh = this.users.find((x) => (x.id || x.uid) === (user.id || user.uid)) || user;
      this.detailUser = fresh;
      this.showDetails = true;
      document.documentElement.style.overflow = "hidden";
    },
    closeUserDetails() {
      this.showDetails = false;
      this.detailUser = null;
      document.documentElement.style.overflow = "";
    },

    /* ---------- Utils ---------- */
    formatDate(d) {
      if (!d) return "N/A";
      const dt = d?.toDate ? d.toDate() : (d instanceof Date ? d : new Date(d));
      return isNaN(dt) ? "N/A" : dt.toLocaleDateString();
    },
    formatDateISO(d) {
      if (!d) return "";
      const dt = d?.toDate ? d.toDate() : (d instanceof Date ? d : new Date(d));
      return isNaN(dt) ? "" : dt.toISOString().split("T")[0];
    },

    ownerNameByUid(uid) {
      if (!uid) return "Unknown Owner";
      const users = this.users || [];
      const u = users.find((x) => x.id === uid || x.uid === uid);
      if (u) return u.name || u.displayName || u.email || "Unknown Owner";
      const short = String(uid).slice(0, 6);
      return `Unknown Owner (${short}…)`;
    },

    // Normalize raw harvest docs (keep whatever DB has; UI will ignore quality)
    normalizeHarvests(raw = []) {
      const pick = (obj, ...paths) => {
        for (const p of paths) {
          try {
            const val = p.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
            if (val !== undefined) return val;
          } catch (_) {}
        }
        return undefined;
      };
      const asDate = (v) => (v?.toDate ? v.toDate() : v);

      return (raw || []).map((h) => {
        const data = h?.data ? h.data : h;
        const snapData = typeof h?.payload?.doc?.data === "function" ? h.payload.doc.data() : null;

        const date = asDate(
          pick(h, "date", "harvestedAt") ??
          pick(data, "date", "harvestedAt") ??
          pick(snapData || {}, "date", "harvestedAt")
        );

        const ownerUid =
          pick(h, "user_id", "userId", "owner_uid") ??
          pick(data, "user_id", "userId", "owner_uid") ??
          pick(snapData || {}, "user_id", "userId", "owner_uid") ??
          null;

        const plantName =
          pick(h, "plantName") ??
          pick(data, "plantName") ??
          pick(snapData || {}, "plantName") ?? "Unknown";

        // We keep count/yield/strawberries in memory but will only *display* count via getCount()
        const count =
          (typeof pick(h, "count") === "number" ? pick(h, "count") : undefined) ??
          (typeof pick(data, "count") === "number" ? pick(data, "count") : undefined) ??
          (typeof pick(snapData || {}, "count") === "number" ? pick(snapData || {}, "count") : undefined) ??
          // fallback to other fields if no count (so totals/UI can still compute getCount() later)
          (typeof pick(h, "yield") === "number" ? pick(h, "yield") : undefined) ??
          (typeof pick(data, "yield") === "number" ? pick(data, "yield") : undefined) ??
          (typeof pick(snapData || {}, "yield") === "number" ? pick(snapData || {}, "yield") : undefined) ??
          (typeof pick(h, "strawberries") === "number" ? pick(h, "strawberries") : undefined) ??
          (typeof pick(data, "strawberries") === "number" ? pick(data, "strawberries") : undefined) ??
          (typeof pick(snapData || {}, "strawberries") === "number" ? pick(snapData || {}, "strawberries") : undefined) ??
          0;

        return {
          ...(snapData || {}),
          ...(data || {}),
          ...h,
          plantName,
          date,
          user_id: ownerUid,
          owner: h.owner || this.ownerNameByUid(ownerUid),
          count
          // any 'quality' field from DB remains in memory but is never used/rendered
        };
      });
    },

    updateHarvestOwners() {
      const resolveOwner = (h) => {
        const explicit = h.owner && h.owner !== "Unknown" && h.owner !== "Unknown Owner";
        if (explicit) return h;
        const uid = h.user_id || h.owner_uid || h.userId || h?.data?.user_id || h?.data?.userId || null;
        return { ...h, owner: this.ownerNameByUid(uid) };
      };
      this.harvests = (this.harvests || []).map(resolveOwner);
    },

    isUserAdminCheck(uid) {
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

    // stubs
    viewHarvestDetails(h) { console.log("View harvest:", h); },
    editHarvest(h) { console.log("Edit harvest:", h); },
  },
};
</script>

<style scoped>
/* Keep relying on your AdminPage.css; only a few local bits here */
.badge-admin{margin-left:8px;padding:2px 6px;font-size:12px;border-radius:6px;background:#e9f5ff;color:#0369a1;border:1px solid #bae6fd}
.modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.35);display:grid;place-items:center;z-index:1000}
.modal-card{width:min(900px,92vw);max-height:85vh;background:#fff;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.2);display:flex;flex-direction:column;overflow:hidden;color:#333}
.modal-header,.modal-footer{padding:12px 16px;background:#f7f7f7;display:flex;align-items:center;justify-content:space-between;color:#333}
.modal-body{padding:16px;overflow:auto;color:#333}
.modal-close{border:none;background:transparent;font-size:20px;line-height:1;cursor:pointer;color:#333}
.info-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 16px;margin-bottom:8px;color:#333}
.plants-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}
.plant-card{border:1px solid #e5e7eb;border-radius:10px;padding:10px;background:#fafafa;color:#333}
.plant-name{font-weight:600;color:#000;margin-bottom:4px}
.plant-details{color:#555}
.muted{color:#000;font-weight:500}
.btn{padding:8px 12px;border-radius:8px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;color:#333}
.harvests-table th{background:#f8f9fa;color:#333!important;font-weight:600}
.harvests-table td{color:#333!important}
</style>
