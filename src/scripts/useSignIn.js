import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '../firebase'
import {signInWithEmailAndPassword,GoogleAuthProvider,signInWithPopup} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase' 

export function useSignIn() {
  const email = ref('')
  const password = ref('')
  const router = useRouter()

  const signInWithEmail = async () => {
    try {
      await signInWithEmailAndPassword(auth, email.value, password.value)
      
      const docRef = doc(db, 'users', auth.currentUser.uid)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const userData = docSnap.data()
        if (!userData.user_type) {
          router.push('/select-user-type')
        } else {
          router.push('/profile')
        }
      } else {
        await setDoc(docRef, {
          name: auth.currentUser.displayName || "",
          email: auth.currentUser.email,
          user_type: null,
          join_date: new Date()
        })
        router.push('/select-user-type')
      }

    } catch (e) {
      console.error(e)
      alert(e.message)
    }
  }
  const signInWithGoogle = async () => {
    try {
        const provider = new GoogleAuthProvider()
        await signInWithPopup(auth, provider)
        
        const docRef = doc(db, 'users', auth.currentUser.uid)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const userData = docSnap.data()
          if (!userData.user_type) {
            router.push('/select-user-type')
          } else {
            router.push('/profile')
          }
        } else {
          await setDoc(docRef, {
            name: auth.currentUser.displayName || "",
            email: auth.currentUser.email,
            user_type: null,
            join_date: new Date()
          })
          router.push('/select-user-type')
        }
      } catch (e) {
        console.error(e.message)
        alert(e.message)
      }
  }
  const forgotPassword = () => {
  alert('Redirect to password reset page (implement separately)')
  }
  return {
    email,
    password,
    signInWithEmail,
    signInWithGoogle,
    forgotPassword,
  }
}