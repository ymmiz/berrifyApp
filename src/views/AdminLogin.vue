<template>
  <div class="app admin-login-page">
    <div class="form-container">
      <!-- 🌸 Show form only when not loading -->
      <div v-if="!isLoading">
        <h1 class="welcome-text">
          Welcome to<br /><span>BERRIFY ADMIN!</span>
        </h1>

        <div class="form-card">
          <div class="form-group">
            <label for="email">Email</label>
            <input
              v-model="email"
              id="email"
              type="email"
              placeholder="Enter your email"
              required
            />
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input
              v-model="password"
              id="password"
              type="password"
              placeholder="Enter your password"
              required
            />
          </div>

          <button class="btn-main" @click="handleLogin">Sign In</button>
          <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
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
import "../styles/AdminLogin.css";

// ⬇️ Make sure this path exports `auth` created with getAuth(initializeApp(...))
import { auth } from "../firebase"; // adjust path if yours is different
import { signInWithEmailAndPassword, signOut } from "firebase/auth";

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

      try {
        // 1) Firebase sign-in
        const cred = await signInWithEmailAndPassword(
          auth,
          this.email.trim(),
          this.password
        );

        // 2) refresh token to pull latest custom claims
        await cred.user.getIdToken(true);
        const tokenResult = await cred.user.getIdTokenResult();

        // 🧪 DEBUG: see who logged in + claims
        console.log("uid:", cred.user.uid, "email:", cred.user.email);
        console.log("claims:", tokenResult.claims);
        console.log("isAdmin?", tokenResult.claims?.admin === true);

        // 3) gate on admin claim
        if (tokenResult.claims?.admin !== true) {
          await signOut(auth);
          this.errorMessage = "This account is not an admin.";
          this.isLoading = false;
          return;
        }

        // 4) success → go to admin page
        this.$router.push("/adminpage");
      } catch (err) {
        const code = err?.code || "";
        if (code.includes("auth/invalid-email")) {
          this.errorMessage = "Invalid email format.";
        } else if (code.includes("auth/user-not-found")) {
          this.errorMessage = "No user with this email.";
        } else if (code.includes("auth/wrong-password")) {
          this.errorMessage = "Wrong password.";
        } else if (code.includes("auth/too-many-requests")) {
          this.errorMessage = "Too many attempts. Try again later.";
        } else {
          this.errorMessage = err?.message || "Login failed.";
        }
      } finally {
        // stop loader unless we immediately navigate
        this.isLoading = false;
      }
    },
  },
};
</script>
