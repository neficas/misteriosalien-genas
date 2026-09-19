import { useEffect, useMemo } from 'react'
import { MusicNoteIcon } from './Icons'

export default function Cover({ blob, alt = '', size, rounded = true, className = '' }) {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob])

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [url])

  const style = size ? { width: size, height: size } : undefined

  if (!url) {
    return (
      <div
        className={`cover cover-fallback ${rounded ? 'cover-rounded' : ''} ${className}`}
        style={style}
      >
        <MusicNoteIcon size={size ? size * 0.4 : 22} />
      </div>
    )
  }

  return (
    <img
      src={url}
      alt={alt}
      className={`cover ${rounded ? 'cover-rounded' : ''} ${className}`}
      style={style}
    />
  )
}
