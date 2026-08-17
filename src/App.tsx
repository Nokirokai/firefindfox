import { useState, useCallback, useEffect } from 'react'
import type { Page, Listing } from './types'
import Navbar from './components/Navbar'
import LoadingScreen from './components/LoadingScreen'
import MessageToast from './components/MessageToast'
import HomePage from './pages/HomePage'
import BrowsePage from './pages/BrowsePage'
import ListingDetailPage from './pages/ListingDetailPage'
import MessagesPage from './pages/MessagesPage'
import LoginPage from './pages/LoginPage'
import CreateListingPage from './pages/CreateListingPage'
import ProfilePage from './pages/ProfilePage'
import EditListingPage from './pages/EditListingPage'
import { useAuth } from './contexts/AuthContext'
import { useMessageNotifications } from './hooks/useMessages'

export default function App() {
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState<Page>('home')
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null)
  const [openConversationId, setOpenConversationId] = useState<string | null>(null)

  const { user } = useAuth()
  const notif = useMessageNotifications(user?.id ?? null)

  const handleLoadDone = useCallback(() => setLoading(false), [])

  // Signed-out visitors can browse the storefront (home, listings, detail);
  // posting, messaging, saving, and profiles still require a TSU login.
  const PUBLIC_PAGES: Page[] = ['home', 'login', 'browse', 'listing']

  const handleSetPage = useCallback((p: Page) => {
    // Guard routes that need state or auth so we never land on a blank screen.
    if ((p === 'listing' || p === 'edit-listing') && !selectedListing) p = 'browse'
    if (!user && !PUBLIC_PAGES.includes(p)) p = 'login'
    if (p !== 'messages') setOpenConversationId(null)
    setPage(p)
    window.scrollTo(0, 0)
  }, [selectedListing, user])

  // Signing out from a private page drops the visitor back on the landing page.
  useEffect(() => {
    if (!user && !PUBLIC_PAGES.includes(page)) setPage('home')
  }, [user, page])

  function openNotification() {
    if (notif.notification) setOpenConversationId(notif.notification.conversationId)
    setPage('messages')
    notif.dismissNotification()
  }

  return (
    <>
      {loading && <LoadingScreen onDone={handleLoadDone} />}

      <div className="min-h-screen bg-white" style={{ visibility: loading ? 'hidden' : 'visible' }}>
        <Navbar page={page} setPage={handleSetPage} unreadCount={notif.unreadTotal} />

        {page === 'home' && (
          <HomePage setPage={handleSetPage} setSelectedListing={setSelectedListing} />
        )}
        {page === 'browse' && (
          <BrowsePage setPage={handleSetPage} setSelectedListing={setSelectedListing} />
        )}
        {page === 'listing' && selectedListing && (
          <ListingDetailPage listing={selectedListing} setPage={handleSetPage} />
        )}
        {page === 'messages' && (
          <MessagesPage
            openConversationId={openConversationId}
            unreadByConvo={notif.unreadByConvo}
            markRead={notif.markRead}
          />
        )}
        {page === 'create' && <CreateListingPage setPage={handleSetPage} />}
        {page === 'login' && <LoginPage setPage={handleSetPage} />}
        {page === 'profile' && <ProfilePage setPage={handleSetPage} setSelectedListing={setSelectedListing} />}
        {page === 'edit-listing' && selectedListing && <EditListingPage listing={selectedListing} setPage={handleSetPage} />}
      </div>

      {!loading && user && notif.notification && page !== 'messages' && (
        <MessageToast
          notification={notif.notification}
          onOpen={openNotification}
          onDismiss={notif.dismissNotification}
        />
      )}
    </>
  )
}
