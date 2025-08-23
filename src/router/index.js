import { createRouter, createWebHistory } from 'vue-router'
import SignIn from '../views/SignIn.vue'
import SignUp from '../views/SignUp.vue'
import WelcomePage from '../views/WelcomePage.vue'
import Home from '../views/Home.vue'
import Tips from '../views/Tips.vue'
import MyDiary from '@/views/MyDiary.vue'
import UserTypeSelect from '../views/UserTypeSelect.vue'
import UserProfile from '@/views/UserProfile.vue'
import Diary from '../views/Diary.vue'
import PlantOverview from '@/views/PlantOverview.vue'
import ForgotPassword from '@/views/ForgotPassword.vue'

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
    path: '/select-user-type',
    name: 'SelectUserType',
    component: UserTypeSelect
  },
  {
    path: '/profile',
    name: 'UserProfile',
    component: UserProfile
  },
  {
    path: '/plant/:plantId', 
    name: 'PlantOverview',
    component: PlantOverview
  },
  {
    path: '/diary/:plantId',
    name: 'Diary',
    component: Diary
  }

]
const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router