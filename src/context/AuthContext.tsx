import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react'
import { auth, db } from '../lib/firebase'
import type { UserProfile } from '../types'

interface AuthStateContextValue {
  user: User | null
  profile: UserProfile | null
}

interface AuthActionsContextValue {
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

interface AuthLoadingContextValue {
  loading: boolean
}

const AuthStateContext = createContext<AuthStateContextValue | undefined>(undefined)
const AuthActionsContext = createContext<AuthActionsContextValue | undefined>(undefined)
const AuthLoadingContext = createContext<AuthLoadingContextValue | undefined>(undefined)

const isValidUserProfile = (data: unknown): data is UserProfile => {
  if (!data || typeof data !== 'object') return false
  const profile = data as Record<string, unknown>
  return typeof profile.role === 'string'
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const resetAuth = useCallback(async () => {
    await signOut(auth)
    setUser(null)
    setProfile(null)
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          setUser(null)
          setProfile(null)
          return
        }

        const userSnap = await getDoc(doc(db, 'users', firebaseUser.uid))

        if (!userSnap.exists()) {
          await resetAuth()
          return
        }

        const data = userSnap.data()

        if (!isValidUserProfile(data) || data.disabled || data.role !== 'admin') {
          await resetAuth()
          return
        }

        setUser(firebaseUser)
        setProfile(data)
      } catch (error) {
        console.error('Auth state error:', error)
        await resetAuth()
      } finally {
        setLoading(false)
      }
    })

    return unsubscribe
  }, [resetAuth])

  const actions = useMemo<AuthActionsContextValue>(
    () => ({
      login: async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email, password)
      },
      logout: async () => {
        await signOut(auth)
      }
    }),
    []
  )

  const state = useMemo<AuthStateContextValue>(
    () => ({ user, profile }),
    [user, profile]
  )

  const loadingValue = useMemo<AuthLoadingContextValue>(
    () => ({ loading }),
    [loading]
  )

  return (
    <AuthLoadingContext.Provider value={loadingValue}>
      <AuthStateContext.Provider value={state}>
        <AuthActionsContext.Provider value={actions}>
          {children}
        </AuthActionsContext.Provider>
      </AuthStateContext.Provider>
    </AuthLoadingContext.Provider>
  )
}

export const useAuthState = (): AuthStateContextValue => {
  const context = useContext(AuthStateContext)
  if (!context) throw new Error('useAuthState must be used inside AuthProvider')
  return context
}

export const useAuthActions = (): AuthActionsContextValue => {
  const context = useContext(AuthActionsContext)
  if (!context) throw new Error('useAuthActions must be used inside AuthProvider')
  return context
}

export const useAuthLoading = (): AuthLoadingContextValue => {
  const context = useContext(AuthLoadingContext)
  if (!context) throw new Error('useAuthLoading must be used inside AuthProvider')
  return context
}

// للـ backward compatibility — بيجمع الـ 3 hooks في hook واحد
export const useAuth = () => {
  return {
    ...useAuthState(),
    ...useAuthActions(),
    ...useAuthLoading()
  }
}