import Sheet from './Sheet'
import { usePlayer } from '../hooks/usePlayer'

export default function EqualizerPanel({ open, onClose }) {
  const {
    eqBands,
    eqBandFrequencies,
    eqPreset,
    eqPresetNames,
    applyEQPreset,
    setEQBand,
    crossfade,
    setCrossfade,
  } = usePlayer()

  return (
    <Sheet open={open} onClose={onClose} title="Ecualizador HiFi">
      <div className="eq-panel">
        <div className="eq-presets">
          {eqPresetNames.map((name) => (
            <button
              key={name}
              className={`chip ${eqPreset === name ? 'chip-active' : ''}`}
              onClick={() => applyEQPreset(name)}
            >
              {name}
            </button>
          ))}
        </div>

        <div className="eq-bands">
          {eqBandFrequencies.map((freq, i) => (
            <div className="eq-band" key={freq}>
              <input
                type="range"
                min={-12}
                max={12}
                step={0.5}
                value={eqBands[i]}
                className="eq-slider"
                onChange={(e) => setEQBand(i, Number(e.target.value))}
              />
              <span className="eq-band-label">{freq >= 1000 ? `${freq / 1000}k` : freq}</span>
            </div>
          ))}
        </div>

        <div className="eq-crossfade">
          <div className="eq-crossfade-header">
            <span>Crossfade</span>
            <span>{crossfade === 0 ? 'Desactivado' : `${crossfade}s`}</span>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={crossfade}
            onChange={(e) => setCrossfade(Number(e.target.value))}
          />
        </div>
      </div>
    </Sheet>
  )
}
