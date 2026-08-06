import { useEffect, useState } from 'react'
import logo from '../imports/C__17_.png'
import { MONO } from '../types'

export default function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 600)
    const t2 = setTimeout(() => setPhase('out'), 2200)
    const t3 = setTimeout(() => onDone(), 2800)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])

  return (
    <div
      className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center"
      style={{
        opacity: phase === 'out' ? 0 : 1,
        transition: phase === 'out' ? 'opacity 0.6s ease' : phase === 'in' ? 'opacity 0.4s ease' : undefined,
      }}
    >
      {/* Logo */}
      <div
        style={{
          transform: phase === 'in' ? 'scale(0.85)' : 'scale(1)',
          opacity: phase === 'in' ? 0 : 1,
          transition: 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease',
        }}
      >
        <img
          src={logo}
          alt="FireFindFox logo"
          className="w-24 h-24 object-contain"
        />
      </div>

      {/* Wordmark + tagline */}
      <div
        className="mt-6 text-center"
        style={{
          opacity: phase === 'in' ? 0 : 1,
          transform: phase === 'in' ? 'translateY(8px)' : 'translateY(0)',
          transition: 'opacity 0.5s ease 0.15s, transform 0.5s ease 0.15s',
        }}
      >
        <div
          className="text-3xl font-bold tracking-tighter text-[#0A0A0A]"
          style={{ fontFamily: MONO }}
        >
          firefindfox
        </div>
        <div className="text-xs text-[#737373] mt-1 tracking-widest uppercase" style={{ fontFamily: MONO }}>
          campus marketplace · @student.tsu.edu.ph
        </div>
      </div>

      {/* Credit */}
      <div
        className="absolute bottom-10 text-center"
        style={{
          opacity: phase === 'in' ? 0 : 1,
          transition: 'opacity 0.6s ease 0.3s',
        }}
      >
        <div className="text-xs text-[#737373]" style={{ fontFamily: MONO }}>
          by Angel Bitangcol
        </div>
        <div className="text-xs text-[#B0B0B0] mt-0.5" style={{ fontFamily: MONO }}>
          BSIT 4 · CCS · TSU · 2026
        </div>
      </div>

      {/* Thin progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F5F5F5]">
        <div
          className="h-full bg-[#0A0A0A]"
          style={{
            width: phase === 'in' ? '0%' : phase === 'hold' ? '80%' : '100%',
            transition: phase === 'in'
              ? 'width 0.6s ease'
              : phase === 'hold'
              ? 'width 1.6s ease'
              : 'width 0.5s ease',
          }}
        />
      </div>
    </div>
  )
}
