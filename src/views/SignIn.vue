<template>
  <div class="auth-container">
    <h2>Welcome to BERRIFY!</h2>

    <input
      v-model="email"
      placeholder="Email"
      type="email"
      class="input-field"
    />

    <input
      v-model="password"
      placeholder="Password"
      type="password"
      class="input-field"
    />

    <button @click="signInWithEmail" class="btn">Sign In</button>
    <p>
    <a @click="forgotPassword" href="#">Forgot password?</a>
    </p>

    <button @click="signInWithGoogle" class="btn google-btn">
    Continue with Google
    </button>

  </div>
</template>

<script setup>
import '../styles/auth.css'
import { useSignIn } from '../scripts/useSignIn.js'

const {
  email,
  password,
  signInWithEmail,
  signInWithGoogle,
  forgotPassword,
} = useSignIn()
</script>