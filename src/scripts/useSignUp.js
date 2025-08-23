import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth, db } from '../firebase'                       // ✅ get db
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore' // ✅ Firestore APIs

export function useSignUp() {
  const name = ref('')
  const email = ref('')
  const password = ref('')
  const confirmPassword = ref('')
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

    try {
      const { user } = await createUserWithEmailAndPassword(auth, email.value, password.value)

      // Keep them signed in, but also set their display name
      await updateProfile(user, { displayName: name.value })

      // ✅ Create users/{uid} in Firestore so they appear in your database
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: name.value,
        email: email.value.toLowerCase(),
        role: 'user',
        onboarded: false,
        createdAt: serverTimestamp()
      })

      alert('Account created successfully!')
      router.push('/welcome')
    } catch (e) {
      console.error(e)
      alert(e.message || 'Sign up failed')
    }
  }

  return { name, email, password, confirmPassword, signUp }
}