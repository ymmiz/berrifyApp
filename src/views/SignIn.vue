<template>
  <div class="app login-page">
    <div class="form-container">
      <!-- 🌸 Show form only when not loading -->
      <div v-if="!isLoading">
        <h1 class="welcome-text">Welcome to<br /><span>BERRIFY!</span></h1>

        <div class="form-card">
          <div class="form-group">
            <label for="email">Email</label>
            <input
              id="email"
              type="email"
              v-model="email"
              placeholder="Enter your email"
            />
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input
              id="password"
              type="password"
              v-model="password"
              autocomplete="current-password"
              placeholder="Enter your password"
              @keyup.enter="signInWithEmail"
            />
          </div>
          <button class="btn-main" @click="signInWithEmail">Sign In</button>
          <a @click.prevent="goToForgotPassword" class="forgot-link">Forgot password?</a>
        </div>

        <p class="signup-link">
          Don't have an account?
          <span @click="goToSignup">Sign Up</span>
        </p>

        <div class="social-buttons">
          <button class="btn-social" @click="signInWithGoogle">Continue with Google</button>
        </div>
      </div>

      <!-- 🌸 Show flower loader only when loading -->
      <div v-else class="flower">
        <div class="petal petal1"></div>
        <div class="petal petal2"></div>
        <div class="petal petal3"></div>
        <div class="petal petal4"></div>
        <div class="petal petal5"></div>
        <div class="petal petal6"></div>
        <div class="petal petal7"></div>
        <div class="petal petal8"></div>
        <div class="center"></div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSignIn } from '../scripts/useSignIn.js'
import '../styles/LoginPage.css'

export default {
  setup() {
    const router = useRouter()
    const route = useRoute()
    const email = ref('')
    const password = ref('')
    const { isLoading, signInWithEmail, signInWithGoogle } = useSignIn(email, password)

    onMounted(() => {
      if (route.query.email) email.value = String(route.query.email)
    })
  
    const goToSignup = () => {
      router.push('/')
    }

    const goToForgotPassword = () => {
      router.push('/forgot-password')
    }
    return {
      email,
      password,
      isLoading,
      signInWithEmail,
      goToSignup,
      goToForgotPassword,
      signInWithGoogle
    }
  }
}
</script>