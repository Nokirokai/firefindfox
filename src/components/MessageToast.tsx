import { useEffect } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { MONO } from '../types'
import type { MessageNotification } from '../hooks/useMessages'

export default function MessageToast({
  notification,
  onOpen,
  onDismiss,
}: {
  notification: MessageNotification
  onOpen: () => void
  onDismiss: () => void
}) {
  // Auto-dismiss; keyed by message time so a new arrival restarts the timer.
  useEffect(() => {
    const t = setTimeout(onDismiss, 7000)
    return () => clearTimeout(t)
  }, [notification.at, onDismiss])

  return (
    <div className="fixed z-[60] bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-80 animate-[slideUp_.22s_ease-out]">
      <div className="border border-[#0A0A0A] bg-white shadow-[4px_4px_0_#0A0A0A]">
        <div className="flex items-start gap-2.5 px-3.5 py-3">
          <div className="bg-[#0A0A0A] text-white p-1.5 shrink-0">
            <MessageCircle size={14} />
          </div>
          <button onClick={onOpen} className="min-w-0 flex-1 text-left">
            <div className="text-xs font-semibold text-[#0A0A0A] truncate" style={{ fontFamily: MONO }}>
              {notification.from}
            </div>
            <div className="text-xs text-[#737373] truncate" style={{ fontFamily: MONO }}>
              re: {notification.listingTitle}
            </div>
            <div className="text-sm text-[#0A0A0A] mt-1 line-clamp-2 break-words">
              {notification.preview}
            </div>
            <div className="text-xs text-[#0A0A0A] underline mt-1.5" style={{ fontFamily: MONO }}>
              Open chat →
            </div>
          </button>
          <button onClick={onDismiss} className="text-[#737373] hover:text-[#0A0A0A] shrink-0" aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
