<template>
  <div class="forgot-page">
    <h2>🔐 Forgot Your Password?</h2>

    <input
      v-model="email"
      type="email"
      placeholder="Enter your registered email"
      class="input"
    />

    <button
      @click="resetPassword"
      class="btn"
      :disabled="loading || !email.trim()"
    >
      <span v-if="!loading">Send Reset Link</span>
      <span v-else>Sending...</span>
    </button>

    <p class="back" @click="router.push('/signin')">← Back to Sign In</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../firebase'

const email = ref('')
const loading = ref(false)
const router = useRouter()

const resetPassword = async () => {
  if (!email.value.trim()) {
    alert('Please enter your email.')
    return
  }

  loading.value = true

  try {
    await sendPasswordResetEmail(auth, email.value.trim())
    alert('📩 A password reset link was sent to your email.')
    router.push('/signin')
  } catch (error) {
    console.error(error)
    let message = '❌ Failed to send reset link. Please check your email.'

    if (error.code === 'auth/user-not-found') {
      message = '❌ No user found with this email.'
    } else if (error.code === 'auth/invalid-email') {
      message = '❌ Invalid email format.'
    }

    alert(message)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.forgot-page {
  max-width: 400px;
  margin: 5rem auto;
  padding: 2rem;
  border: 1px solid #ddd;
  border-radius: 10px;
  text-align: center;
  background-color: #121212;
  color: #fff;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
}
.input {
  width: 100%;
  padding: 12px;
  margin: 1rem 0;
  border-radius: 5px;
  border: none;
  background-color: #1e1e1e;
  color: #fff;
}
.input::placeholder {
  color: #bbb;
}
.btn {
  padding: 12px 20px;
  background-color: #00c853;
  color: white;
  font-weight: bold;
  border: none;
  border-radius: 5px;
  width: 100%;
  cursor: pointer;
}
.btn:disabled {
  background-color: #555;
  cursor: not-allowed;
}
.back {
  margin-top: 1.2rem;
  color: #9e9e9e;
  cursor: pointer;
  text-decoration: underline;
}
</style>