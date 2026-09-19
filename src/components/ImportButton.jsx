import { useRef } from 'react'
import { useLibrary } from '../hooks/useLibrary'
import { DownloadIcon } from './Icons'

export default function ImportButton({ label = 'Importar música', compact = false }) {
  const inputRef = useRef(null)
  const { importFiles } = useLibrary()

  return (
    <>
      <button
        className={compact ? 'icon-button' : 'button-primary'}
        onClick={() => inputRef.current?.click()}
        aria-label={label}
      >
        <DownloadIcon size={compact ? 20 : 18} />
        {!compact && <span>{label}</span>}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) importFiles(e.target.files)
          e.target.value = ''
        }}
      />
    </>
  )
}
