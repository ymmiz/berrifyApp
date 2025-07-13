<template>
  <div class="profile-container">
    <h2>My Profile</h2>

    <div v-if="user">
      <p><strong>Name:</strong> {{ user.name }}</p>
      <p><strong>Email:</strong> {{ user.email }}</p>
      <p><strong>User Type:</strong> {{ user.user_type || 'Not Set' }}</p>
      <p><strong>Admin:</strong> {{ user.is_admin ? 'Yes' : 'No' }}</p>

      <h3>Edit Profile</h3>
      <input v-model="newName" placeholder="New name" />
      <select v-model="newType">
        <option disabled value="">Select User Type</option>
        <option value="phone">Phone</option>
        <option value="hardware">Hardware</option>
        <option value="both">Both</option>
      </select>
      <button @click="saveChanges">Save Changes</button>
    </div>
    <div v-else>
      Loading profile...
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getUserData, updateUserData } from '../scripts/userService.js'
import '../styles/profile.css'

const user = ref(null)
const newName = ref("")
const newType = ref("")

onMounted(async () => {
  const data = await getUserData()
  user.value = data
  newName.value = data?.name || ""
  newType.value = data?.user_type || ""
})

const saveChanges = async () => {
  await updateUserData({
    name: newName.value,
    user_type: newType.value
  })
  alert("✅ Profile updated!")
}
</script>
