import { useState, useEffect, useCallback } from 'react'
import { api } from './api'
import { TestTable } from './components/TestTable'
import { ControlPanel } from './components/ControlPanel'
import { LogPanel } from './components/LogPanel'
import { CIPipelineDetails } from './components/CIPipelineDetails'
import { useSettings } from './hooks/useSettings'
import { useFavorites } from './hooks/useFavorites'
import { useCIStatus } from './hooks/useCIStatus'
import type { Test, StatusResponse, Browser, Layout, Tab } from './types'
import './App.css'

function App() {
  const { settings, updateSettings } = useSettings()
  const { favorites, toggleFavorite, clearFavorites } = useFavorites()
  
  const [tests, setTests] = useState<Test[]>([])
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [log, setLog] = useState<string>('Welcome to Remix E2E Test Runner!\n\nSelect a test and click "Run" to get started.\nYou can filter tests, mark favorites, and monitor CI pipelines.\n')
  const [currentPipelineId, setCurrentPipelineId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('tests')

  const filter = settings.filter || ''
  const browser = (settings.browser || 'chrome') as Browser
  const layout = (settings.layout || 'inline') as Layout
  const pinDetails = settings.pinDetails || false
  const darkMode = settings.darkMode || false
  const logCollapsed = settings.logCollapsed || false

  const appendLog = useCallback((message: string) => {
    setLog(prev => prev + '\n' + message)
  }, [])

  const { ciStatus, startPolling } = useCIStatus(currentPipelineId, appendLog)

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [statusRes, testsRes] = await Promise.all([
          api.getStatus(),
          api.getTests()
        ])
        setStatus(statusRes)
        setTests(testsRes.tests || [])

        // Check for running pipelines if token is available
        if (statusRes.hasToken) {
          appendLog('Checking for running pipelines...')
          const runningPipelineId = await api.findRunningPipeline()
          
          if (runningPipelineId) {
            appendLog(`✓ Found running pipeline: ${runningPipelineId}`)
            setCurrentPipelineId(runningPipelineId)
            startPolling()
            // Switch to CI tab to show the running pipeline
            setActiveTab('ci')
          } else {
            appendLog('No running pipelines found.')
          }
        }
      } catch (error) {
        console.error('Failed to load initial data:', error)
        appendLog(`Error loading initial data: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    loadInitialData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredTests = tests.filter(t => 
    t.base.toLowerCase().includes(filter.toLowerCase())
  )

  const favoriteTests = filteredTests.filter(t => favorites.has(t.base))
  const regularTests = filteredTests

  const handleRunTest = async (testName: string) => {
    appendLog(`\n> triggering ${testName} on CircleCI...`)
    
    try {
      const result = await api.trigger(testName, browser)
      appendLog(JSON.stringify(result, null, 2))
      
      if (result.url) {
        appendLog(`Open pipeline: ${result.url}`)
      }

      if (result.pipelineId) {
        setCurrentPipelineId(result.pipelineId)
        startPolling()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      appendLog(`Error: ${message}`)
    }
  }

  const handleSetToken = async () => {
    const token = prompt('CircleCI token')
    if (!token) return
    
    try {
      const result = await api.setToken(token)
      appendLog(`set-token: ${JSON.stringify(result)}`)
      const statusRes = await api.getStatus()
      setStatus(statusRes)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to set token'
      appendLog(`Error: ${message}`)
    }
  }

  const adjustLog = (delta: number) => {
    const root = document.documentElement
    const current = parseInt(getComputedStyle(root).getPropertyValue('--log-height'))
    const next = Math.max(15, Math.min(80, current + delta))
    root.style.setProperty('--log-height', `${next}vh`)
  }

  const toggleLog = () => {
    const collapsed = !logCollapsed
    updateSettings({ logCollapsed: collapsed })
    document.body.classList.toggle('log-collapsed', collapsed)
  }

  const statusText = status
    ? `branch: ${status.branch} · circle token: ${status.hasToken ? '✅' : '⚠️ missing'}`
    : 'Loading…'

  return (
    <div className="app">
      <div className="container">
        <div className="header">
          <h4>Select & Run a Test</h4>
          <span className={`badge ${status?.hasToken ? 'success' : 'warning'}`}>
            {statusText}
          </span>
        </div>

        <div className="tabs">
          <button
            className={`tab ${activeTab === 'tests' ? 'active' : ''}`}
            onClick={() => setActiveTab('tests')}
          >
            Tests
          </button>
          <button
            className={`tab ${activeTab === 'ci' ? 'active' : ''}`}
            onClick={() => setActiveTab('ci')}
          >
            CI
          </button>
          <button
            className={`tab ${activeTab === 'log' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('log')
              if (logCollapsed) {
                toggleLog()
              }
              // Scroll to log panel after a short delay
              setTimeout(() => {
                const logPanel = document.querySelector('.log-panel')
                if (logPanel) {
                  logPanel.scrollTop = logPanel.scrollHeight
                }
              }, 100)
            }}
          >
            Log
          </button>
        </div>

        <ControlPanel
          filter={filter}
          onFilterChange={(value) => updateSettings({ filter: value })}
          browser={browser}
          onBrowserChange={(b) => updateSettings({ browser: b })}
          layout={layout}
          onLayoutChange={(l) => updateSettings({ layout: l })}
          pinDetails={pinDetails}
          onPinDetailsChange={(p) => updateSettings({ pinDetails: p })}
          darkMode={darkMode}
          onDarkModeChange={(d) => updateSettings({ darkMode: d })}
          logCollapsed={logCollapsed}
          onToggleLog={toggleLog}
          onClearLog={() => setLog('')}
          onLogAdjust={adjustLog}
          onSetToken={handleSetToken}
        />

        {activeTab === 'tests' && (
          <div className={`content ${layout === 'split' ? 'split-layout' : ''}`}>
            <div className="left-column">
              {favoriteTests.length > 0 && (
                <TestTable
                  tests={favoriteTests}
                  favorites={favorites}
                  onToggleFavorite={toggleFavorite}
                  onRunTest={handleRunTest}
                  title="Favorites"
                  showClearFavorites
                  onClearFavorites={clearFavorites}
                />
              )}

              <TestTable
                tests={regularTests}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
                onRunTest={handleRunTest}
              />
            </div>

            {layout === 'split' && ciStatus && (
              <div className="right-column">
                <CIPipelineDetails
                  ciStatus={ciStatus}
                  onLog={appendLog}
                  pinned={pinDetails}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'tests' && layout === 'inline' && ciStatus && (
          <CIPipelineDetails
            ciStatus={ciStatus}
            onLog={appendLog}
            pinned={pinDetails}
          />
        )}

        {activeTab === 'ci' && (
          <CIPipelineDetails
            ciStatus={ciStatus}
            onLog={appendLog}
            pinned={false}
          />
        )}
      </div>

      <LogPanel
        content={log}
        collapsed={logCollapsed && activeTab !== 'log'}
        onToggle={toggleLog}
      />
    </div>
  )
}

export default App

