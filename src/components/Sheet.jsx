import { XIcon } from './Icons'

export default function Sheet({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-header">
          <h3>{title}</h3>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar">
            <XIcon size={20} />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  )
}
