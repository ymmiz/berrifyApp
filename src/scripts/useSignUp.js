// src/scripts/useSignUp.js
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth, db } from '../firebase'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

export function useSignUp() {
  const name = ref('')
  const email = ref('')
  const password = ref('')
  const confirmPassword = ref('')
  const loading = ref(false)
  const router = useRouter()

  const signUp = async () => {
    if (!name.value || !email.value || !password.value || !confirmPassword.value) {
      alert('Please fill in all fields.')
      return
    }
    if (password.value !== confirmPassword.value) {
      alert('Passwords do not match.')
      return
    }

    const normalizedEmail = email.value.trim().toLowerCase()

    try {
      loading.value = true

      const { user } = await createUserWithEmailAndPassword(auth, normalizedEmail, password.value)

      await updateProfile(user, { displayName: name.value })

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: name.value,
        email: normalizedEmail,
        role: 'user',
        onboarded: false,
        createdAt: serverTimestamp()
      })

      alert('Account created successfully!')
      router.push('/welcome')
    } catch (e) {
      console.error(e)
      const code = e?.code || ''
      if (code === 'auth/email-already-in-use') {
        alert('This email is already registered. Please log in instead.')
        // Pass the email to the sign-in page so you can prefill it there
        router.push({ path: '/signin', query: { email: normalizedEmail } })
      } else if (code === 'auth/weak-password') {
        alert('Password is too weak. Use at least 6 characters.')
      } else if (code === 'auth/invalid-email') {
        alert('Please enter a valid email address.')
      } else {
        alert('Sign up failed. Please try again.')
      }
    } finally {
      loading.value = false
    }
  }

  return { name, email, password, confirmPassword, signUp, loading }
}
