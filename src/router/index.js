import { createRouter, createWebHistory } from 'vue-router'
import SignIn from '../views/SignIn.vue'
import SignUp from '../views/SignUp.vue'
import WelcomePage from '../views/WelcomePage.vue'
import Home from '../views/Home.vue'
import Tips from '../views/Tips.vue'
import MyDiary from '@/views/MyDiary.vue'
import Setting from '@/views/Setting.vue'
import PlantScan from '../views/PlantScan.vue'
import UserProfile from '@/views/UserProfile.vue'
import ForgotPassword from '@/views/ForgotPassword.vue'
import HardwareAnalysis from '@/views/HardwareAnalysis.vue'
import PhotoList from '@/views/PhotoList.vue'

const routes = [

  {
    path: '/signin',
    name: 'SignIn',
    component: SignIn
  },
  {
    path: '/home',
    name: 'Home',
    component: Home
  },
  {
    path: '/tips',
    name: 'Tips',
    component: Tips
  },
  {
    path : '/mydiary',
    name: 'MyDiary',
    component: MyDiary
  },
  {
    path : '/setting',
    name: 'Setting',
    component: Setting
  },
  {
  path: '/forgot-password',
  name: 'ForgotPassword',
  component: ForgotPassword
  },
  {
    path: '/',
    name: 'SignUp',
    component: SignUp 
  },
  {
    path: '/welcome',
    name: 'WelcomePage',
    component: WelcomePage
  },
  {
    path: '/phone',
    name: 'PlantScan',
    component: PlantScan
  },
  {
    path: '/hardware',
    name: 'HardwareAnalysis',
    component: HardwareAnalysis
  },
  {
    path: '/photolist',
    name: 'PhotoList',
    component: PhotoList
  },
  {
    path: '/profile',
    name: 'UserProfile',
    component: UserProfile
  }
  // {
  //   path: '/profile',
  //   name: 'profile',
  //   component: profile
  // }

]
const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router