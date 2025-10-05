export interface Test {
  base: string
  src: string
  dist: string
  hasDist: boolean
}

export interface StatusResponse {
  hasToken: boolean
  branch: string
  tokenSource?: string
}

export interface TestsResponse {
  tests: Test[]
}

export interface TriggerResponse {
  ok: boolean
  url?: string
  pipelineId?: string
  output?: string
  pid?: number
}

export interface Job {
  id: string
  name: string
  job_number: number
  status: string
  started_at?: string
  stopped_at?: string
  durationSec?: number
  ui?: string
}

export interface Workflow {
  id: string
  name: string
  status: string
}

export interface CIStatusResponse {
  pipeline: {
    id: string
    number: number
    state: string
    project_slug: string
    parameters?: {
      run_file_tests?: string
    }
  }
  workflows: Workflow[]
  jobsByWf: Record<string, Job[]>
  summary: {
    counts: Record<string, number>
    total: number
    done: boolean
  }
  uiUrl?: string
}

export interface Artifact {
  path: string
  url: string
}

export interface ArtifactsResponse {
  ok: boolean
  items: Artifact[]
}

export type Mode = 'remote'
export type Browser = 'chrome' | 'firefox'
export type Layout = 'inline' | 'split'
export type Tab = 'tests' | 'ci' | 'log'
