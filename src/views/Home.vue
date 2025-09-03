<template>
  <div class="home">
    <div class="page-container">
      <!-- Carousel -->
      <carousel
        :items-to-show="1"
        :wrap-around="true"
        :transition="500"
        :navigation-enabled="true"
      >
        <slide v-for="(item, index) in banners" :key="index">
          <img :src="item.image" :alt="item.label" class="carousel-img" />
        </slide>
      </carousel>

      <!-- Scrollable Cards -->
      <h1>Tips</h1>
      <div class="scroll-container">
        <div class="scroll-card" v-for="item in cards" :key="item.label">
          <img :src="item.image" :alt="item.label" />
          <p>{{ item.label }}</p>
        </div>
      </div>

      <!-- My Strawberry -->
      <h1>My Strawberry</h1>
      <div class="strawberry-container">
        <div
          class="strawberry-card"
          v-for="item in strawberries"
          :key="item.label"
        >
          <img :src="item.image" :alt="item.label" />
          <p>{{ item.label }}</p>
        </div>
      </div>

      <!-- Bottom Icon Navigation -->
      <div class="icon-nav">
        <div class="nav-item" @click="$router.push('/home')">
          <i class="bi bi-house-door-fill"></i>
        </div>
        <div class="nav-item" @click="$router.push('/tips')">
          <i class="bi bi-list-ul"></i>
        </div>
        <div class="nav-item" @click="$router.push('/mydiary')">
          <span class="emoji">🌱</span>
        </div>
        <div class="nav-item" @click="$router.push('/setting')">
          <i class="bi bi-gear-fill"></i>
        </div>
        <div class="nav-item" @click="$router.push('/profile')">
          <i class="bi bi-person-fill"></i>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Carousel, Slide } from "vue3-carousel";
import "vue3-carousel/dist/carousel.css";
import "../styles/Home.css";

export default {
  name: "Home",
  components: { Carousel, Slide },
  data() {
    return {
      banners: [
        { image: "/tips_banner.png", label: "Strawberry 1" },
        { image: "/tips_banner.png", label: "Strawberry 2" },
        { image: "/tips_banner.png", label: "Strawberry 3" },
      ],
      cards: [
        { label: "Harvest", image: "/strawberries.png" },
        { label: "Recipe", image: "/strawberries.png" },
        { label: "Storage", image: "/strawberries.png" },
        { label: "Caring", image: "/strawberries.png" },
        { label: "Watering", image: "/strawberries.png" },
      ],
      strawberries: [
        { label: "Strawberry 1", image: "/strawberries.png" },
        { label: "Strawberry 2", image: "/strawberries.png" },
        { label: "Strawberry 3", image: "/strawberries.png" },
        { label: "Strawberry 4", image: "/strawberries.png" },
        { label: "Strawberry 5", image: "/strawberries.png" },
      ],
    };
  },
};
</script>