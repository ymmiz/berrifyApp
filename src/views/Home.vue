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

      <!-- My Strawberry (dynamic) -->
      <h1>My Strawberry</h1>

      <div v-if="plantsLoading" class="strawberry-container">
        <p>Loading plants…</p>
      </div>

      <div v-else class="strawberry-container">
        <div
          class="strawberry-card"
          v-for="card in strawberryCards"
          :key="card.id"
          @click="openPlantOnDiary(card)"
          role="button"
          style="cursor:pointer"
        >
          <img :src="card.image" :alt="card.label" />
          <p>{{ card.label }}</p>
        </div>

        <div v-if="strawberryCards.length === 0" class="empty-state">
          <p>No plants yet.</p>
          <button class="add-btn" @click="$router.push({ name: 'MyDiary' })">
            Add your first plant
          </button>
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

import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { getPlants } from "../scripts/plantService.js";

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
      plants: [],
      plantsLoading: true,
    };
  },
  computed: {
    // 1 → 2 → 3 by number in name
    strawberryCards() {
      const numFromName = (s = "") => {
        const m = String(s).match(/\d+/);
        return m ? parseInt(m[0], 10) : Number.MAX_SAFE_INTEGER;
      };
      return this.plants
        .slice()
        .sort((a, b) => numFromName(a.name) - numFromName(b.name))
        .map((p) => ({
          id: p.id,
          label: p.name || "Strawberry",
          image: p.last_photo_url || "/strawberries.png",
        }));
    },
  },
  mounted() {
    onAuthStateChanged(auth, async (user) => {
      if (user) await this.loadPlants();
      else this.plantsLoading = false;
    });
  },
  methods: {
    async loadPlants() {
      try {
        this.plantsLoading = true;
        this.plants = await getPlants();
      } catch (e) {
        console.error("Failed to load plants on Home:", e);
      } finally {
        this.plantsLoading = false;
      }
    },
    // Go to MyDiary and auto-scroll to that plant card
    openPlantOnDiary(card) {
      this.$router.push({
        name: "MyDiary",
        query: { plantId: card.id, plantName: card.label },
      });
    },
  },
};
</script>
