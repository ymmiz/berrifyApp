<template>
  <div class="app welcome-screen">
    <h1>Welcome to<br /><span>BERRIFY!</span></h1>
    <img src="/strawberries.png" alt="Berry Icon" class="berry-image" />
    <p class="description">
      “Its time to get your plants settled in and ready to grow strong and healthy.”
    </p>
    <button class="btn-main" @click="$router.push('/home')">Get Started</button>
  </div>
</template>


<script>
</script>

<style>
/* WelcomePage Component Styles */
.berry-image {
  width: 200px;   
  height: auto;  
  margin: 20px auto;
  display: block;
  box-shadow: 0 0 20px rgba(255, 150, 180, 0.25);
}
</style>