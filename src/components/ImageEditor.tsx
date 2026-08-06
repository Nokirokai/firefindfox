import { useRef, useState, useCallback, useEffect } from 'react'
import { RotateCcw, RotateCw, ZoomIn, ZoomOut, Check, X } from 'lucide-react'
import { MONO } from '../types'

interface Props {
  src: string
  onConfirm: (blob: Blob) => void
  onCancel: () => void
}

const CANVAS_W = 800
const CANVAS_H = 600

export default function ImageEditor({ src, onConfirm, onCancel }: Props) {
  const previewRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 })
  const imgRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    const img = new Image()
    img.src = src
    img.onload = () => { imgRef.current = img }
  }, [src])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(true)
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y }
  }, [pos])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return
    setPos({
      x: dragStart.current.px + (e.clientX - dragStart.current.mx),
      y: dragStart.current.py + (e.clientY - dragStart.current.my),
    })
  }, [dragging])

  const onMouseUp = useCallback(() => setDragging(false), [])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0]
    setDragging(true)
    dragStart.current = { mx: t.clientX, my: t.clientY, px: pos.x, py: pos.y }
  }, [pos])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging) return
    const t = e.touches[0]
    setPos({
      x: dragStart.current.px + (t.clientX - dragStart.current.mx),
      y: dragStart.current.py + (t.clientY - dragStart.current.my),
    })
  }, [dragging])

  function handleConfirm() {
    const canvas = document.createElement('canvas')
    canvas.width = CANVAS_W
    canvas.height = CANVAS_H
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#F5F5F5'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    const preview = previewRef.current!
    const rect = preview.getBoundingClientRect()
    const scaleX = CANVAS_W / rect.width
    const scaleY = CANVAS_H / rect.height

    ctx.save()
    ctx.translate(
      (CANVAS_W / 2) + pos.x * scaleX,
      (CANVAS_H / 2) + pos.y * scaleY
    )
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.scale(scale * scaleX, scale * scaleY)
    if (imgRef.current) {
      ctx.drawImage(imgRef.current, -imgRef.current.width / 2, -imgRef.current.height / 2)
    }
    ctx.restore()

    canvas.toBlob((blob) => { if (blob) onConfirm(blob) }, 'image/jpeg', 0.92)
  }

  return (
    <div className="border border-[#0A0A0A] bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#E5E5E5] bg-[#F5F5F5]" style={{ fontFamily: MONO }}>
        <span className="text-xs text-[#737373] mr-1">EDIT PHOTO</span>

        <button onClick={() => setRotation((r) => r - 90)} className="p-1.5 border border-[#E5E5E5] hover:border-[#0A0A0A] transition-colors" title="Rotate left">
          <RotateCcw size={13} />
        </button>
        <button onClick={() => setRotation((r) => r + 90)} className="p-1.5 border border-[#E5E5E5] hover:border-[#0A0A0A] transition-colors" title="Rotate right">
          <RotateCw size={13} />
        </button>

        <div className="w-px h-4 bg-[#E5E5E5] mx-1" />

        <button onClick={() => setScale((s) => Math.max(0.2, s - 0.1))} className="p-1.5 border border-[#E5E5E5] hover:border-[#0A0A0A] transition-colors" title="Zoom out">
          <ZoomOut size={13} />
        </button>
        <input
          type="range" min={0.2} max={3} step={0.05}
          value={scale}
          onChange={(e) => setScale(Number(e.target.value))}
          className="w-24 accent-[#0A0A0A]"
        />
        <button onClick={() => setScale((s) => Math.min(3, s + 0.1))} className="p-1.5 border border-[#E5E5E5] hover:border-[#0A0A0A] transition-colors" title="Zoom in">
          <ZoomIn size={13} />
        </button>
        <span className="text-xs text-[#737373]">{Math.round(scale * 100)}%</span>

        <div className="ml-auto flex gap-2">
          <button
            onClick={() => { setScale(1); setRotation(0); setPos({ x: 0, y: 0 }) }}
            className="text-xs px-2 py-1 border border-[#E5E5E5] text-[#737373] hover:border-[#0A0A0A] transition-colors"
          >
            Reset
          </button>
          <button onClick={onCancel} className="p-1.5 border border-[#E5E5E5] text-[#737373] hover:border-[#0A0A0A] transition-colors">
            <X size={13} />
          </button>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[#0A0A0A] text-white hover:bg-[#737373] transition-colors"
          >
            <Check size={12} /> Use Photo
          </button>
        </div>
      </div>

      {/* Preview canvas */}
      <div
        ref={previewRef}
        className="relative overflow-hidden bg-[#F5F5F5] select-none"
        style={{ aspectRatio: '4/3', cursor: dragging ? 'grabbing' : 'grab' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onMouseUp}
      >
        <img
          src={src}
          alt="edit"
          draggable={false}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) rotate(${rotation}deg) scale(${scale})`,
            transformOrigin: 'center',
            maxWidth: 'none',
            pointerEvents: 'none',
          }}
        />
        <div className="absolute inset-0 border-2 border-dashed border-[#0A0A0A] opacity-20 pointer-events-none" />
      </div>

      <div className="px-3 py-1.5 text-xs text-[#737373] border-t border-[#E5E5E5]" style={{ fontFamily: MONO }}>
        drag to reposition · slider to zoom · rotate buttons to turn
      </div>
    </div>
  )
}
