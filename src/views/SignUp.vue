<template>
  <div class="auth-container">
    <h2>Create Account</h2>

    <input
      v-model="name"
      placeholder="Name"
      type="text"
      class="input-field"
    />

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

    <input
      v-model="confirmPassword"
      placeholder="Confirm Password"
      type="password"
      class="input-field"
    />

    <button @click="signUp" class="btn">Sign Up</button>

    <p>
      Already have an account?
      <router-link to="/signin">Sign In</router-link>
    </p>
  </div>
</template>

<script setup>
import '../styles/auth.css'
import { useSignUp } from '../scripts/useSignUp.js'

const {
  name,
  email,
  password,
  confirmPassword,
  signUp
} = useSignUp()
</script>