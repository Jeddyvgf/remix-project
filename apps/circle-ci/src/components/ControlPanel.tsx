import './ControlPanel.css'

interface ControlPanelProps {
  filter: string
  onFilterChange: (value: string) => void
  darkMode: boolean
  onDarkModeChange: (value: boolean) => void
  onSetToken: () => void
  onRefreshTests: () => void
  isRefreshingTests?: boolean
}

export function ControlPanel(props: ControlPanelProps) {
  return (
    <div className="control-panel">
      <div className="control-group">
        <label htmlFor="filter">Filter</label>
        <input
          id="filter"
          type="text"
          value={props.filter}
          onChange={(e) => props.onFilterChange(e.target.value)}
          placeholder="type to filter by name"
        />
      </div>

      <div className="control-group">
        <label>
          <input
            type="checkbox"
            checked={props.darkMode}
            onChange={(e) => props.onDarkModeChange(e.target.checked)}
          />
          Dark mode
        </label>
      </div>

      <div className="divider" />

      <button className="btn btn-sm btn-primary" onClick={props.onSetToken}>
        Set token
      </button>

      <button 
        className="btn btn-sm btn-primary" 
        onClick={props.onRefreshTests}
        disabled={props.isRefreshingTests}
        title="Regenerate test list from source files"
      >
        {props.isRefreshingTests ? '🔄 Refreshing...' : '🔄 Refresh Tests'}
      </button>
    </div>
  )
}
