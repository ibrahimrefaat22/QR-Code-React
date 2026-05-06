import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Team } from '../types'

interface TeamsContextValue {
  teams: Team[]
  loading: boolean
}

const TeamsContext = createContext<TeamsContextValue>({
  teams: [],
  loading: true
})

export const TeamsProvider = ({ children }: { children: ReactNode }) => {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'teams'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setTeams(
          snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Team, 'id'>)
          }))
        )
        setLoading(false)
      },
      (error) => {
        console.error('Teams listener error:', error)
        setLoading(false)
      }
    )
    return unsubscribe
  }, [])

  const value = useMemo(() => ({ teams, loading }), [teams, loading])

  return <TeamsContext.Provider value={value}>{children}</TeamsContext.Provider>
}

export const useTeams = (): TeamsContextValue => {
  return useContext(TeamsContext)
}