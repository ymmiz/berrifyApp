<template>
  <div class="admin-login-page">
    <div class="login-container">
      <h1>Admin Login</h1>
      <p class="subtitle">Please sign in to continue</p>

      <!-- 🌸 Login form -->
      <form v-if="!isLoading" class="login-form" @submit.prevent="handleLogin">
        <div class="input-group">
          <label for="email">Email</label>
          <input
            v-model="email"
            type="email"
            id="email"
            placeholder="Enter your email"
            required
          />
        </div>

        <div class="input-group">
          <label for="password">Password</label>
          <input
            v-model="password"
            type="password"
            id="password"
            placeholder="Enter your password"
            required
          />
        </div>

        <button type="submit" class="login-btn">Login</button>
      </form>

      <!-- 🌸 Loading state -->
      <div v-else class="loading">Logging in...</div>

      <!-- 🌸 Error message -->
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    </div>
  </div>
</template>

<script>
import "./AdminLogin.css";

export default {
  name: "AdminLogin",
  data() {
    return {
      isLoading: false,
      email: "",
      password: "",
      errorMessage: "",
    };
  },
  methods: {
    async handleLogin() {
      this.errorMessage = "";
      this.isLoading = true;

      // Mock auth check (replace with real API call)
      setTimeout(() => {
        if (
          this.email === "admin@example.com" &&
          this.password === "admin123"
        ) {
          alert("✅ Login successful!");
          // here you can use router.push("/dashboard") if you’re using Vue Router
        } else {
          this.errorMessage = "❌ Invalid email or password";
        }
        this.isLoading = false;
      }, 1500);
    },
  },
};
</script>
