import { useState, type FC } from 'react'
import { Search, MessageCircle, Home, Plus, LogIn, LogOut, Menu, X, UserCircle } from 'lucide-react'
import logo from '../imports/C__17_.png'
import type { Page } from '../types'
import { useAuth } from '../contexts/AuthContext'

const NAV_ITEMS: { page: Page; label: string; Icon: FC<{ size?: number; className?: string }> }[] = [
  { page: 'home', label: 'Home', Icon: Home },
  { page: 'browse', label: 'Browse', Icon: Search },
  { page: 'messages', label: 'Messages', Icon: MessageCircle },
]

export default function Navbar({
  page,
  setPage,
  unreadCount = 0,
}: {
  page: Page
  setPage: (p: Page) => void
  unreadCount?: number
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, profile, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    setPage('home')
    setMenuOpen(false)
  }

  return (
    <header className="border-b border-[#E5E5E5] bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        {/* Logo */}
        <button
          onClick={() => setPage('home')}
          className="flex items-center gap-2 hover:opacity-70 transition-opacity min-w-0"
        >
          <img src={logo} alt="FireFindFox" className="w-6 h-6 sm:w-7 sm:h-7 object-contain shrink-0" />
          <span
            className="text-base sm:text-lg font-bold tracking-tighter truncate"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            firefindfox
          </span>
        </button>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-6">
          {NAV_ITEMS.map(({ page: p, label, Icon }) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`relative flex items-center gap-1.5 text-sm transition-colors ${
                page === p ? 'text-[#0A0A0A] font-semibold' : 'text-[#737373] hover:text-[#0A0A0A]'
              }`}
            >
              <Icon size={15} />
              {label}
              {p === 'messages' && unreadCount > 0 && (
                <span
                  className="absolute -top-2 -right-3 min-w-[16px] h-4 px-1 flex items-center justify-center bg-red-500 text-white text-[10px] leading-none rounded-full"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Right */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <button
                onClick={() => setPage('profile')}
                className="hidden sm:flex items-center gap-1.5 text-sm text-[#737373] hover:text-[#0A0A0A] transition-colors"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                <UserCircle size={15} />
                {profile?.full_name || user.email?.split('@')[0]}
              </button>
              <button
                onClick={handleSignOut}
                className="hidden sm:flex items-center gap-1.5 text-sm text-[#737373] hover:text-[#0A0A0A] transition-colors"
              >
                <LogOut size={15} />
                Sign out
              </button>
            </>
          ) : (
            <button
              onClick={() => setPage('login')}
              className="hidden sm:flex items-center gap-1.5 text-sm text-[#737373] hover:text-[#0A0A0A] transition-colors"
            >
              <LogIn size={15} />
              Sign in
            </button>
          )}
          <button
            onClick={() => setPage(user ? 'create' : 'login')}
            className="flex items-center gap-1 sm:gap-1.5 bg-[#0A0A0A] text-white text-xs sm:text-sm px-3 sm:px-4 py-2 hover:bg-[#737373] transition-colors shrink-0"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            <Plus size={13} strokeWidth={2.5} />
            <span className="hidden xs:inline sm:inline">Post</span>
            <span className="hidden sm:inline"> Item</span>
          </button>
          <button
            className="sm:hidden p-1 text-[#0A0A0A]"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="sm:hidden border-t border-[#E5E5E5] bg-white px-4 py-3 flex flex-col gap-1">
          {NAV_ITEMS.map(({ page: p, label, Icon }) => (
            <button
              key={p}
              onClick={() => { setPage(p); setMenuOpen(false) }}
              className="relative flex items-center gap-2 text-sm text-left text-[#0A0A0A] py-2"
            >
              <Icon size={15} className="text-[#737373]" />
              {label}
              {p === 'messages' && unreadCount > 0 && (
                <span
                  className="min-w-[16px] h-4 px-1 flex items-center justify-center bg-red-500 text-white text-[10px] leading-none rounded-full ml-1"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          ))}
          {user ? (
            <>
              <button
                onClick={() => { setPage('profile'); setMenuOpen(false) }}
                className="flex items-center gap-2 text-sm text-left text-[#0A0A0A] py-2"
              >
                <UserCircle size={15} className="text-[#737373]" />
                {profile?.full_name || user.email?.split('@')[0] || 'Profile'}
              </button>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 text-sm text-left text-[#0A0A0A] py-2"
              >
                <LogOut size={15} className="text-[#737373]" />
                Sign out
              </button>
            </>
          ) : (
            <button
              onClick={() => { setPage('login'); setMenuOpen(false) }}
              className="flex items-center gap-2 text-sm text-left text-[#0A0A0A] py-2"
            >
              <LogIn size={15} className="text-[#737373]" />
              Sign in
            </button>
          )}
        </div>
      )}
    </header>
  )
}
