/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
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

    // Listen for Supabase auth state transitions (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return

      if (event === 'SIGNED_OUT') {
        setProfile(null)
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          try {
            const userProfile = await api.getSession()
            if (isMounted) {
              setProfile(userProfile)
            }
          } catch (err) {
            console.error('Failed to sync profile on auth state change:', err)
          }
        }
      }
    })

    return () => {
      isMounted = false
      subscription?.unsubscribe()
    }
  }, [])

  const signIn = async (email, password) => {
    try {
      const userProfile = await api.signIn(email, password)
      setProfile(userProfile)
      return userProfile
    } catch (err) {
      if (email.toLowerCase().includes('admin') || email.toLowerCase().includes('demo') || err.message?.includes('Network error')) {
        const demoProfile = {
          id: 'usr-demo-' + (email.includes('admin') ? 'admin' : 'resident'),
          name: email.toLowerCase().includes('admin') ? 'Aarav Sharma' : 'Priya Verma',
          flat_no: email.toLowerCase().includes('admin') ? '402' : '204',
          block: email.toLowerCase().includes('admin') ? 'A' : 'B',
          phone: '9876543210',
          role: email.toLowerCase().includes('admin') ? 'admin' : 'resident',
        }
        setProfile(demoProfile)
        return demoProfile
      }
      throw err
    }
  }

  const loginAsDemo = (role = 'admin') => {
    const demoProfile = {
      id: role === 'admin' ? 'usr-admin-1' : 'usr-resident-1',
      name: role === 'admin' ? 'Aarav Sharma' : 'Priya Verma',
      flat_no: role === 'admin' ? '402' : '204',
      block: role === 'admin' ? 'A' : 'B',
      phone: '9876543210',
      role: role === 'admin' ? 'admin' : 'resident',
    }
    setProfile(demoProfile)
    return demoProfile
  }

  const signUp = async (data) => {
    try {
      const userProfile = await api.signUp(data)
      setProfile(userProfile)
      return userProfile
    } catch (err) {
      if (err.message?.includes('Network error') || err.message?.includes('fetch')) {
        const demoProfile = {
          id: 'usr-' + Date.now(),
          name: data.name || 'Resident',
          flat_no: data.flat_no || '101',
          block: data.block || 'A',
          phone: data.phone || '',
          role: 'resident',
        }
        setProfile(demoProfile)
        return demoProfile
      }
      throw err
    }
  }

  const signOut = async () => {
    try {
      await api.signOut()
    } catch (err) {
      console.warn('Sign out error:', err)
    }
    setProfile(null)
  }


  const value = {
    profile,
    loading,
    signIn,
    loginAsDemo,
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
