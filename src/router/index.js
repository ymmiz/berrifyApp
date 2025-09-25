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
import PhoneHarvest from '@/views/PhoneHarvest.vue'
import AdminLogin from '@/views/AdminLogin.vue'
import AdminPage from '@/views/AdminPage.vue'

import { auth } from '@/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import AnalysisView from '@/views/AnalysisView.vue'
import PhotoListHardware from '@/views/PhotoListHardware.vue'
import HardwareHarvest from '@/views/HardwareHarvest.vue'

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
    path: '/photohardware',
    name: 'PhotoListHardware',
    component: PhotoListHardware
  },
  {
    path: '/profile',
    name: 'UserProfile',
    component: UserProfile
  },
  {
    path: '/phoneharvest',
    name: 'PhoneHarvest',
    component: PhoneHarvest
  },

  {
    path: '/adminlogin',
    name: 'AdminLogin',
    component: AdminLogin
  },
  {
    path: '/adminpage',
    name: 'AdminPage',
    component: AdminPage
  },
  {
    path: '/analysis',
    name: 'AnalysisView',
    component: AnalysisView,
  },
  {
    path: '/hardwareharvest',
    name: 'HardwareHarvest',
    component: HardwareHarvest,
  }
]
const router = createRouter({
  history: createWebHistory(),
  routes,
  linkActiveClass: 'router-link-active',
  linkExactActiveClass: 'router-link-exact-active'
})

function waitForUser() {
  if (auth.currentUser) return Promise.resolve(auth.currentUser)
  return new Promise(resolve => {
    const off = onAuthStateChanged(auth, user => {
      off()
      resolve(user || null)
    })
  })
}


// fetch ID token + claims (admin flag), forcing a refresh so new claims appear
async function getAdminClaim(user) {
  if (!user) return false
  try {
    await user.getIdToken(true)
    const res = await user.getIdTokenResult()
    return res.claims?.admin === true
  } catch {
    return false
  }
}

// --- global guard ----------------------------------------------------------
router.beforeEach(async (to, from, next) => {
  const user = await waitForUser()

  // pages for guests only
  if (to.meta.guestOnly) {
    if (!user) return next()
    const isAdmin = await getAdminClaim(user)
    return isAdmin ? next({ name: 'AdminPage' }) : next() // non-admin can stay on login if you prefer
  }

  // admin-protected pages
  if (to.meta.requiresAdmin) {
    if (!user) return next({ name: 'AdminLogin', query: { redirect: to.fullPath } })
    const isAdmin = await getAdminClaim(user)
    return isAdmin
      ? next()
      : next({ name: 'AdminLogin', query: { reason: 'not_admin', redirect: to.fullPath } })
  }

  // everything else
  return next()
})

export default router