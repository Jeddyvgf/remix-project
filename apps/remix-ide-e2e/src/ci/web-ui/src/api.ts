import type {
  StatusResponse,
  TestsResponse,
  TriggerResponse,
  CIStatusResponse,
  ArtifactsResponse
} from './types'

// Client-side only - no backend needed!
const CIRCLECI_API = 'https://circleci.com/api/v2'

function getToken(): string | null {
  return localStorage.getItem('circleci_token')
}

function getHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { 'Circle-Token': token } : {}
}

// Extract org/repo from current page URL or default to remix-project
function getOrgRepo(): { org: string; repo: string } {
  // Default - can be configured
  return { org: 'remix-project-org', repo: 'remix-project' }
}

export const api = {
  async getStatus(): Promise<StatusResponse> {
    const token = getToken()
    // Get current branch from git (we'll just return status)
    return {
      hasToken: !!token,
      branch: 'master' // Can be enhanced to show actual branch
    }
  },

  async getTests(): Promise<TestsResponse> {
    const res = await fetch('/tests.json')
    return res.json()
  },

  async trigger(test: string, browser: string): Promise<TriggerResponse> {
    const token = getToken()
    if (!token) {
      throw new Error('CircleCI token not set. Click "Set token" to configure.')
    }

    const { org, repo } = getOrgRepo()
    const projectSlug = `gh/${org}/${repo}`

    try {
      const res = await fetch(`${CIRCLECI_API}/project/${projectSlug}/pipeline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Circle-Token': token
        },
        body: JSON.stringify({
          branch: 'master', // or get from config
          parameters: {
            run_file_tests: test,
            browser: browser
          }
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to trigger pipeline')
      }

      const data = await res.json()
      const pipelineId = data.id
      const pipelineNumber = data.number
      const url = `https://app.circleci.com/pipelines/${projectSlug}/${pipelineNumber}`

      return {
        ok: true,
        url,
        pipelineId
      }
    } catch (error) {
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
  }
}
