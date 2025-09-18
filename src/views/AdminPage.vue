<template>
  <div class="admin-dashboard">
    <!-- Authentication Guard -->
    <div v-if="!isAuthenticated" class="auth-guard">
      <div class="auth-message">
        <h2>🔐 Admin Authentication Required</h2>
        <p>Please sign in to access the admin dashboard.</p>
        <button @click="signInWithGoogle" class="sign-in-btn" :disabled="signingIn">
          {{ signingIn ? 'Signing in...' : 'Sign in with Google' }}
        </button>
      </div>
    </div>

    <!-- Permission Guard -->
    <div v-else-if="!isAdmin" class="permission-guard">
      <div class="permission-message">
        <h2>⚠️ Access Denied</h2>
        <p>You don't have admin privileges. Contact the system administrator.</p>
        <button @click="signOut" class="sign-out-btn">Sign Out</button>
      </div>
    </div>

    <!-- Main Dashboard -->
    <div v-else>
      <!-- Header -->
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
        
        <!-- Connection Status -->
        <div class="connection-status">
          <span :class="['status-indicator', connectionStatus]">
            {{ connectionStatusText }}
          </span>
          <div v-if="loading" class="loading-spinner">
            <div class="spinner"></div>
            <span>Loading data from Firebase...</span>
          </div>
        </div>
      </div>

      <!-- Error Display -->
      <div v-if="lastError" class="error-banner">
        <span>⚠️ {{ lastError }}</span>
        <button @click="lastError = null" class="close-error">×</button>
      </div>

      <!-- Navigation Tabs -->
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

      <!-- User Management Tab -->
      <div v-if="activeTab === 'users'" class="tab-content">
        <!-- User List -->
        <div v-if="!selectedUser" class="user-list-view">
          <div class="table-header">
            <h2>User Management</h2>
            <div class="header-actions">
              <input
                v-model="searchQuery"
                placeholder="Search users..."
                class="search-input"
              />
              <select v-model="userSortBy" class="filter-select">
                <option value="name">Sort by Name</option>
                <option value="harvest">Sort by Strawberries Harvested</option>
                <option value="joinDate">Sort by Join Date</option>
                <option value="lastActive">Sort by Last Active</option>
              </select>
              <button class="refresh-btn" @click="loadUsersFromFirebase" :disabled="loading">
                🔄 {{ loading ? 'Loading...' : 'Refresh' }}
              </button>
            </div>
          </div>

          <!-- Users Table -->
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
                      <div class="user-name">{{ user.name || 'Unknown' }}</div>
                      <div class="user-email">{{ user.email || 'No email' }}</div>
                    </div>
                  </td>
                  <td>
                    <div class="device-info">
                      <span class="device-icon">
                        {{ user.device === "Raspberry Pi" ? "🥧" : "📱" }}
                      </span>
                      {{ user.device || 'Unknown' }}
                    </div>
                  </td>
                  <td>
                    <span class="plant-count">{{ user.plantCount || 0 }}</span>
                  </td>
                  <td>
                    <span class="harvest-total">{{ user.totalHarvest || 0 }}</span>
                  </td>
                  <td>
                    <span :class="['status-badge', (user.status || 'unknown').toLowerCase()]">
                      {{ user.status || 'Unknown' }}
                    </span>
                  </td>
                  <td>{{ formatDate(user.joinDate) }}</td>
                  <td>
                    <div class="action-buttons">
                      <button class="action-btn edit" @click="editUser(user)">
                        ✏️
                      </button>
                      <button
                        class="action-btn delete"
                        @click="deleteUser(user.id)"
                        :disabled="isUserAdmin(user.id)"
                      >
                        🗑️
                      </button>
                      <button
                        class="action-btn view"
                        @click="viewUserDetails(user)"
                      >
                        👁️ Details
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- User Details (keeping existing structure) -->
        <div v-else class="user-details-view">
          <!-- ... existing user details code ... -->
        </div>
      </div>

      <!-- Harvest Records Tab -->
      <div v-if="activeTab === 'harvests'" class="tab-content">
        <div class="table-header">
          <h2>Harvest Records</h2>
          <div class="header-actions">
            <input type="date" v-model="harvestDateFilter" class="date-input" />
            <button class="refresh-btn" @click="loadHarvestsFromFirebase" :disabled="loading">
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
                <td>
                  <strong>{{ harvest.yield || 0 }}</strong>
                </td>
                <td>
                  <span :class="['quality-badge', (harvest.quality || 'unknown').toLowerCase()]">
                    {{ harvest.quality || 'Unknown' }}
                  </span>
                </td>
                <td>{{ harvest.growthDuration || 0 }} days</td>
                <td>
                  <div class="action-buttons">
                    <button
                      class="action-btn view"
                      @click="viewHarvestDetails(harvest)"
                    >
                      👁️
                    </button>
                    <button class="action-btn edit" @click="editHarvest(harvest)">
                      ✏️
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import "../styles/AdminPage.css";
import { db } from '../firebase';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  onSnapshot
} from 'firebase/firestore';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';

export default {
  name: "AdminDashboard",
  data() {
    return {
      // Authentication
      isAuthenticated: false,
      currentUser: null,
      isAdmin: false,
      signingIn: false,
      
      // Connection
      connectionStatus: 'unknown', // 'connected', 'error', 'unknown'
      lastError: null,
      
      // Existing data
      activeTab: "users",
      selectedUser: null,
      searchQuery: "",
      userSortBy: "harvest",
      harvestDateFilter: "",
      loading: false,
      tabs: [
        { id: "users", label: "User Management" },
        { id: "harvests", label: "Harvest Records" },
      ],
      users: [],
      plants: [],
      harvests: [],
      adminsMap: new Map(),
      busyRole: false,
      unsubscribeUsers: null,
      unsubscribeHarvests: null,
      unsubscribePlants: null,
      unsubscribeAdmins: null,
    };
  },
  async mounted() {
    console.log('AdminDashboard mounted - initializing authentication...');
    this.setupAuthListener();
  },
  beforeUnmount() {
    // Clean up listeners
    if (this.unsubscribeUsers) this.unsubscribeUsers();
    if (this.unsubscribeHarvests) this.unsubscribeHarvests();
    if (this.unsubscribePlants) this.unsubscribePlants();
    if (this.unsubscribeAdmins) this.unsubscribeAdmins();
  },
  computed: {
    connectionStatusText() {
      switch (this.connectionStatus) {
        case 'connected': return '🟢 Connected to Firebase';
        case 'error': return '🔴 Connection Error';
        default: return '🟡 Checking Connection...';
      }
    },
    filteredUsers() {
      return this.users
        .filter(u => !this.isUserAdmin(u.id))
        .filter(
          (user) =>
            (user.name || '').toLowerCase().includes(this.searchQuery.toLowerCase()) ||
            (user.email || '').toLowerCase().includes(this.searchQuery.toLowerCase())
        );
    },
    sortedUsers() {
      const users = [...this.filteredUsers];
      switch (this.userSortBy) {
        case "harvest":
          return users.sort((a, b) => (b.totalHarvest || 0) - (a.totalHarvest || 0));
        case "name":
          return users.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
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
        (harvest) => this.formatDateISO(harvest.date) === this.harvestDateFilter
      );
    },
  },
  methods: {
    // ------ Authentication ------
    setupAuthListener() {
      const auth = getAuth();
      onAuthStateChanged(auth, async (user) => {
        this.currentUser = user;
        this.isAuthenticated = !!user;
        
        if (user) {
          console.log('User authenticated:', user.email);
          await this.checkAdminStatus(user.uid);
          if (this.isAdmin) {
            await this.initializeAdminDashboard();
          }
        } else {
          console.log('User signed out');
          this.isAdmin = false;
          this.cleanupListeners();
        }
      });
    },

    async signInWithGoogle() {
      this.signingIn = true;
      try {
        const auth = getAuth();
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      } catch (error) {
        console.error('Sign in failed:', error);
        this.showError('Sign in failed: ' + error.message);
      } finally {
        this.signingIn = false;
      }
    },

    async signOut() {
      try {
        const auth = getAuth();
        await firebaseSignOut(auth);
      } catch (error) {
        console.error('Sign out failed:', error);
        this.showError('Sign out failed: ' + error.message);
      }
    },

    async checkAdminStatus(uid) {
      try {
        // First check custom claims (primary method in your rules)
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
          const tokenResult = await user.getIdTokenResult();
          this.isAdmin = tokenResult.claims.admin === true;
          console.log('Admin status from custom claims:', this.isAdmin);
          
          // If not admin via custom claims, check admins collection as fallback
          if (!this.isAdmin) {
            await this.loadAdminsFromFirebase();
            this.isAdmin = this.adminsMap.get(uid) === true;
            console.log('Admin status from admins collection:', this.isAdmin);
          }
        }
      } catch (error) {
        console.error('Failed to check admin status:', error);
        this.isAdmin = false;
      }
    },

    // ------ Initialization ------
    async initializeAdminDashboard() {
      console.log('Initializing admin dashboard...');
      await this.testFirebaseConnection();
      await this.loadDataFromFirebase();
      this.setupRealtimeListeners();
    },

    cleanupListeners() {
      if (this.unsubscribeUsers) this.unsubscribeUsers();
      if (this.unsubscribeHarvests) this.unsubscribeHarvests();
      if (this.unsubscribePlants) this.unsubscribePlants();
      if (this.unsubscribeAdmins) this.unsubscribeAdmins();
      this.users = [];
      this.plants = [];
      this.harvests = [];
      this.adminsMap = new Map();
    },

    // ------ Firebase Connection ------
    async testFirebaseConnection() {
      try {
        console.log('Testing Firebase connection...');
        // Test with a simple users collection query (admins have read access)
        const usersCollection = collection(db, 'users');
        const testQuery = query(usersCollection, orderBy('joinDate', 'desc'));
        await getDocs(testQuery);
        this.connectionStatus = 'connected';
        this.lastError = null;
        console.log('Firebase connection test passed!');
        return true;
      } catch (error) {
        console.error('Firebase connection test failed:', error);
        this.connectionStatus = 'error';
        this.handleFirebaseError(error);
        return false;
      }
    },

    handleFirebaseError(error) {
      let errorMessage = 'Firebase connection failed';
      
      if (error.code === 'permission-denied') {
        errorMessage = 'Permission denied. Please check your admin privileges and Firestore security rules.';
      } else if (error.code === 'unavailable') {
        errorMessage = 'Firebase service unavailable. Please check your internet connection.';
      } else if (error.message?.includes('API key')) {
        errorMessage = 'Invalid API key. Please check your Firebase configuration.';
      } else if (error.code === 'unauthenticated') {
        errorMessage = 'Authentication required. Please sign in again.';
      }
      
      this.lastError = errorMessage;
      console.error('Firebase error:', error);
    },

    // ------ Data Loading ------
    async loadDataFromFirebase() {
      this.loading = true;
      try {
        console.log('Starting Firebase data load...');
        await Promise.all([
          this.loadUsersFromFirebase(),
          this.loadPlantsFromFirebase(),
          this.loadHarvestsFromFirebase(),
        ]);
        console.log('Firebase data load completed successfully!');
        this.lastError = null;
      } catch (error) {
        console.error('Error loading data from Firebase:', error);
        this.handleFirebaseError(error);
      } finally {
        this.loading = false;
      }
    },

    async loadUsersFromFirebase() {
      try {
        console.log('Loading users from Firebase...');
        // Use simple query first, add ordering if supported
        let usersQuery;
        try {
          usersQuery = query(collection(db, 'users'), orderBy('joinDate', 'desc'));
        } catch (e) {
          // Fallback to simple query if orderBy fails due to missing index
          console.log('OrderBy failed, using simple query:', e.message);
          usersQuery = query(collection(db, 'users'));
        }
        
        const querySnapshot = await getDocs(usersQuery);

        this.users = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || data.displayName || 'Unknown User',
            email: data.email || '',
            device: data.device || 'Unknown',
            plantCount: data.plantCount || 0,
            totalHarvest: data.totalHarvest || 0,
            status: data.status || 'Active',
            joinDate: data.joinDate?.toDate?.() || data.joinDate || new Date(),
            lastActive: data.lastActive?.toDate?.() || data.lastActive || new Date(),
            user_id: data.user_id || doc.id, // Handle both id formats
            ...data
          };
        });

        console.log('Loaded users from Firebase:', this.users.length);
      } catch (error) {
        console.error('Error loading users:', error);
        throw error;
      }
    },

    async loadPlantsFromFirebase() {
      try {
        console.log('Loading plants from Firebase...');
        const plantsQuery = query(collection(db, 'plants'));
        const querySnapshot = await getDocs(plantsQuery);

        this.plants = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || data.plant_name || 'Unnamed Plant',
            owner: data.owner || data.user_name || 'Unknown Owner',
            userId: data.user_id || data.userId,
            type: data.type || data.plant_type || 'Unknown',
            health: data.health || data.status || 'Unknown',
            daysGrowing: data.daysGrowing || data.age_days || 0,
            ...data
          };
        });

        console.log('Loaded plants from Firebase:', this.plants.length);
      } catch (error) {
        console.error('Error loading plants:', error);
        throw error;
      }
    },

    async loadHarvestsFromFirebase() {
      try {
        console.log('Loading harvests from Firebase...');
        // Try to get harvests from multiple possible sources
        let harvests = [];
        
        // First try a dedicated harvests collection
        try {
          const harvestsQuery = query(collection(db, 'harvests'));
          const harvestSnapshot = await getDocs(harvestsQuery);
          harvests = harvestSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              date: data.date?.toDate?.() || data.harvestDate?.toDate?.() || data.timestamp?.toDate?.() || new Date(),
              plantName: data.plantName || data.plant_name || 'Unknown Plant',
              owner: data.owner || data.user_name || 'Unknown Owner',
              userId: data.user_id || data.userId,
              yield: data.yield || data.amount || data.quantity || 0,
              quality: data.quality || data.grade || 'Unknown',
              growthDuration: data.growthDuration || data.growth_days || data.days_to_harvest || 0,
              ...data
            };
          });
        } catch (e) {
          console.log('No dedicated harvests collection found, trying plant subcollections...');
        }
        
        // If no harvests found, try getting from plants subcollections
        if (harvests.length === 0) {
          for (const plant of this.plants) {
            try {
              const plantHarvests = collection(db, `plants/${plant.id}/harvest_history`);
              const plantHarvestSnapshot = await getDocs(plantHarvests);
              
              plantHarvestSnapshot.docs.forEach(doc => {
                const data = doc.data();
                harvests.push({
                  id: `${plant.id}_${doc.id}`,
                  date: data.date?.toDate?.() || data.timestamp?.toDate?.() || new Date(),
                  plantName: plant.name,
                  owner: plant.owner,
                  userId: plant.userId,
                  yield: data.amount || data.yield || data.quantity || 0,
                  quality: data.quality || data.grade || 'Good',
                  growthDuration: data.growth_days || 0,
                  plantId: plant.id,
                  ...data
                });
              });
            } catch (e) {
              console.log(`No harvest history for plant ${plant.id}`);
            }
          }
        }

        this.harvests = harvests;
        console.log('Loaded harvests from Firebase:', this.harvests.length);
      } catch (error) {
        console.error('Error loading harvests:', error);
        this.harvests = []; // Don't throw, just set empty array
      }
    },

    async loadAdminsFromFirebase() {
      try {
        const adminsSnap = await getDocs(collection(db, 'admins'));
        const m = new Map();
        adminsSnap.forEach(d => {
          const data = d.data() || {};
          m.set(d.id, !!data.admin);
        });
        this.adminsMap = m;
      } catch (e) {
        console.error('Error loading admins:', e);
        this.adminsMap = new Map();
        throw e;
      }
    },

    setupRealtimeListeners() {
      try {
        // Real-time listener for users
        let usersQuery;
        try {
          usersQuery = query(collection(db, 'users'), orderBy('joinDate', 'desc'));
        } catch (e) {
          usersQuery = query(collection(db, 'users'));
        }
        
        this.unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
          this.users = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name || data.displayName || 'Unknown User',
              email: data.email || '',
              device: data.device || 'Unknown',
              plantCount: data.plantCount || 0,
              totalHarvest: data.totalHarvest || 0,
              status: data.status || 'Active',
              joinDate: data.joinDate?.toDate?.() || data.joinDate || new Date(),
              lastActive: data.lastActive?.toDate?.() || data.lastActive || new Date(),
              user_id: data.user_id || doc.id,
              ...data
            };
          });
        }, (error) => {
          console.error('Users listener error:', error);
          this.handleFirebaseError(error);
        });

        // Real-time listener for plants
        const plantsQuery = query(collection(db, 'plants'));
        this.unsubscribePlants = onSnapshot(plantsQuery, (snapshot) => {
          this.plants = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name || data.plant_name || 'Unnamed Plant',
              owner: data.owner || data.user_name || 'Unknown Owner',
              userId: data.user_id || data.userId,
              type: data.type || data.plant_type || 'Unknown',
              health: data.health || data.status || 'Unknown',
              daysGrowing: data.daysGrowing || data.age_days || 0,
              ...data
            };
          });
        }, (error) => {
          console.error('Plants listener error:', error);
          this.handleFirebaseError(error);
        });

        // Real-time listener for admins registry (if exists)
        try {
          const adminsQuery = query(collection(db, 'admins'));
          this.unsubscribeAdmins = onSnapshot(adminsQuery, (snapshot) => {
            const m = new Map();
            snapshot.forEach(d => {
              const data = d.data() || {};
              m.set(d.id, !!data.admin);
            });
            this.adminsMap = m;
          }, (error) => {
            console.warn('Admins collection listener error (this may be normal):', error);
          });
        } catch (error) {
          console.log('No admins collection found, relying on custom claims only');
        }

        console.log('Real-time listeners setup completed');
      } catch (error) {
        console.error('Error setting up listeners:', error);
        this.handleFirebaseError(error);
      }
    },

    // ------ Helpers ------
    formatDate(dateString) {
      if (!dateString) return 'N/A';
      const date = dateString instanceof Date ? dateString : new Date(dateString);
      return date.toLocaleDateString();
    },

    formatDateISO(dateString) {
      if (!dateString) return '';
      const date = dateString instanceof Date ? dateString : new Date(dateString);
      return date.toISOString().split('T')[0];
    },

    isUserAdmin(uid) {
      // Check custom claims first (primary method)
      const auth = getAuth();
      const user = auth.currentUser;
      if (user && user.uid === uid) {
        // For current user, we can check their token
        return this.isAdmin;
      }
      
      // For other users, check the admins collection as fallback
      return this.adminsMap.get(uid) === true;
    },

    getUserPlants(user) {
      return this.plants.filter((plant) => 
        plant.owner === user.name || 
        plant.userId === user.id || 
        plant.user_id === user.id ||
        plant.user_id === user.user_id
      );
    },

    getUserHarvests(user) {
      return this.harvests.filter((harvest) => 
        harvest.owner === user.name || 
        harvest.userId === user.id || 
        harvest.user_id === user.id ||
        harvest.user_id === user.user_id
      );
    },

    // ------ User Actions ------
    async editUser(user) {
      try {
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, {
          lastModified: new Date(),
        });

        // Role management
        if (this.isUserAdmin(user.id)) {
          if (confirm(`"${user.email || user.name}" is an ADMIN.\nDo you want to DEMOTE this user?`)) {
            await this.demoteByUid(user.id);
          }
        } else {
          if (confirm(`Make "${user.email || user.name}" an ADMIN?`)) {
            await this.promoteByEmail(user.email);
          }
        }

        this.showSuccess('User updated successfully');
      } catch (error) {
        console.error('Error updating user:', error);
        this.handleFirebaseError(error);
      }
    },

    async deleteUser(userId) {
      if (this.isUserAdmin(userId)) {
        this.showError('Cannot delete an admin user. Demote first, then delete.');
        return;
      }

      if (confirm("Are you sure you want to delete this user?")) {
        try {
          await deleteDoc(doc(db, 'users', userId));
          this.users = this.users.filter((user) => user.id !== userId);
          if (this.selectedUser && this.selectedUser.id === userId) {
            this.selectedUser = null;
          }
          this.showSuccess('User deleted successfully');
        } catch (error) {
          console.error('Error deleting user:', error);
          this.handleFirebaseError(error);
        }
      }
    },

    viewUserDetails(user) {
      this.selectedUser = user;
    },

    async suspendUser(user) {
      try {
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, {
          status: user.status === 'Active' ? 'Suspended' : 'Active',
          lastModified: new Date()
        });
        user.status = user.status === 'Active' ? 'Suspended' : 'Active';
        this.showSuccess(`User ${user.status.toLowerCase()} successfully`);
      } catch (error) {
        console.error('Error suspending user:', error);
        this.handleFirebaseError(error);
      }
    },

    // ------ Admin Role Management (Custom Claims) ------
    async promoteByEmail(email) {
      if (!email) return;
      this.busyRole = true;
      try {
        // Call your custom function that sets admin custom claims
        const functions = getFunctions();
        const setAdminClaim = httpsCallable(functions, 'setAdminClaim');
        const res = await setAdminClaim({ email, admin: true });
        
        this.showSuccess(`Promoted ${email} to admin`);
        
        // Force token refresh for current user if they were promoted
        const auth = getAuth();
        if (auth.currentUser && auth.currentUser.email === email) {
          await auth.currentUser.getIdToken(true);
          await this.checkAdminStatus(auth.currentUser.uid);
        }
      } catch (e) {
        console.error('Error promoting user:', e);
        this.showError(e.message || String(e));
      } finally {
        this.busyRole = false;
      }
    },

    async demoteByUid(uid) {
      if (!uid) return;
      this.busyRole = true;
      try {
        // Call your custom function that removes admin custom claims
        const functions = getFunctions();
        const setAdminClaim = httpsCallable(functions, 'setAdminClaim');
        await setAdminClaim({ uid, admin: false });
        
        this.showSuccess('Demoted admin');
        
        // Force token refresh for current user if they were demoted
        const auth = getAuth();
        if (auth.currentUser && auth.currentUser.uid === uid) {
          await auth.currentUser.getIdToken(true);
          await this.checkAdminStatus(auth.currentUser.uid);
        }
      } catch (e) {
        console.error('Error demoting user:', e);
        this.showError(e.message || String(e));
      } finally {
        this.busyRole = false;
      }
    },

    // ------ UI Helpers ------
    viewHarvestDetails(harvest) {
      console.log("View harvest details:", harvest);
    },

    editHarvest(harvest) {
      console.log("Edit harvest:", harvest);
    },

    showSuccess(message) {
      // You can replace this with a proper toast notification
      alert(message);
    },

    showError(message) {
      this.lastError = message;
      console.error('Error:', message);
    },
  },
};
</script>

<style scoped>
/* Authentication & Permission Guards */
.auth-guard, .permission-guard {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
}

.auth-message, .permission-message {
  text-align: center;
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  max-width: 400px;
}

.sign-in-btn, .sign-out-btn {
  background: #4285f4;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  margin-top: 1rem;
}
</style>