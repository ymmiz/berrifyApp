import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth, db } from '../firebase'
import { doc, updateDoc } from 'firebase/firestore'

export default function useUserTypeSelect() {
  const router = useRouter()
  const selectedType = ref(null)

  const userTypes = [
    {
      value: 'hardware',
      title: 'Hardware Only',
      subtitle: 'Use specialized hardware device',
      icon: '🖥️'
    },
    {
      value: 'phone',
      title: 'Phone Only',
      subtitle: 'Use your phone camera',
      icon: '📱'
    },
    {
      value: 'both',
      title: 'Both',
      subtitle: 'Combine hardware and phone',
      icon: '⚡'
    }
  ]

  const selectType = async (type) => {
    const user = auth.currentUser
    if (!user) {
      alert('Not logged in!')
      return
    }

    const userRef = doc(db, 'users', user.uid)
    await updateDoc(userRef, {
      user_type: type
    })

    if (type === 'phone' || type === 'both') {
      router.push('/line-login')
    } else {
      router.push('/profile')
    }
  }

  const saveUserType = async () => {
    try {
      const user = auth.currentUser
      if (!user) {
        alert('Not logged in!')
        return
      }

      const userRef = doc(db, 'users', user.uid)
      await updateDoc(userRef, {
        user_type: selectedType.value
      })

      if (selectedType.value === 'phone' || selectedType.value === 'both') {
        router.push('/line-login')
      } else {
        router.push('/profile')
      }
    } catch (e) {
      console.error(e)
      alert('Failed to save user type.')
    }
  }

  return {
    userTypes,
    selectedType,
    selectType,
    saveUserType
  }
}