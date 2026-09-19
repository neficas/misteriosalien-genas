import { LibraryIcon, SearchIcon, PlaylistIcon, SettingsIcon } from './Icons'

const TABS = [
  { id: 'library', label: 'Biblioteca', icon: LibraryIcon },
  { id: 'playlists', label: 'Playlists', icon: PlaylistIcon },
  { id: 'search', label: 'Buscar', icon: SearchIcon },
  { id: 'settings', label: 'Ajustes', icon: SettingsIcon },
]

export default function BottomNav({ tab, onChange }) {
  return (
    <nav className="bottom-nav">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={`bottom-nav-item ${tab === id ? 'bottom-nav-item-active' : ''}`}
          onClick={() => onChange(id)}
        >
          <Icon size={22} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
