import { useRef, useState } from 'react'
import { ImagePlus, X, Pencil, ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { MONO } from '../types'
import ImageEditor from './ImageEditor'

export interface ImageItem {
  id: string
  preview: string       // object URL or existing URL
  file: File | null     // null = existing uploaded image
  isExisting: boolean
}

interface Props {
  images: ImageItem[]
  onChange: (images: ImageItem[]) => void
  max?: number
}

export default function MultiImageUpload({ images, onChange, max = 5 }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [rawSrc, setRawSrc] = useState<string | null>(null)

  const editingItem = images.find((img) => img.id === editingId) ?? null

  function openPicker() {
    fileRef.current?.click()
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const remaining = max - images.length
    const toAdd = files.slice(0, remaining)
    e.target.value = ''

    if (toAdd.length === 0) return

    // Open editor for the first new file; queue the rest
    const first = toAdd[0]
    const url = URL.createObjectURL(first)
    const newId = crypto.randomUUID()
    const rest = toAdd.slice(1).map((f) => ({
      id: crypto.randomUUID(),
      preview: URL.createObjectURL(f),
      file: f,
      isExisting: false,
    }))

    // Add rest immediately, edit first
    onChange([...images, ...rest, { id: newId, preview: url, file: first, isExisting: false }])
    setRawSrc(url)
    setEditingId(newId)
  }

  function handleEditorConfirm(blob: Blob) {
    if (!editingId) return
    const url = URL.createObjectURL(blob)
    const file = new File([blob], 'listing.jpg', { type: 'image/jpeg' })
    onChange(images.map((img) =>
      img.id === editingId ? { ...img, preview: url, file } : img
    ))
    setEditingId(null)
    setRawSrc(null)
  }

  function handleEditorCancel() {
    if (!editingId) return
    // If this was a brand-new item (not existing), remove it
    const item = images.find((img) => img.id === editingId)
    if (item && !item.isExisting) {
      onChange(images.filter((img) => img.id !== editingId))
    }
    setEditingId(null)
    setRawSrc(null)
  }

  function removeImage(id: string) {
    onChange(images.filter((img) => img.id !== id))
  }

  function moveImage(id: string, dir: -1 | 1) {
    const idx = images.findIndex((img) => img.id === id)
    if (idx < 0) return
    const next = idx + dir
    if (next < 0 || next >= images.length) return
    const arr = [...images]
    ;[arr[idx], arr[next]] = [arr[next], arr[idx]]
    onChange(arr)
  }

  function openEditor(item: ImageItem) {
    setRawSrc(item.preview)
    setEditingId(item.id)
  }

  if (editingId && rawSrc) {
    return (
      <ImageEditor
        src={rawSrc}
        onConfirm={handleEditorConfirm}
        onCancel={handleEditorCancel}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {images.map((img, idx) => (
            <div key={img.id} className="relative group aspect-square border border-[#E5E5E5] overflow-hidden bg-[#F5F5F5]">
              <img src={img.preview} alt="" className="w-full h-full object-cover" />

              {/* Primary badge */}
              {idx === 0 && (
                <div className="absolute top-1 left-1">
                  <span className="flex items-center gap-0.5 text-[10px] bg-[#0A0A0A] text-white px-1.5 py-0.5" style={{ fontFamily: MONO }}>
                    <Star size={8} fill="white" /> Main
                  </span>
                </div>
              )}

              {/* Overlay controls */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                {idx > 0 && (
                  <button
                    type="button"
                    onClick={() => moveImage(img.id, -1)}
                    className="p-1 bg-white text-[#0A0A0A] hover:bg-[#F5F5F5] transition-colors"
                    title="Move left"
                  >
                    <ChevronLeft size={12} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openEditor(img)}
                  className="p-1 bg-white text-[#0A0A0A] hover:bg-[#F5F5F5] transition-colors"
                  title="Edit"
                >
                  <Pencil size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => removeImage(img.id)}
                  className="p-1 bg-white text-red-500 hover:bg-red-50 transition-colors"
                  title="Remove"
                >
                  <X size={12} />
                </button>
                {idx < images.length - 1 && (
                  <button
                    type="button"
                    onClick={() => moveImage(img.id, 1)}
                    className="p-1 bg-white text-[#0A0A0A] hover:bg-[#F5F5F5] transition-colors"
                    title="Move right"
                  >
                    <ChevronRight size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Add more slot */}
          {images.length < max && (
            <button
              type="button"
              onClick={openPicker}
              className="aspect-square border border-dashed border-[#E5E5E5] bg-[#F5F5F5] flex flex-col items-center justify-center gap-1 text-[#737373] hover:border-[#0A0A0A] transition-colors"
            >
              <ImagePlus size={18} />
              <span className="text-[10px]" style={{ fontFamily: MONO }}>Add</span>
            </button>
          )}
        </div>
      )}

      {/* Upload area (shown when empty) */}
      {images.length === 0 && (
        <div
          onClick={openPicker}
          className="border border-dashed border-[#E5E5E5] aspect-[4/3] bg-[#F5F5F5] flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#0A0A0A] transition-colors"
        >
          <ImagePlus size={28} className="text-[#737373]" />
          <div className="text-center">
            <p className="text-sm text-[#737373]" style={{ fontFamily: MONO }}>Click to upload photos</p>
            <p className="text-xs text-[#737373] mt-0.5">Up to {max} images · First is the main photo</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-[#737373]" style={{ fontFamily: MONO }}>
        <span>{images.length}/{max} photos · hover to edit or reorder</span>
        {images.length > 0 && images.length < max && (
          <button type="button" onClick={openPicker} className="underline hover:text-[#0A0A0A]">
            + Add more
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFiles}
      />
    </div>
  )
}
