import { useState } from 'react'
import { LogIn, AlertCircle, Eye, EyeOff, MailCheck } from 'lucide-react'
import type { Page } from '../types'
import { MONO } from '../types'
import { useAuth } from '../contexts/AuthContext'
import logo from '../imports/C__17_.png'

export default function LoginPage({ setPage }: { setPage: (p: Page) => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [confirmSent, setConfirmSent] = useState(false)

  const { signIn, signUp } = useAuth()

  async function handleSubmit() {
    setErrorMsg('')

    if (!email.trim() || !password) {
      setErrorMsg('Please enter your email and password.')
      return
    }

    setLoading(true)

    if (mode === 'login') {
      const error = await signIn(email, password)
      setLoading(false)
      if (error) setErrorMsg(error)
      else setPage('home')
      return
    }

    if (!name.trim()) { setErrorMsg('Please enter your full name.'); setLoading(false); return }

    const result = await signUp(email, password, name)
    setLoading(false)

    if (result.error) { setErrorMsg(result.error); return }
    if (result.alreadyRegistered) {
      setErrorMsg('That email is already registered. Try signing in instead.')
      setMode('login')
      return
    }
    // Only go home when a real session exists — with email confirmation on,
    // signing up does not sign you in, so show the "check your inbox" screen.
    if (result.signedIn) setPage('home')
    else setConfirmSent(true)
  }

  if (confirmSent) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 bg-[#F5F5F5]">
        <div className="bg-white border border-[#E5E5E5] p-8 w-full max-w-sm text-center">
          <div className="w-12 h-12 bg-[#0A0A0A] text-white flex items-center justify-center mx-auto mb-4">
            <MailCheck size={20} />
          </div>
          <h2 className="text-xl font-bold text-[#0A0A0A] mb-2" style={{ fontFamily: MONO }}>
            Check your inbox
          </h2>
          <p className="text-sm text-[#737373] mb-1">
            We sent a confirmation link to
          </p>
          <p className="text-sm font-semibold text-[#0A0A0A] break-all mb-4" style={{ fontFamily: MONO }}>
            {email.trim().toLowerCase()}
          </p>
          <p className="text-xs text-[#737373] mb-6">
            Open it to activate your account, then sign in. Check spam if it does not arrive
            within a few minutes.
          </p>
          <button
            onClick={() => { setConfirmSent(false); setMode('login'); setPassword(''); setErrorMsg('') }}
            className="w-full bg-[#0A0A0A] text-white text-sm py-3 hover:bg-[#737373] transition-colors"
            style={{ fontFamily: MONO }}
          >
            Back to sign in →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 bg-[#F5F5F5]">
      <div className="bg-white border border-[#E5E5E5] p-8 w-full max-w-sm">
        <div className="flex items-center gap-2 mb-2">
          <img src={logo} alt="FireFindFox" className="w-8 h-8 object-contain" />
          <span className="text-xs tracking-widest uppercase text-[#737373]" style={{ fontFamily: MONO }}>
            firefindfox
          </span>
        </div>

        <h2 className="text-2xl font-bold text-[#0A0A0A] mb-1" style={{ fontFamily: MONO }}>
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </h2>
        <p className="text-xs text-[#737373] mb-6">School email required · @student.tsu only</p>

        {errorMsg && (
          <div className="flex items-center gap-2 border border-red-300 bg-red-50 text-red-700 text-xs p-3 mb-4">
            <AlertCircle size={13} />
            {errorMsg}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {mode === 'signup' && (
            <input
              type="text"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-[#E5E5E5] px-4 py-2.5 text-sm text-[#0A0A0A] placeholder:text-[#737373] focus:outline-none focus:border-[#0A0A0A] bg-[#F5F5F5]"
            />
          )}
          <input
            type="email"
            placeholder="yourname@student.tsu.edu.ph"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            className="border border-[#E5E5E5] px-4 py-2.5 text-sm text-[#0A0A0A] placeholder:text-[#737373] focus:outline-none focus:border-[#0A0A0A] bg-[#F5F5F5]"
          />
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full border border-[#E5E5E5] pl-4 pr-11 py-2.5 text-sm text-[#0A0A0A] placeholder:text-[#737373] focus:outline-none focus:border-[#0A0A0A] bg-[#F5F5F5]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-0 top-0 h-full px-3 flex items-center text-[#737373] hover:text-[#0A0A0A] transition-colors"
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {mode === 'signup' && (
            <p className="text-xs text-[#737373]">At least 6 characters.</p>
          )}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-[#0A0A0A] text-white text-sm py-3 hover:bg-[#737373] transition-colors mt-1 disabled:opacity-50"
            style={{ fontFamily: MONO }}
          >
            <LogIn size={14} />
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </div>

        <div className="mt-4 text-xs text-center text-[#737373]">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setErrorMsg(''); setShowPassword(false) }}
            className="text-[#0A0A0A] underline"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </div>

        {mode === 'signup' && (
          <p className="mt-4 text-xs text-center text-[#737373]">
            Check your email for a confirmation link after signing up.
          </p>
        )}
      </div>
    </div>
  )
}
