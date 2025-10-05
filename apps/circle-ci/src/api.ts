import type {
  StatusResponse,
  TestsResponse,
  TriggerResponse,
  CIStatusResponse,
  ArtifactsResponse
} from './types'

// Client-side only - no backend needed!
const CIRCLECI_API = '/api/circleci' // Proxy through our server to avoid CORS

function getToken(): string | null {
  return localStorage.getItem('circleci_token')
}

function getHeaders(): Record<string, string> {
  const token = getToken()
  const headers: Record<string, string> = {}
  
  // Send token in custom header if available from localStorage
  if (token) {
    headers['x-circleci-token'] = token
  }
  
  return headers
}

// Extract org/repo from current page URL or default to remix-project
function getOrgRepo(): { org: string; repo: string } {
  // Default - can be configured
  return { org: 'remix-project-org', repo: 'remix-project' }
}

let cachedBranch: string | null = null

export const api = {
  async getStatus(): Promise<StatusResponse> {
    const token = getToken()
    
    // Get current branch from proxy server
    if (!cachedBranch) {
      try {
        const res = await fetch('/api/status', {
          headers: getHeaders()
        })
        if (res.ok) {
          const data = await res.json()
          cachedBranch = data.branch || 'master'
          return {
            hasToken: data.hasToken,
            branch: data.branch,
            tokenSource: data.tokenSource
          }
        }
      } catch {
        cachedBranch = 'master'
      }
    }
    
    return {
      hasToken: !!token,
      branch: cachedBranch || 'master'
    }
  },

  async getTests(): Promise<TestsResponse> {
    // Add cache-busting timestamp to force reload
    const res = await fetch(`/tests.json?t=${Date.now()}`)
    return res.json()
  },

  // Get recent pipelines to find any currently running
  async getRecentPipelines(): Promise<any[]> {
    const token = getToken()
    if (!token) return []

    const { org, repo } = getOrgRepo()
    const projectSlug = `gh/${org}/${repo}`
    
    // Use cached branch from getStatus
    const branch = cachedBranch || 'master'

    try {
      // Note: CircleCI API ignores the branch query parameter for some endpoints
      // So we fetch recent pipelines and filter client-side
      const res = await fetch(`${CIRCLECI_API}/project/${projectSlug}/pipeline`, {
        headers: getHeaders()
      })

      if (!res.ok) return []

      const data = await res.json()
      const items = data.items || []
      
      // Filter by current branch client-side
      return items.filter((p: any) => {
        const pipelineBranch = p.vcs?.branch || p.branch
        return pipelineBranch === branch
      })
    } catch {
      return []
    }
  },

  // Find the most recent running pipeline
  async findRunningPipeline(): Promise<string | null> {
    const pipelines = await this.getRecentPipelines()
    
    // Get workflows for recent pipelines to check status
    for (const pipeline of pipelines.slice(0, 5)) { // Check last 5 pipelines
      try {
        const res = await fetch(`${CIRCLECI_API}/pipeline/${pipeline.id}/workflow`, {
          headers: getHeaders()
        })

        if (!res.ok) continue

        const data = await res.json()
        const workflows = data.items || []
        
        // Check if any workflow is running
        const hasRunning = workflows.some((wf: any) => 
          ['running', 'failing', 'on_hold'].includes(wf.status?.toLowerCase())
        )

        if (hasRunning) {
          return pipeline.id
        }
      } catch {
        continue
      }
    }

    return null
  },


  async trigger(test: string, browser: string): Promise<TriggerResponse> {
    const token = getToken()
    if (!token) {
      throw new Error('CircleCI token not set. Click "Set token" to configure.')
    }

    // Use backend proxy for trigger (CircleCI doesn't support CORS for POST)
    try {
      const res = await fetch('/api/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ test, browser })
      })

      if (!res.ok) {
        const contentType = res.headers.get('content-type')
        let errorMessage = `HTTP ${res.status}: ${res.statusText}`
        
        if (contentType && contentType.includes('application/json')) {
          const error = await res.json()
          errorMessage = error.error || error.message || errorMessage
        } else {
          const text = await res.text()
          if (text) errorMessage = text
        }
        
        throw new Error(errorMessage)
      }

      return await res.json()
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Cannot connect to proxy server. Make sure the server is running on port 5178.')
      }
      throw error
    }
  },

  async getCIStatus(pipelineId: string): Promise<CIStatusResponse> {
    const token = getToken()
    if (!token) throw new Error('CircleCI token not set')

    const headers = getHeaders()
    const { org, repo } = getOrgRepo()

    try {
      const [pResp, wResp] = await Promise.all([
        fetch(`${CIRCLECI_API}/pipeline/${pipelineId}`, { headers }),
        fetch(`${CIRCLECI_API}/pipeline/${pipelineId}/workflow`, { headers })
      ])

      if (!pResp.ok || !wResp.ok) {
        throw new Error('Failed to fetch pipeline status')
      }

      const pipeline = await pResp.json()
      const workflowsData = await wResp.json()
      const workflows = workflowsData.items || []

      // Fetch jobs per workflow
      const jobsByWf: Record<string, any[]> = {}
      await Promise.all(
        workflows.map(async (wf: any) => {
          try {
            const jr = await fetch(`${CIRCLECI_API}/workflow/${wf.id}/job`, { headers })
            if (jr.ok) {
              const jobsData = await jr.json()
              let items = jobsData.items || []
              
              // Enrich with duration and UI link
              const baseUrl = pipeline.number 
                ? `https://app.circleci.com/pipelines/github/${org}/${repo}/${pipeline.number}/workflows/${wf.id}`
                : undefined
              
              items = items.map((j: any) => {
                const started = j.started_at ? Date.parse(j.started_at) : null
                const stopped = j.stopped_at ? Date.parse(j.stopped_at) : null
                const durationSec = started && stopped ? Math.max(0, Math.round((stopped - started) / 1000)) : null
                const ui = baseUrl && j.job_number ? `${baseUrl}/jobs/${j.job_number}` : undefined
                return { ...j, durationSec, ui }
              })
              
              jobsByWf[wf.id] = items
            } else {
              jobsByWf[wf.id] = []
            }
          } catch {
            jobsByWf[wf.id] = []
          }
        })
      )

      const termStates = new Set(['success', 'failed', 'canceled', 'error'])
      const counts = workflows.reduce((acc: any, wf: any) => {
        const s = (wf.status || 'unknown').toLowerCase()
        acc[s] = (acc[s] || 0) + 1
        return acc
      }, {})
      const allDone = workflows.length > 0 && workflows.every((wf: any) => 
        termStates.has((wf.status || '').toLowerCase())
      )
      const uiUrl = pipeline.number
        ? `https://app.circleci.com/pipelines/github/${org}/${repo}/${pipeline.number}`
        : undefined

      return {
        pipeline: {
          id: pipelineId,
          number: pipeline.number,
          state: pipeline.state,
          project_slug: pipeline.project_slug,
          parameters: pipeline.trigger_parameters
        },
        workflows,
        jobsByWf,
        summary: { counts, total: workflows.length, done: allDone },
        uiUrl
      }
    } catch (error) {
      throw error
    }
  },

  async getArtifacts(projectSlug: string, jobNumber: number): Promise<ArtifactsResponse> {
    const token = getToken()
    if (!token) throw new Error('CircleCI token not set')

    try {
      const res = await fetch(
        `${CIRCLECI_API}/project/${projectSlug}/${jobNumber}/artifacts`,
        { headers: getHeaders() }
      )

      if (!res.ok) {
        throw new Error('Failed to fetch artifacts')
      }

      const data = await res.json()
      return {
        ok: true,
        items: data.items || []
      }
    } catch (error) {
      throw error
    }
  },

  async setToken(token: string): Promise<{ ok: boolean }> {
    localStorage.setItem('circleci_token', token)
    return { ok: true }
  },

  async cancelWorkflow(workflowId: string): Promise<{ ok: boolean }> {
    const token = getToken()
    if (!token) throw new Error('CircleCI token not set')

    const res = await fetch(`${CIRCLECI_API}/workflow/${workflowId}/cancel`, {
      method: 'POST',
      headers: getHeaders()
    })

    if (!res.ok) {
      throw new Error('Failed to cancel workflow')
    }

    return { ok: true }
  },

  async rerunWorkflow(workflowId: string, fromFailed: boolean): Promise<{ ok: boolean }> {
    const token = getToken()
    if (!token) throw new Error('CircleCI token not set')

    const endpoint = fromFailed ? 'rerun' : 'rerun'
    const body = fromFailed ? JSON.stringify({ from_failed: true }) : JSON.stringify({})

    const res = await fetch(`${CIRCLECI_API}/workflow/${workflowId}/${endpoint}`, {
      method: 'POST',
      headers: {
        ...getHeaders(),
        'Content-Type': 'application/json'
      },
      body
    })

    if (!res.ok) {
      throw new Error('Failed to rerun workflow')
    }

    return { ok: true }
  },

  async regenerateTests(): Promise<{ ok: boolean; count?: number; message?: string; error?: string }> {
    const res = await fetch('/api/regenerate-tests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const data = await res.json()
    
    if (!res.ok) {
      throw new Error(data.error || 'Failed to regenerate tests')
    }

    return data
  }
}
