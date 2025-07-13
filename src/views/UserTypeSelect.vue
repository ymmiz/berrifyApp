<template>
  <div class="container">
    <h2>Welcome to Berrify</h2>
    <p>Choose how you want to analyze your strawberries</p>

    <div
      v-for="option in userTypes"
      :key="option.value"
      :class="['option-box', selectedType === option.value ? 'selected' : '']"
      @click="selectType(option.value)"
    >
      <div class="icon">{{ option.icon }}</div>
      <div class="content">
        <h3>{{ option.title }}</h3>
        <p>{{ option.subtitle }}</p>
      </div>
    </div>

    <button
      class="continue-btn"
      :disabled="!selectedType"
      @click="saveUserType"
    >
      Continue
    </button>
  </div>
</template>

<script setup>
import useUserTypeSelect from '../scripts/UserTypeSelect.js'
import '../styles/UserTypeSelect.css'

const {
  userTypes,
  selectedType,
  selectType,
  saveUserType
} = useUserTypeSelect()
</script>