import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'

export interface SignUpResult {
  error: string | null
  /** Account created but the email must be confirmed before signing in. */
  needsConfirmation: boolean
  /** Supabase reports success for existing emails; this flags that case. */
  alreadyRegistered: boolean
  /** A session was created immediately (email confirmation disabled). */
  signedIn: boolean
}

interface AuthContextValue {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signUp: (email: string, password: string, fullName: string) => Promise<SignUpResult>
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const DEFAULT: AuthContextValue = {
  user: null,
  session: null,
  profile: null,
  loading: true,
  signUp: async () => ({ error: null, needsConfirmation: false, alreadyRegistered: false, signedIn: false }),
  signIn: async () => null,
  signOut: async () => {},
}

const AuthContext = createContext<AuthContextValue>(DEFAULT)

export function AuthProvider({ children }: { children: ReactNode }) {
  // Provides real auth values — DEFAULT is only the fallback before this mounts
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      if (data.session?.user) fetchProfile(data.session.user)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user)
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(authUser: User) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle()

    if (data) { setProfile(data as Profile); return }

    // Self-heal: if no profile row exists (no DB trigger, or signup happened
    // before one was added), create it from the auth metadata.
    const { data: created } = await supabase
      .from('profiles')
      .insert({
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name ?? authUser.email?.split('@')[0] ?? null,
      })
      .select('*')
      .maybeSingle()

    if (created) setProfile(created as Profile)
  }

  async function signUp(email: string, password: string, fullName: string): Promise<SignUpResult> {
    const fail = (error: string): SignUpResult =>
      ({ error, needsConfirmation: false, alreadyRegistered: false, signedIn: false })

    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail.endsWith('@student.tsu.edu.ph')) {
      return fail('Only @student.tsu.edu.ph email addresses are allowed.')
    }
    if (password.length < 6) {
      return fail('Password must be at least 6 characters.')
    }

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: window.location.origin,
      },
    })
    if (error) return fail(error.message)

    // Supabase returns a user with no identities when the email is taken,
    // rather than an error — otherwise signup would leak who is registered.
    const alreadyRegistered = !!data.user && (data.user.identities?.length ?? 0) === 0
    const signedIn = !!data.session

    return {
      error: null,
      alreadyRegistered,
      signedIn,
      needsConfirmation: !signedIn && !alreadyRegistered,
    }
  }

  async function signIn(email: string, password: string): Promise<string | null> {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (!error) return null
    // Make the most common failure actionable instead of cryptic.
    if (/email not confirmed/i.test(error.message)) {
      return 'Please confirm your email first — check your inbox for the link.'
    }
    return error.message
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
