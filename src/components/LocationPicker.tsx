import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, MapPin, Search, Check, Plus } from 'lucide-react'
import { MONO } from '../types'
import { LOCATION_GROUPS, ALL_LOCATIONS } from '../data/locations'

/**
 * Searchable meet-up point picker. Falls back to whatever the seller types when
 * their spot is not on the list.
 */
export default function LocationPicker({
  value,
  onChange,
  id,
}: {
  value: string
  onChange: (v: string) => void
  id?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return LOCATION_GROUPS
    return LOCATION_GROUPS
      .map((g) => ({
        ...g,
        options: g.options.filter(
          (o) => o.label.toLowerCase().includes(q) || g.group.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.options.length > 0)
  }, [query])

  const trimmed = query.trim()
  const exactMatch = ALL_LOCATIONS.some(
    (o) => o.label.toLowerCase() === trimmed.toLowerCase() || o.value.toLowerCase() === trimmed.toLowerCase()
  )
  const canUseCustom = trimmed.length > 0 && !exactMatch

  // Show the friendly label for known values, raw text for custom ones.
  const display = ALL_LOCATIONS.find((o) => o.value === value)?.label || value

  useEffect(() => {
    if (!open) return
    searchRef.current?.focus()
    function onDocDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [open])

  function select(v: string) {
    onChange(v)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full flex items-center gap-2 border border-[#E5E5E5] bg-[#F5F5F5] px-4 py-2.5 text-sm text-left text-[#0A0A0A] focus:outline-none focus:border-[#0A0A0A] hover:border-[#0A0A0A] transition-colors"
        style={{ fontFamily: MONO }}
      >
        <MapPin size={13} className="text-[#737373] shrink-0" />
        <span className={`flex-1 truncate ${display ? '' : 'text-[#737373]'}`}>
          {display || 'Select a meet-up point'}
        </span>
        <ChevronDown size={14} className={`text-[#737373] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-40 left-0 right-0 mt-1 border border-[#0A0A0A] bg-white shadow-[4px_4px_0_#0A0A0A]">
          {/* Search */}
          <div className="flex items-center gap-2 border-b border-[#E5E5E5] px-3 py-2">
            <Search size={13} className="text-[#737373] shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { e.preventDefault(); setOpen(false); return }
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const first = groups[0]?.options[0]
                  if (first) select(first.value)
                  else if (canUseCustom) select(trimmed)
                }
              }}
              placeholder="Search or type your own..."
              className="flex-1 min-w-0 bg-transparent text-sm text-[#0A0A0A] placeholder:text-[#737373] focus:outline-none"
            />
          </div>

          <div className="max-h-64 overflow-y-auto overscroll-contain">
            {canUseCustom && (
              <button
                type="button"
                onClick={() => select(trimmed)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm border-b border-[#E5E5E5] hover:bg-[#F5F5F5]"
              >
                <Plus size={13} className="text-[#737373] shrink-0" />
                <span className="truncate">
                  Use "<span className="font-semibold">{trimmed}</span>"
                </span>
              </button>
            )}

            {groups.length === 0 && !canUseCustom && (
              <p className="px-3 py-4 text-xs text-[#737373]" style={{ fontFamily: MONO }}>
                No matches — type to add your own.
              </p>
            )}

            {groups.map((g) => (
              <div key={g.group}>
                <div
                  className="sticky top-0 bg-[#F5F5F5] px-3 py-1.5 text-xs tracking-wider uppercase text-[#737373] border-y border-[#E5E5E5]"
                  style={{ fontFamily: MONO }}
                >
                  {g.group}
                </div>
                {g.options.map((o) => (
                  <button
                    key={`${g.group}:${o.value}`}
                    type="button"
                    onClick={() => select(o.value)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[#F5F5F5] ${
                      value === o.value ? 'bg-[#0A0A0A] text-white hover:bg-[#0A0A0A]' : 'text-[#0A0A0A]'
                    }`}
                  >
                    <span className="flex-1 truncate">{o.label}</span>
                    {value === o.value && <Check size={13} className="shrink-0" />}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
