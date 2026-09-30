/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    async function initSession() {
      try {
        const sessionProfile = await api.getSession()
        if (isMounted) {
          setProfile(sessionProfile)
        }
      } catch (err) {
        console.error('Failed to get session:', err)
        if (isMounted) {
          setProfile(null)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    initSession()

    return () => {
      isMounted = false
    }
  }, [])

  const signIn = async (email, password) => {
    const userProfile = await api.signIn(email, password)
    setProfile(userProfile)
    return userProfile
  }

  const signUp = async (data) => {
    const userProfile = await api.signUp(data)
    setProfile(userProfile)
    return userProfile
  }

  const signOut = async () => {
    await api.signOut()
    setProfile(null)
  }

  const value = {
    profile,
    loading,
    signIn,
    signUp,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
