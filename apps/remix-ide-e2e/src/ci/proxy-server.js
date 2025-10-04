#!/usr/bin/env node

/**
 * Minimal proxy server for CircleCI API calls that don't support CORS
 * Only proxies the trigger endpoint - everything else is client-side!
 */

const express = require('express')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')

const app = express()

const projectRoot = path.resolve(__dirname, '../../../../')

// Load .env.local or .env if they exist (for CIRCLECI_TOKEN)
try {
  const dotenv = require('dotenv')
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
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

app.use(express.json())

// Serve static files from web-ui/dist
app.use(express.static(path.join(__dirname, 'web-ui/dist')))

// Proxy for triggering pipelines (CORS blocked by CircleCI)
app.post('/api/trigger', async (req, res) => {
  const { test, browser = 'chrome' } = req.body || {}
  if (!test) return res.status(400).json({ error: 'Missing test name' })

  console.log(`[Trigger] Test: ${test}, Browser: ${browser}`)

  // Use the existing trigger-circleci.js script
  const triggerPath = path.resolve(__dirname, './trigger-circleci.js')
  const child = spawn('node', [triggerPath, '--pattern', test], {
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
app.get('/api/circleci/*', async (req, res) => {
  const token = process.env.CIRCLECI_TOKEN || process.env.CIRCLE_TOKEN
  if (!token) {
    return res.status(401).json({ error: 'CIRCLECI_TOKEN not configured on server' })
  }

  // Extract the CircleCI API path from the request
  const apiPath = req.path.replace('/api/circleci/', '')
  const url = `https://circleci.com/api/v2/${apiPath}`
  
  console.log(`[Proxy] GET ${url}`)

  try {
    const axios = require('axios')
    const response = await axios.get(url, {
      headers: {
        'Circle-Token': token,
        'Accept': 'application/json'
      }
    })
    res.json(response.data)
  } catch (error) {
    console.error(`[Proxy] Error:`, error.message)
    const status = error.response?.status || 500
    const data = error.response?.data || { error: error.message }
    res.status(status).json(data)
  }
})

// Proxy for CircleCI API POST requests (cancel, rerun, etc.)
app.post('/api/circleci/*', async (req, res) => {
  const token = process.env.CIRCLECI_TOKEN || process.env.CIRCLE_TOKEN
  if (!token) {
    return res.status(401).json({ error: 'CIRCLECI_TOKEN not configured on server' })
  }

  const apiPath = req.path.replace('/api/circleci/', '')
  const url = `https://circleci.com/api/v2/${apiPath}`
  
  console.log(`[Proxy] POST ${url}`)

  try {
    const axios = require('axios')
    const response = await axios.post(url, req.body, {
      headers: {
        'Circle-Token': token,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
    res.json(response.data)
  } catch (error) {
    console.error(`[Proxy] Error:`, error.message)
    const status = error.response?.status || 500
    const data = error.response?.data || { error: error.message }
    res.status(status).json(data)
  }
})

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'web-ui/dist/index.html'))
})

const PORT = Number(process.env.PORT || 5178)
app.listen(PORT, () => {
  console.log(`[Remix E2E Proxy] Listening at http://127.0.0.1:${PORT}`)
  console.log(`[Remix E2E Proxy] Proxying all CircleCI API calls (/api/trigger, /api/circleci/*)`)
  console.log(`[Remix E2E Proxy] Token loaded: ${!!(process.env.CIRCLECI_TOKEN || process.env.CIRCLE_TOKEN) ? '✓' : '✗'}`)
})
