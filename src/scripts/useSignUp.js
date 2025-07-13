import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '../firebase'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'

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
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.value,
        password.value
      )

      // Update display name
      await updateProfile(userCredential.user, {
        displayName: name.value
      })

      alert('Account created successfully!')
      router.push('/signin')
    } catch (e) {
      console.error(e.message)
      alert(e.message)
    }
  }

  return {
    name,
    email,
    password,
    confirmPassword,
    signUp
  }
}