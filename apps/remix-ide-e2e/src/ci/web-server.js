#!/usr/bin/env node
const express = require('express')
const path = require('path')
const fs = require('fs')
const { execSync, spawn } = require('child_process')
const axios = require('axios')
const dotenv = require('dotenv')

// Load env from .env.local then .env (best-effort)
try {
  const envLocal = path.resolve(process.cwd(), '.env.local')
  if (fs.existsSync(envLocal)) dotenv.config({ path: envLocal })
  const env = path.resolve(process.cwd(), '.env')
  if (fs.existsSync(env)) dotenv.config({ path: env })
} catch (_) {}

function getCircleToken() {
  return process.env.CIRCLECI_TOKEN || process.env.CIRCLE_TOKEN || ''
}

const app = express()
app.use(express.json())

// Serve static assets (single-page app)
const staticDir = path.resolve(__dirname, './web')
app.use('/', express.static(staticDir))

app.get('/api/status', (req, res) => {
  const hasToken = Boolean(getCircleToken())
  let branch = 'unknown'
  try {
    branch = execSync('git rev-parse --abbrev-ref HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch (_) {}
  res.json({ hasToken, branch })
})

app.get('/api/tests', (req, res) => {
  try {
    const list = execSync("grep -IRiL \'@disabled\': \\?true apps/remix-ide-e2e/src/tests | sort", { stdio: ['ignore', 'pipe', 'ignore'], shell: '/bin/bash' }).toString()
    const files = list.split(/\r?\n/).filter(Boolean)
    let tests = files.map((src) => {
      const base = path.basename(src).replace(/\.(js|ts)$/i, '')
      const dist = path.resolve(process.cwd(), 'dist', src).replace(/\.(ts)$/i, '.js')
      const distRel = path.relative(process.cwd(), dist)
      const hasDist = fs.existsSync(dist)
      return { base, src, dist: distRel, hasDist }
    })
    // If a test has grouped variants like foo_group1.test, hide the plain foo.test
    const groupedRoots = new Set()
    for (const t of tests) {
      const i = t.base.indexOf('_group')
      if (i > -1 && t.base.endsWith('.test')) {
        const root = t.base.slice(0, i) + '.test'
        groupedRoots.add(root)
      }
    }
    if (groupedRoots.size) {
      tests = tests.filter(t => !(groupedRoots.has(t.base) && !t.base.includes('_group')))
    }
    res.json({ tests })
  } catch (e) {
    res.status(500).json({ error: 'Failed to enumerate tests', details: e.message })
  }
})

app.post('/api/trigger', async (req, res) => {
  const { mode, test, browser = 'chrome' } = req.body || {}
  if (!test) return res.status(400).json({ error: 'Missing test (base name) in body' })
  if (mode === 'remote') {
    if (!getCircleToken()) {
      return res.status(401).json({ error: 'Missing CIRCLECI_TOKEN in env' })
    }
    // Call existing trigger script and capture CircleCI URL
    const triggerPath = path.resolve(__dirname, './trigger-circleci.js')
    const child = spawn('node', [triggerPath, '--pattern', test])
    let out = ''
    child.stdout.on('data', (d) => (out += d.toString()))
    child.stderr.on('data', (d) => (out += d.toString()))
    child.on('close', (code) => {
      const m = out.match(/https:\/\/app\.circleci\.com\/[\w\/-]+/)
      const url = m ? m[0] : undefined
      const pidm = out.match(/Pipeline id:\s*([a-f0-9-]+)/i)
      const pipelineId = pidm ? pidm[1] : undefined
      if (code === 0) return res.json({ ok: true, url, pipelineId, output: out })
      return res.status(500).json({ ok: false, url, pipelineId, output: out })
    })
    return
  }

  if (mode === 'local') {
    // Ensure dist exists for local run
    try {
      execSync('yarn run build:e2e', { stdio: ['ignore', 'inherit', 'inherit'] })
    } catch (e) {
      return res.status(500).json({ error: 'build:e2e failed' })
    }
    // Reuse singletest.sh to set up services and run one test
    const script = path.resolve(process.cwd(), 'apps/remix-ide/ci/singletest.sh')
    const args = [script, browser, 'nogroup', '1', test]
    const proc = spawn('bash', args, { stdio: 'inherit' })
    return res.json({ ok: true, pid: proc.pid })
  }

  return res.status(400).json({ error: 'Invalid mode. Use local or remote.' })
})

// Resolve org/repo from git remote origin for building CircleCI UI links
function resolveRepo() {
  try {
    const remote = execSync('git config --get remote.origin.url', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
    const m = remote.match(/github\.com[:/]([^/]+)\/([^/]+?)(\.git)?$/i)
    if (m) return { org: m[1], repo: m[2] }
  } catch (_) {}
  return { org: 'remix-project-org', repo: 'remix-project' }
}

// Poll CircleCI API for pipeline/workflow/job status
app.get('/api/ci-status', async (req, res) => {
  const token = getCircleToken()
  if (!token) return res.status(401).json({ error: 'Missing CIRCLECI_TOKEN in env' })
  const pipelineId = String(req.query.pipelineId || '').trim()
  if (!pipelineId) return res.status(400).json({ error: 'pipelineId is required' })
  const headers = { 'Circle-Token': token }
  try {
    const [pResp, wResp] = await Promise.all([
      axios.get(`https://circleci.com/api/v2/pipeline/${pipelineId}`, { headers }),
      axios.get(`https://circleci.com/api/v2/pipeline/${pipelineId}/workflow`, { headers })
    ])
    const pipeline = pResp.data || {}
    const workflows = (wResp.data && wResp.data.items) || []
    // Fetch jobs per workflow (best-effort)
    const jobsByWf = {}
    await Promise.all(
      workflows.map(async (wf) => {
        try {
          const jr = await axios.get(`https://circleci.com/api/v2/workflow/${wf.id}/job`, { headers })
          let items = (jr.data && jr.data.items) || []
          // Enrich with duration and UI link when possible
          const { org, repo } = resolveRepo()
          const baseUrl = pipeline.number ? `https://app.circleci.com/pipelines/github/${org}/${repo}/${pipeline.number}/workflows/${wf.id}` : undefined
          items = items.map(j => {
            const started = j.started_at ? Date.parse(j.started_at) : null
            const stopped = j.stopped_at ? Date.parse(j.stopped_at) : null
            const durationSec = started && stopped ? Math.max(0, Math.round((stopped - started) / 1000)) : null
            const ui = baseUrl && j.id ? `${baseUrl}/jobs/${j.id}` : undefined
            return { ...j, durationSec, ui }
          })
          jobsByWf[wf.id] = items
        } catch (_) {
          jobsByWf[wf.id] = []
        }
      })
    )

    const termStates = new Set(['success', 'failed', 'canceled', 'error'])
    const counts = workflows.reduce((acc, wf) => {
      const s = (wf.status || 'unknown').toLowerCase()
      acc[s] = (acc[s] || 0) + 1
      return acc
    }, {})
    const allDone = workflows.length > 0 && workflows.every((wf) => termStates.has((wf.status || '').toLowerCase()))
    const { org, repo } = resolveRepo()
    const uiUrl = pipeline.number
      ? `https://app.circleci.com/pipelines/github/${org}/${repo}/${pipeline.number}`
      : undefined

    res.json({
      pipeline: { id: pipelineId, number: pipeline.number, state: pipeline.state, project_slug: pipeline.project_slug },
      workflows,
      jobsByWf,
      summary: { counts, total: workflows.length, done: allDone },
      uiUrl
    })
  } catch (e) {
    const status = e.response && e.response.status
    const data = e.response && e.response.data
    res.status(status || 500).json({ error: 'Failed to fetch CI status', details: data || e.message })
  }
})

const PORT = Number(process.env.SELECT_TEST_PORT || 5178)
const server = app.listen(PORT, () => {
  const url = `http://127.0.0.1:${PORT}`
  console.log(`[select-test web] Listening at ${url}`)
})

// --- Extra usability endpoints ---

// Persist CircleCI token to .env.local
app.post('/api/set-token', express.json(), (req, res) => {
  const token = (req.body && (req.body.token || '').trim()) || ''
  if (!token) return res.status(400).json({ error: 'token is required' })
  try {
    const envLocal = path.resolve(process.cwd(), '.env.local')
    let lines = []
    if (fs.existsSync(envLocal)) {
      lines = fs.readFileSync(envLocal, 'utf8').split(/\r?\n/)
    }
    // Remove existing token lines
    lines = lines.filter(l => !/^\s*(CIRCLECI_TOKEN|CIRCLE_TOKEN)\s*=/.test(l))
    lines.push(`CIRCLECI_TOKEN=${token}`)
    fs.writeFileSync(envLocal, lines.join('\n') + '\n', 'utf8')
    // Update runtime env
    process.env.CIRCLECI_TOKEN = token
    return res.json({ ok: true })
  } catch (e) {
    return res.status(500).json({ error: 'Failed to persist token', details: e.message })
  }
})

// Cancel a running workflow
app.post('/api/ci/cancel', async (req, res) => {
  const token = getCircleToken()
  if (!token) return res.status(401).json({ error: 'Missing CIRCLECI_TOKEN in env' })
  const workflowId = String((req.body && req.body.workflowId) || '').trim()
  if (!workflowId) return res.status(400).json({ error: 'workflowId is required' })
  try {
    const r = await axios.post(`https://circleci.com/api/v2/workflow/${workflowId}/cancel`, {}, { headers: { 'Circle-Token': token } })
    return res.json({ ok: true, result: r.data })
  } catch (e) {
    const status = e.response && e.response.status
    const data = e.response && e.response.data
    return res.status(status || 500).json({ error: 'Failed to cancel workflow', details: data || e.message })
  }
})

// Rerun a workflow (optionally from_failed only)
app.post('/api/ci/rerun', async (req, res) => {
  const token = getCircleToken()
  if (!token) return res.status(401).json({ error: 'Missing CIRCLECI_TOKEN in env' })
  const workflowId = String((req.body && req.body.workflowId) || '').trim()
  const from_failed = Boolean(req.body && req.body.from_failed)
  if (!workflowId) return res.status(400).json({ error: 'workflowId is required' })
  try {
    const r = await axios.post(`https://circleci.com/api/v2/workflow/${workflowId}/rerun`, { from_failed }, { headers: { 'Circle-Token': token } })
    return res.json({ ok: true, result: r.data })
  } catch (e) {
    const status = e.response && e.response.status
    const data = e.response && e.response.data
    return res.status(status || 500).json({ error: 'Failed to rerun workflow', details: data || e.message })
  }
})
