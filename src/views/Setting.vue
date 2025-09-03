<template>
  <div class="settings-page">
    <!-- Header -->
    <div class="header">
      <div class="back-button" @click="goBack">
        <i class="bi bi-arrow-left"></i>
      </div>
      <h1 class="settings-title">Settings</h1>
    </div>

    <div class="settings-content">
      <!-- Account Section -->
      <section class="settings-section">
        <h3 class="section-title">Account</h3>

        <!-- Change or Add Password (provider-aware) -->
        <div class="setting-item" v-if="hasPasswordProvider">
          <div class="setting-info">
            <h4>Change Password</h4>
            <p>Update your account password</p>
          </div>
          <button class="setting-action" @click="showChangePassword = true">
            <i class="bi bi-key-fill"></i>
          </button>
        </div>

        <div class="setting-item" v-else>
          <div class="setting-info">
            <h4>Add Password</h4>
            <p>Enable email/password login for this account</p>
          </div>
          <button class="setting-action" @click="showAddPassword = true">
            <i class="bi bi-key-fill"></i>
          </button>
        </div>
      </section>

      <!-- Preferences -->
      <section class="settings-section">
        <h3 class="section-title">Preferences</h3>

        <div class="setting-item">
          <div class="setting-info">
            <h4>Notifications</h4>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" v-model="notifications" @change="updateNotifications">
            <span class="slider"></span>
          </label>
        </div>

        <!-- (Theme removed per your last version; easy to re-enable later) -->
      </section>

      <!-- Danger Zone -->
      <section class="settings-section danger-section">
        <h3 class="section-title danger-title">Danger Zone</h3>

        <div class="setting-item">
          <div class="setting-info">
            <h4>Sign Out</h4>
            <p>Sign out from your account</p>
          </div>
          <button class="setting-action danger-action" @click="logout">
            <i class="bi bi-box-arrow-right"></i>
          </button>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <h4>Delete Account</h4>
            <p>Permanently delete your account and all data</p>
          </div>
          <button class="setting-action danger-action" @click="showDeleteAccount = true">
            <i class="bi bi-trash-fill"></i>
          </button>
        </div>
      </section>
    </div>

    <!-- Change Password Modal -->
    <div v-if="showChangePassword" class="modal-overlay" @click="showChangePassword = false">
      <div class="modal-content" @click.stop>
        <h3>Change Password</h3>
        <form @submit.prevent="changePassword">
          <!-- Only show current password if account uses password provider -->
          <div class="form-group" v-if="hasPasswordProvider">
            <label>Current Password</label>
            <input type="password" v-model="passwordForm.current" placeholder="Enter current password" required />
          </div>
          <div class="form-group">
            <label>New Password</label>
            <input type="password" v-model="passwordForm.new" placeholder="Enter new password" minlength="6" required />
          </div>
          <div class="form-group">
            <label>Confirm New Password</label>
            <input type="password" v-model="passwordForm.confirm" placeholder="Confirm new password" required />
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="showChangePassword = false">Cancel</button>
            <button type="submit" class="btn-save" :disabled="!isPasswordFormValid">Change Password</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Add Password Modal (for Google-only accounts) -->
    <div v-if="showAddPassword" class="modal-overlay" @click="showAddPassword = false">
      <div class="modal-content" @click.stop>
        <h3>Add Password</h3>
        <form @submit.prevent="linkPasswordToAccount(addPasswordForm.newPassword)">
          <div class="form-group">
            <label>New Password</label>
            <input type="password" v-model="addPasswordForm.newPassword" minlength="6" required />
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="showAddPassword = false">Cancel</button>
            <button type="submit" class="btn-save">Add Password</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Account Modal -->
    <div v-if="showDeleteAccount" class="modal-overlay" @click="showDeleteAccount = false">
      <div class="modal-content" @click.stop>
        <h3>Delete Account</h3>
        <p class="danger-copy">This will permanently remove your account and associated data. This action cannot be undone.</p>
        <form @submit.prevent="confirmDeleteAccount">
          <div class="form-group" v-if="hasPasswordProvider">
            <label>Enter password to confirm</label>
            <input type="password" v-model="deleteForm.password" placeholder="Your password" required />
          </div>
          <div class="form-group">
            <label>Type <b>DELETE</b> to confirm</label>
            <input type="text" v-model="deleteForm.confirmText" placeholder="DELETE" required />
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="showDeleteAccount = false">Cancel</button>
            <button type="submit" class="btn-delete" :disabled="deleteForm.confirmText !== 'DELETE'">Permanently Delete</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Bottom Navigation -->
    <div class="icon-nav">
      <div class="nav-item" @click="$router.push('/home')"><i class="bi bi-house-door-fill"></i></div>
      <div class="nav-item" @click="$router.push('/tips')"><i class="bi bi-list-ul"></i></div>
      <div class="nav-item" @click="$router.push('/mydiary')"><span class="emoji">🌱</span></div>
      <div class="nav-item active" @click="$router.push('/setting')"><i class="bi bi-gear-fill"></i></div>
      <div class="nav-item" @click="$router.push('/profile')"><i class="bi bi-person-fill"></i></div>
    </div>
  </div>
</template>

<script>
import {
  getAuth,
  onAuthStateChanged,
  updatePassword,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  EmailAuthProvider,
  GoogleAuthProvider,
  deleteUser
} from 'firebase/auth'
import { getUserData, updateUserData } from '../scripts/userService.js'
import { getFirestore, collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore'

export default {
  name: 'Settings',
  data() {
    return {
      user: { email: '', displayName: '', uid: '' },
      providers: [],

      showChangePassword: false,
      showAddPassword: false,
      showDeleteAccount: false,

      passwordForm: { current: '', new: '', confirm: '' },
      addPasswordForm: { newPassword: '' },
      deleteForm: { password: '', confirmText: '' },

      notifications: true,
      theme: 'light',
      loadingUser: true
    }
  },
  computed: {
    hasPasswordProvider() {
      return this.providers.includes('password')
    },
    isPasswordFormValid() {
      return (
        !!this.passwordForm.new &&
        this.passwordForm.new.length >= 6 &&
        this.passwordForm.new === this.passwordForm.confirm &&
        // if using password provider, current password must be provided
        (this.hasPasswordProvider ? !!this.passwordForm.current : true)
      )
    }
  },
  methods: {
    goBack() {
      if (window.history.length > 1) this.$router.go(-1)
      else this.$router.push('/home')
    },

    async refreshProviders() {
      const auth = getAuth()
      const u = auth.currentUser
      if (!u) return
      await u.reload()
      this.providers = (u.providerData || []).map(p => p.providerId)
    },

    async updateNotifications() {
      try {
        if (!this.user.uid) return
        await updateUserData({ notifications: this.notifications })
      } catch (e) {
        console.error(e)
        alert('Failed to update notifications')
      }
    },

    // Provider-aware reauth:
    async reauthSmart(passwordFromForm = '') {
      const auth = getAuth()
      const u = auth.currentUser
      
      if (!u) throw new Error('No authenticated user')
      
      try {
        await u.reload()
        const providers = (u.providerData || []).map(p => p.providerId)

        if (providers.includes('password')) {
          if (!passwordFromForm) {
            const err = new Error('Password required')
            err.code = 'app/password-required'
            throw err
          }
          const cred = EmailAuthProvider.credential(u.email, passwordFromForm)
          return await reauthenticateWithCredential(u, cred)
        }

        if (providers.includes('google.com')) {
          const google = new GoogleAuthProvider()
          try {
            return await reauthenticateWithPopup(u, google)
          } catch (error) {
            if (error.code === 'auth/user-token-expired') {
              // Force sign out and redirect to signin
              await auth.signOut()
              this.$router.replace('/signin')
              throw new Error('Session expired. Please sign in again.')
            }
            throw error
          }
        }

        throw new Error(`Unsupported providers: ${providers.join(', ') || 'none'}`)
      } catch (error) {
        if (error.code === 'auth/requires-recent-login') {
          await auth.signOut()
          this.$router.replace('/signin')
          throw new Error('Please sign in again to continue')
        }
        throw error
      }
    },

    async linkPasswordToAccount(newPassword) {
      try {
        const auth = getAuth()
        const u = auth.currentUser
        if (!u?.email) return alert('Not signed in')

        // Reauth with Google (or other provider) via popup
        await this.reauthSmart()

        const cred = EmailAuthProvider.credential(u.email, newPassword)
        await u.linkWithCredential(cred)

        this.showAddPassword = false
        this.addPasswordForm.newPassword = ''
        await this.refreshProviders()
        alert('Password added. You can now use Change Password.')
      } catch (e) {
        console.error(e)
        alert('Failed to add password')
      }
    },

    async changePassword() {
      const auth = getAuth()
      const u = auth.currentUser
      if (!u?.email) {
        alert('You must be signed in to change password.')
        return
      }
      if (!this.isPasswordFormValid) return

      try {
        // Reauth with correct provider
        await this.reauthSmart(this.passwordForm.current)

        // Now update password
        await updatePassword(u, this.passwordForm.new)

        alert('Password updated successfully.')
        this.passwordForm = { current: '', new: '', confirm: '' }
        this.showChangePassword = false
      } catch (e) {
        console.error(e)
        const msg =
          e?.code === 'auth/wrong-password' || e?.code === 'auth/invalid-credential'
            ? 'Current password is incorrect, or this account does not use password sign-in.'
            : e?.code === 'auth/weak-password'
              ? 'New password is too weak (min 6 characters).'
              : e?.code === 'app/password-required'
                ? 'Please enter your current password.'
                : e?.code === 'auth/requires-recent-login'
                  ? 'Please sign in again and retry.'
                  : 'Failed to change password.'
        alert(msg)
      }
    },

    async deleteUserData(uid) {
      const db = getFirestore()
      
      try {
        // Delete user profile
        await deleteDoc(doc(db, 'users', uid))
        
        // Delete user's plants and their uploads
        const plantsQuery = query(collection(db, 'plants'), where('user_id', '==', uid))
        const plantsSnapshot = await getDocs(plantsQuery)
        
        for (const plantDoc of plantsSnapshot.docs) {
          // Delete plant uploads
          const uploadsQuery = query(collection(db, 'plants', plantDoc.id, 'uploads'))
          const uploadsSnapshot = await getDocs(uploadsQuery)
          
          for (const uploadDoc of uploadsSnapshot.docs) {
            await deleteDoc(doc(db, 'plants', plantDoc.id, 'uploads', uploadDoc.id))
          }

          // Delete diary entries for this plant
          const entriesQuery = query(collection(db, 'plants', plantDoc.id, 'diary_entries'))
          const entriesSnapshot = await getDocs(entriesQuery)
          
          for (const entryDoc of entriesSnapshot.docs) {
            await deleteDoc(doc(db, 'plants', plantDoc.id, 'diary_entries', entryDoc.id))
          }
          
          // Delete the plant document itself
          await deleteDoc(doc(db, 'plants', plantDoc.id))
        }
      } catch (error) {
        console.error('Error deleting user data:', error)
        throw new Error('Failed to delete user data')
      }
    },

    async confirmDeleteAccount() {
      const auth = getAuth()
      const u = auth.currentUser
      if (!u?.email) {
        alert('You must be signed in to delete your account.')
        return
      }
      if (this.deleteForm.confirmText !== 'DELETE') return

      try {
        await this.reauthSmart(this.deleteForm.password)
        
        // First delete all user data
        await this.deleteUserData(u.uid)
        
        // Then delete auth user
        await deleteUser(u)

        alert('Your account has been deleted.')
        this.showDeleteAccount = false
        this.$router.replace('/signin')
      } catch (e) {
        console.error(e)
        const msg =
          e?.code === 'auth/requires-recent-login'
            ? 'Please sign in again and retry.'
            : e?.code === 'auth/wrong-password' || e?.code === 'auth/invalid-credential'
              ? "Password is incorrect, or this account doesn't use password sign-in."
              : 'Failed to delete account.'
        alert(msg)
      }
    },

    async logout() {
      try {
        const auth = getAuth()
        await auth.signOut()
        this.$router.replace('/signin')
      } catch (error) {
        console.error('Error signing out:', error)
        alert('Failed to sign out')
      }
    }
  },
  async mounted() {
    // Optional theme boot (kept from your previous version if you re-enable theme later)
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      this.theme = savedTheme
      document.documentElement.setAttribute('data-theme', savedTheme)
    }

    const auth = getAuth()
    onAuthStateChanged(auth, async (fbUser) => {
      this.loadingUser = false
      if (!fbUser) {
        this.$router.replace('/signin')
        return
      }
      this.user = {
        email: fbUser.email || '',
        displayName: fbUser.displayName || '',
        uid: fbUser.uid
      }

      // Provider list for UI logic
      await this.refreshProviders()

      // Load profile prefs
      try {
        const profile = await getUserData()
        if (profile && typeof profile.notifications === 'boolean') {
          this.notifications = profile.notifications
        }
      } catch (e) {
        console.error('Failed to load user profile', e)
      }
    })
  }
}
</script>

<style scoped>
.settings-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #8ab58a 0%, #a8d4a8 100%);
  position: relative;
}
.settings-page::before {
  content: '';
  position: absolute; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M54.627 0l.83.828-1.415 1.415L51.8 0h2.827zM5.373 0l-.83.828L5.96 2.243 8.2 0H5.374zM48.97 0l3.657 3.657-1.414 1.414L46.143 0h2.828zM11.03 0L7.372 3.657 8.787 5.07 13.857 0H11.03zm32.284 0L49.8 6.485 48.384 7.9l-7.9-7.9h2.83zM16.686 0L10.2 6.485 11.616 7.9l7.9-7.9h-2.83zM22.344 0L13.858 8.485 15.272 9.9l7.9-7.9h-.828zm5.656 0L19.515 8.485 17.343 10.657l7.9-7.9h2.757zm5.656 0l-9.9 9.9-2.172 2.172 7.9-7.9h4.172zm5.656 0L30.8 8.485 28.628 10.657l7.9-7.9h2.757zM32.372 0L26.8 5.657 24.628 7.828l7.9-7.9h-.156zm2.758 0L29.8 5.657 27.628 7.828l7.9-7.9h-.398zm2.758 0L33.8 5.657l-2.172 2.172 7.9-7.9h-2.398zm2.757 0L36.8 5.657l-2.172 2.172 7.9-7.9h-2.399zM17.515 0L9.03 8.485l1.414 1.414L18.93 1.414 17.515 0z' fill='%23ffffff' fill-opacity='0.03' fill-rule='evenodd'/%3E%3C/svg%3E");
  opacity: 0.4; pointer-events: none;
}

.header {
  display: flex; align-items: center; gap: 12px;
  padding: 24px 24px 0 24px; background: transparent; border-bottom: none;
}
.header .back-button {
  width: 40px; height: 40px; border-radius: 16px; display: grid; place-items: center;
  background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.08); cursor: pointer;
}
.settings-title {
  font-size: 28px; margin: 0; color: #222; font-weight: 700; letter-spacing: 0.02em;
}

.settings-content { padding: 24px; flex: 1; }
.settings-section {
  background: #fff; border-radius: 20px; padding: 18px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.10); margin-bottom: 24px;
}
.section-title { font-size: 20px; color: #222; font-weight: 700; margin: 0 0 18px 0; letter-spacing: 0.03em; }
.danger-title { color: #b91c1c; font-weight: 800; }

.setting-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 0; border-radius: 14px; transition: background .15s;
}
.setting-item + .setting-item { border-top: 1px dashed #e5e7eb; }
.setting-item:hover { background: #f7f7fb; }

.setting-info h4 { font-size: 17px; margin: 0 0 4px; color: #222; font-weight: 600; }
.setting-info p { margin: 0; color: #555; font-size: 14px; }

.setting-action {
  width: 40px; height: 40px; border-radius: 14px; background: #f0f2f5; border: none;
  display: grid; place-items: center; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.danger-section { border: 1px solid #fee2e2; background: #fff7f7; }
.danger-action { background: #fee2e2; color: #b91c1c; }

.toggle-switch { position: relative; width: 48px; height: 26px; display: inline-block; }
.toggle-switch input { display: none; }
.slider { position: absolute; cursor: pointer; inset: 0; background: #cfd4dc; border-radius: 9999px; transition: .2s; }
.slider:before { content: ""; position: absolute; height: 20px; width: 20px; left: 3px; top: 3px; border-radius: 50%; background: white; transition: .2s; }
input:checked + .slider { background: #34c759; }
input:checked + .slider:before { transform: translateX(22px); }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); display: grid; place-items: center; z-index: 50; }
.modal-content { width: min(480px, 92vw); background: #fff; border-radius: 20px; padding: 28px; box-shadow: 0 20px 60px rgba(0,0,0,0.18); }
.modal-content h3 { margin: 0 0 16px; color: #222; font-weight: 700; font-size: 22px; }

.form-group { display: grid; gap: 10px; margin: 16px 0; }
.form-group label { font-size: 15px; color: #222; font-weight: 600; }
.form-group input {
  border: 1px solid #e5e7eb; border-radius: 14px; padding: 12px 14px;
  font-size: 15px; outline: none; background: #f7f7fb;
}
.form-group input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.10); }

.modal-actions { display: flex; justify-content: flex-end; gap: 14px; margin-top: 18px; }
.btn-cancel, .btn-save, .btn-delete {
  border: none; border-radius: 14px; padding: 12px 18px; cursor: pointer; font-weight: 600; font-size: 15px;
}
.btn-cancel { background: #f3f4f6; color: #222; }
.btn-save { background: #6366f1; color: white; }
.btn-save:disabled { opacity: .6; cursor: not-allowed; }
.btn-delete { background: #ef4444; color: white; }

.danger-copy { color: #7f1d1d; background: #fee2e2; padding: 12px; border-radius: 14px; }

/* Bottom nav */
.icon-nav {
  position: fixed; bottom: 0; left: 0; right: 0; height: 65px;
  background: white; display: flex; justify-content: space-around; align-items: center;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1); z-index: 1000; border-radius: 20px 20px 0 0;
}
.nav-item {
  display: flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; cursor: pointer; transition: all 0.2s ease;
  border-radius: 12px; color: #94a3b8;
}
.nav-item.active { color: #6366f1; transform: translateY(-4px); }
.nav-item i { font-size: 20px; transition: all 0.2s ease; }
.emoji { font-size: 20px; }
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .icon-nav { padding-bottom: env(safe-area-inset-bottom); height: calc(65px + env(safe-area-inset-bottom)); }
}
</style>