#!/usr/bin/env tsx

/**
 * Minimal proxy server for CircleCI API calls that don't support CORS
 * Only proxies the trigger endpoint - everything else is client-side!
 */

import express, { Request, Response, NextFunction } from 'express'
import path from 'path'
import fs from 'fs'
import { spawn } from 'child_process'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import axios from 'axios'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

const projectRoot = path.resolve(__dirname, '../../')

// Load .env.local or .env if they exist (for CIRCLECI_TOKEN)
try {
  const dotenv = await import('dotenv')
  const envLocalPath = path.join(projectRoot, '.env.local')
  const envPath = path.join(projectRoot, '.env')

  if (fs.existsSync(envLocalPath)) {
    console.log('[Remix E2E Proxy] Loading .env.local')
    dotenv.config({ path: envLocalPath })
  } else if (fs.existsSync(envPath)) {
    console.log('[Remix E2E Proxy] Loading .env')
    dotenv.config({ path: envPath })
  }
} catch (e) {
  // dotenv not available, rely on system env
}

// Check for CircleCI token
if (!process.env.CIRCLECI_TOKEN && !process.env.CIRCLE_TOKEN) {
  console.warn('[Remix E2E Proxy] ⚠️  WARNING: CIRCLECI_TOKEN not found!')
  console.warn('[Remix E2E Proxy] Set CIRCLECI_TOKEN env var or create .env.local with:')
  console.warn('[Remix E2E Proxy]   CIRCLECI_TOKEN=your_token_here')
}

// Simple CORS middleware (no extra package needed)
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

app.use(express.json())

// Serve tests.json without caching
app.get('/tests.json', (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  res.sendFile(path.join(__dirname, 'public/tests.json'))
})

// Serve static files from dist
app.use(express.static(path.join(__dirname, 'dist')))

// Get current git branch
function getCurrentBranch(): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { 
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'ignore'] 
    }).toString().trim()
  } catch (_) {
    return 'master'
  }
}

// Status endpoint to get current branch and token status
app.get('/api/status', (req: Request, res: Response) => {
  const branch = getCurrentBranch()
  const serverToken = !!(process.env.CIRCLECI_TOKEN || process.env.CIRCLE_TOKEN)
  const clientToken = req.headers['x-circleci-token']
  const hasToken = serverToken || !!clientToken
  
  res.json({ 
    branch, 
    hasToken,
    tokenSource: serverToken ? 'server (.env.local)' : (clientToken ? 'client (localStorage)' : 'none')
  })
})

// Regenerate tests.json endpoint
app.post('/api/regenerate-tests', async (req: Request, res: Response) => {
  console.log('[Regenerate] Starting test list regeneration...')
  
  const generateScriptPath = path.resolve(__dirname, './generate-tests-json.ts')
  const child = spawn('npx', ['tsx', generateScriptPath], {
    cwd: __dirname,
    env: process.env
  })
  
  let output = ''
  child.stdout.on('data', (d) => (output += d.toString()))
  child.stderr.on('data', (d) => (output += d.toString()))
  
  child.on('close', (code) => {
    if (code === 0) {
      console.log('[Regenerate] Success:', output.trim())
      // Read the newly generated tests.json
      try {
        const testsJsonPath = path.resolve(__dirname, 'public/tests.json')
        const testsData = JSON.parse(fs.readFileSync(testsJsonPath, 'utf8'))
        return res.json({ 
          ok: true, 
          message: 'Tests regenerated successfully',
          count: testsData.tests?.length || 0,
          output 
        })
      } catch (readError) {
        return res.status(500).json({
          ok: false,
          error: 'Tests generated but failed to read tests.json',
          output
        })
      }
    } else {
      console.error('[Regenerate] Failed:', output)
      return res.status(500).json({ 
        ok: false, 
        error: 'Failed to regenerate tests', 
        output 
      })
    }
  })

  child.on('error', (err) => {
    console.error('[Regenerate] Error:', err)
    res.status(500).json({ 
      ok: false,
      error: 'Failed to spawn regenerate process', 
      details: err.message 
    })
  })
})

interface TriggerRequest {
  test?: string
  browser?: string
}

// Proxy for triggering pipelines (CORS blocked by CircleCI)
app.post('/api/trigger', async (req: Request<{}, {}, TriggerRequest>, res: Response) => {
  const { test, browser = 'chrome' } = req.body || {}
  if (!test) return res.status(400).json({ error: 'Missing test name' })

  console.log(`[Trigger] Test: ${test}, Browser: ${browser}`)

  // Use the existing trigger-circleci.ts script
  const triggerPath = path.resolve(__dirname, './trigger-circleci.ts')
  const child = spawn('npx', ['tsx', triggerPath, '--pattern', test], {
    cwd: projectRoot, // Run from project root so it can find node_modules
    env: process.env
  })
  
  let output = ''
  child.stdout.on('data', (d) => (output += d.toString()))
  child.stderr.on('data', (d) => (output += d.toString()))
  
  child.on('close', (code) => {
    console.log(`[Trigger] Exit code: ${code}`)
    
    const urlMatch = output.match(/https:\/\/app\.circleci\.com\/[\w\/-]+/)
    const url = urlMatch ? urlMatch[0] : undefined
    
    const pidMatch = output.match(/Pipeline id:\s*([a-f0-9-]+)/i)
    const pipelineId = pidMatch ? pidMatch[1] : undefined
    
    if (code === 0) {
      console.log(`[Trigger] Success - Pipeline: ${pipelineId}`)
      return res.json({ ok: true, url, pipelineId, output })
    }
    
    console.log(`[Trigger] Failed - Output:`, output)
    
    // Check for specific error messages
    let errorMessage = 'Trigger failed'
    if (output.includes('CIRCLECI_TOKEN env var is required')) {
      errorMessage = 'CIRCLECI_TOKEN environment variable not set. Please set it on the server and restart.'
    } else if (output.includes('401') || output.includes('Unauthorized')) {
      errorMessage = 'Invalid CircleCI token. Please check your CIRCLECI_TOKEN.'
    }
    
    return res.status(500).json({ 
      ok: false, 
      error: errorMessage, 
      url, 
      pipelineId, 
      output 
    })
  })

  child.on('error', (err) => {
    console.error(`[Trigger] Error spawning process:`, err)
    res.status(500).json({ error: 'Failed to spawn trigger process', details: err.message })
  })
})

// Proxy for CircleCI API GET requests (also CORS-blocked)
app.get('/api/circleci/*', async (req: Request, res: Response) => {
  // Try client token first, then server token
  const clientToken = req.headers['x-circleci-token'] as string | undefined
  const serverToken = process.env.CIRCLECI_TOKEN || process.env.CIRCLE_TOKEN
  const token = clientToken || serverToken
  
  if (!token) {
    return res.status(401).json({ error: 'CIRCLECI_TOKEN not configured. Set it in .env.local or via UI.' })
  }

  // Extract the CircleCI API path from the request
  const apiPath = req.path.replace('/api/circleci/', '')
  const url = `https://circleci.com/api/v2/${apiPath}`
  
  const tokenSource = clientToken ? 'client' : 'server'
  console.log(`[Proxy] GET ${url} (token from ${tokenSource})`)

  try {
    const response = await axios.get(url, {
      headers: {
        'Circle-Token': token,
        'Accept': 'application/json'
      }
    })
    res.json(response.data)
  } catch (error) {
    console.error(`[Proxy] Error:`, (error as Error).message)
    const status = axios.isAxiosError(error) ? (error.response?.status || 500) : 500
    const data = axios.isAxiosError(error) 
      ? (error.response?.data || { error: (error as Error).message })
      : { error: (error as Error).message }
    res.status(status).json(data)
  }
})

// Proxy for CircleCI API POST requests (cancel, rerun, etc.)
app.post('/api/circleci/*', async (req: Request, res: Response) => {
  // Try client token first, then server token
  const clientToken = req.headers['x-circleci-token'] as string | undefined
  const serverToken = process.env.CIRCLECI_TOKEN || process.env.CIRCLE_TOKEN
  const token = clientToken || serverToken
  
  if (!token) {
    return res.status(401).json({ error: 'CIRCLECI_TOKEN not configured. Set it in .env.local or via UI.' })
  }

  const apiPath = req.path.replace('/api/circleci/', '')
  const url = `https://circleci.com/api/v2/${apiPath}`
  
  const tokenSource = clientToken ? 'client' : 'server'
  console.log(`[Proxy] POST ${url} (token from ${tokenSource})`)

  try {
    const response = await axios.post(url, req.body, {
      headers: {
        'Circle-Token': token,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
    res.json(response.data)
  } catch (error) {
    console.error(`[Proxy] Error:`, (error as Error).message)
    const status = axios.isAxiosError(error) ? (error.response?.status || 500) : 500
    const data = axios.isAxiosError(error)
      ? (error.response?.data || { error: (error as Error).message })
      : { error: (error as Error).message }
    res.status(status).json(data)
  }
})

// SPA fallback
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'))
})

const PORT = Number(process.env.PORT || 5178)
app.listen(PORT, () => {
  console.log(`[Remix E2E Proxy] Listening at http://127.0.0.1:${PORT}`)
  console.log(`[Remix E2E Proxy] Proxying all CircleCI API calls (/api/trigger, /api/circleci/*)`)
  console.log(`[Remix E2E Proxy] Token loaded: ${!!(process.env.CIRCLECI_TOKEN || process.env.CIRCLE_TOKEN) ? '✓' : '✗'}`)
})
