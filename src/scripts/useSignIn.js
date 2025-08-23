import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '../firebase'
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'

export function useSignIn(emailRef, passwordRef) {
  const isLoading = ref(false)
  const router = useRouter()

  const signInWithEmail = async () => {
    const email = (emailRef.value || '').trim()
    const password = passwordRef.value || ''

    if (!email || !password) {
      alert('Please enter both email and password.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      alert('Please enter a valid email address.')
      return
    }

    try {
      isLoading.value = true
      await signInWithEmailAndPassword(auth, email, password)
      router.push('/home')
    } catch (e) {
      console.error('Firebase sign-in error:', e)
      handleFirebaseError(e)
    } finally {
      isLoading.value = false
    }
  }

  const signInWithGoogle = async () => {
    try {
      isLoading.value = true
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
      router.push('/home')
    } catch (e) {
      console.error(e)
      alert(e.message)
    } finally {
      isLoading.value = false
    }
  }

  const forgotPassword = () => {
    alert('Redirect to password reset page (implement separately)')
  }

  return { isLoading, signInWithEmail, signInWithGoogle, forgotPassword }
}

function handleFirebaseError(e) {
  const code = e.code
  switch (code) {
    case 'auth/invalid-email': alert('Invalid email format.'); break
    case 'auth/user-not-found': alert('No user found with this email.'); break
    case 'auth/wrong-password': alert('Incorrect password.'); break
    case 'auth/too-many-requests': alert('Too many failed attempts. Please try again later.'); break
    default: alert('Login failed: ' + e.message)
  }
}
