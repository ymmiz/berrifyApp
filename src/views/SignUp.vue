<template>
  <div class="app signup-page">
    <div class="form-container">
      <h1 class="welcome-text">
        Create Your<br /><span>BERRIFY</span> Account
      </h1>

      <div class="form-card">
        <!-- Use a form so Enter submits -->
        <form @submit.prevent="signUp">
          <div class="form-group">
            <label for="name">Name</label>
            <input
              id="name"
              v-model="name"
              type="text"
              placeholder="Enter your Name"
              autocomplete="name"
            />
          </div>

          <div class="form-group">
            <label for="email">Email</label>
            <input
              id="email"
              v-model="email"
              type="email"
              placeholder="Enter your email"
              autocomplete="email"
            />
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input
              id="password"
              v-model="password"
              type="password"
              placeholder="Create a password"
              autocomplete="new-password"
            />
          </div>

          <div class="form-group">
            <label for="confirm-password">Confirm Password</label>
            <input
              id="confirm-password"
              v-model="confirmPassword"
              type="password"
              placeholder="Confirm password"
              autocomplete="new-password"
            />
          </div>

          <button class="btn-main" type="submit">Sign Up</button>
        </form>
      </div>

      <p class="login-link">
        Already have an account?
        <router-link to="/signin">Log In</router-link>
      </p>
    </div>
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