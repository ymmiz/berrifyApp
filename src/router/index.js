import { createRouter, createWebHistory } from 'vue-router'
import SignIn from '../views/SignIn.vue'
import SignUp from '../views/SignUp.vue'
import UserTypeSelect from '../views/UserTypeSelect.vue'
import UserProfile from '@/views/UserProfile.vue'

const routes = [
  {
    path: '/signin',
    name: 'SignIn',
    component: SignIn
  },
  {
    path: '/signup',
    name: 'SignUp',
    component: SignUp 
  },
  {
    path: '/select-user-type',
    name: 'SelectUserType',
    component: UserTypeSelect
  },
  {
    path: '/profile',
    name: 'UserProfile',
    component: UserProfile
  }

]
const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router