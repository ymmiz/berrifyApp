<template>
  <div class="page-container">
    <!-- Back Button -->
    <div class="back-button" @click="$router.push('/home')">
      <i class="bi bi-arrow-left"></i>
    </div>

    <!-- Page Header -->
    <div class="page-header">
      <h1 class="page-title">Tips</h1>
    </div>

    <!-- Page Content -->
    <div class="page-content">
      <!-- Strawberry Cycle Section -->
      <div class="cycle-card">
        <h2>Strawberry Cycle</h2>
        <img src="/strawberry_cycle.png" alt="Strawberry Cycle" />
        <ul class="cycle-steps">
          <li><span class="highlight">Germination</span> - Seeds sprout and grow leaves.</li>
          <li><span class="highlight">Vegetative Growth</span> - Plant develops roots, leaves, and a crown.</li>
          <li><span class="highlight">Flowering</span> - Flower buds form and bloom.</li>
          <li><span class="highlight">Pollination</span> - Flowers are pollinated, leading to fruit formation.</li>
          <li><span class="highlight">Fruit Development</span> - Fruit grows and ripens from green to red.</li>
          <li><span class="highlight">Harvest</span> - Ripe strawberries are picked.</li>
          <li><span class="highlight">Post-Harvest</span> - Plants may produce runners or go dormant.</li>
        </ul>
      </div>

      <!-- Strawberry Jam Recipe Section -->
      <div class="jam-card" style="margin-top: 32px;">
        <h2>Strawberry Jam Recipe</h2>
        <img src="/jam-image.png" alt="Jam Jar" />
        <div class="recipe-text">
          <h3>Ingredients:</h3>
          <ul>
            <li>4 cups organic strawberries (hulled and halved)</li>
            <li>1½ cups organic cane sugar (adjust to taste)</li>
            <li>2 tbsp organic lemon juice (freshly squeezed)</li>
          </ul>

          <h3>Instructions:</h3>
          <ol>
            <li>Mash Strawberries: Lightly mash in a saucepan.</li>
            <li>Cook: Add sugar and lemon juice. Stir over medium heat until sugar dissolves.</li>
            <li>Boil: Bring to a boil. Reduce and stir until thickened (20–30 minutes).</li>
          </ol>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import "../styles/Tips.css";

export default {
  name: "Tips"
};
</script>