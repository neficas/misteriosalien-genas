import { useState } from 'react'
import { LibraryProvider } from './hooks/useLibrary'
import { PlayerProvider, usePlayer } from './hooks/usePlayer'
import BottomNav from './components/BottomNav'
import LibraryView from './components/LibraryView'
import PlaylistsView from './components/PlaylistsView'
import SearchView from './components/SearchView'
import SettingsView from './components/SettingsView'
import NowPlayingBar from './components/NowPlayingBar'
import NowPlayingScreen from './components/NowPlayingScreen'

const VIEWS = {
  library: LibraryView,
  playlists: PlaylistsView,
  search: SearchView,
  settings: SettingsView,
}

function Shell() {
  const [tab, setTab] = useState('library')
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false)
  const { currentTrack } = usePlayer()
  const ActiveView = VIEWS[tab]

  return (
    <div className="app-shell">
      <main className={`app-main ${currentTrack ? 'app-main-with-player' : ''}`}>
        <ActiveView />
      </main>

      {currentTrack && <NowPlayingBar onOpen={() => setNowPlayingOpen(true)} />}
      <BottomNav tab={tab} onChange={setTab} />

      {nowPlayingOpen && <NowPlayingScreen onClose={() => setNowPlayingOpen(false)} />}
    </div>
  )
}

export default function App() {
  return (
    <LibraryProvider>
      <PlayerProvider>
        <Shell />
      </PlayerProvider>
    </LibraryProvider>
  )
}
