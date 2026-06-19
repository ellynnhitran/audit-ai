import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { insforge } from '@/lib/insforge'

interface AuthUser {
  id: string
  email: string
  name?: string
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null; requiresVerification: boolean }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signIn: async () => ({ error: 'Not initialized' }),
  signUp: async () => ({ error: 'Not initialized', requiresVerification: false }),
  signOut: async () => {},
})

function toAuthUser(u: { id: string; email: string; profile?: { name?: string } | null }): AuthUser {
  return { id: u.id, email: u.email, name: u.profile?.name }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function hydrateAuth() {
      const { data, error } = await insforge.auth.getCurrentUser()
      if (cancelled) return
      if (error || !data?.user) {
        setUser(null)
      } else {
        setUser(toAuthUser(data.user))
      }
      setLoading(false)
    }

    void hydrateAuth()
    return () => { cancelled = true }
  }, [])

  async function signIn(email: string, password: string) {
    const { data, error } = await insforge.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    if (data?.user) setUser(toAuthUser(data.user))
    return { error: null }
  }

  async function signUp(email: string, password: string, name: string) {
    const { data, error } = await insforge.auth.signUp({ email, password, name })
    if (error) return { error: error.message, requiresVerification: false }
    if (data?.requireEmailVerification) {
      return { error: null, requiresVerification: true }
    }
    if (data?.user) setUser(toAuthUser(data.user))
    return { error: null, requiresVerification: false }
  }

  async function signOut() {
    await insforge.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
