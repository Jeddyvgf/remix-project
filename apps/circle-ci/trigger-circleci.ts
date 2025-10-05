#!/usr/bin/env tsx
/*
  Trigger a CircleCI pipeline that runs a single e2e test pattern.

  Usage:
    tsx trigger-circleci.ts --pattern <grep-pattern> [--branch <branch>] [--org <org>] [--repo <repo>] [--vcs <vcs>]

  Env:
    CIRCLECI_TOKEN (required) – CircleCI Personal API token
*/

import { execSync } from 'child_process'
import path from 'path'
import axios from 'axios'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface Args {
  pattern?: string
  branch?: string
  org?: string
  repo?: string
  vcs?: string
}

interface RepoInfo {
  org: string
  repo: string
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const token = process.env.CIRCLECI_TOKEN || process.env.CIRCLE_TOKEN
  if (!token) {
    console.error('Error: CIRCLECI_TOKEN env var is required to trigger CircleCI.')
    console.error('Create a Personal API Token in CircleCI and export CIRCLECI_TOKEN before using --remote.')
    process.exit(1)
  }

  if (!args.pattern) {
    console.error('Error: --pattern <grep-pattern> is required.')
    process.exit(1)
  }

  const vcs = args.vcs || 'gh' // GitHub
  const { org, repo } = resolveRepo(args)
  const branch = args.branch || getCurrentBranch()

  const url = `https://circleci.com/api/v2/project/${encodeURIComponent(vcs)}/${encodeURIComponent(org)}/${encodeURIComponent(repo)}/pipeline`

  const body = {
    branch,
    parameters: {
      // This parameter is used to enable the workflow and filter tests
      run_file_tests: normalizePattern(String(args.pattern))
    }
  }

  try {
    const res = await axios.post(url, body, {
      headers: {
        'Circle-Token': token,
        'Content-Type': 'application/json'
      }
    })

    const pipelineId = res.data && res.data.id
    console.log(`✅ Triggered CircleCI pipeline on ${org}/${repo}@${branch} with pattern: ${args.pattern}`)
    console.log(`Pipeline id: ${pipelineId}`)

    // Try to fetch pipeline number to build a direct UI URL (best-effort)
    if (pipelineId) {
      try {
        const pr = await axios.get(`https://circleci.com/api/v2/pipeline/${pipelineId}`, {
          headers: { 'Circle-Token': token }
        })
        const number = pr.data && pr.data.number
        if (number) {
          console.log(`Open in CircleCI: https://app.circleci.com/pipelines/github/${org}/${repo}/${number}`)
        } else {
          console.log('Open your project pipelines in CircleCI UI to view progress.')
        }
      } catch (e) {
        console.log('Triggered. You can view it in CircleCI project pipelines.')
      }
    }
  } catch (err) {
    const status = axios.isAxiosError(err) ? err.response?.status : undefined
    const data = axios.isAxiosError(err) ? err.response?.data : undefined
    console.error('❌ Failed to trigger CircleCI pipeline.')
    if (status) console.error(`HTTP ${status}`)
    if (data) console.error(JSON.stringify(data, null, 2))
    else console.error((err as Error).message)
    process.exit(1)
  }
}

function normalizePattern(p: string): string {
  try {
    // If a path-like string or explicit extension is provided, reduce to base name without extension
    const hasSlash = /[\\/]/.test(p) || /^dist[\\/]/.test(p)
    const hasExt = /\.(ts|js)$/i.test(p)
    if (hasSlash || hasExt) {
      const base = path.basename(p)
      return base.replace(/\.(ts|js)$/i, '') // keep e.g. url_group1.test
    }
  } catch (_) {
    // Ignore errors
  }
  return p
}

function parseArgs(argv: string[]): Args {
  const out: Args = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--pattern') out.pattern = argv[++i]
    else if (a === '--branch') out.branch = argv[++i]
    else if (a === '--org') out.org = argv[++i]
    else if (a === '--repo') out.repo = argv[++i]
    else if (a === '--vcs') out.vcs = argv[++i]
  }
  return out
}

function getCurrentBranch(): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch (_) {
    return 'master'
  }
}

function resolveRepo(args: Args): RepoInfo {
  if (args.org && args.repo) return { org: args.org, repo: args.repo }
  
  // Parse from git remote origin
  try {
    const remote = execSync('git config --get remote.origin.url', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
    // Support git@github.com:org/repo.git or https://github.com/org/repo.git
    const m = remote.match(/github\.com[:/](.+?)\/(.+?)(\.git)?$/i)
    if (m) {
      return { org: m[1], repo: m[2] }
    }
  } catch (_) {
    // Ignore errors
  }
  
  // Fallback to package.json repository
  try {
    const pkgPath = path.resolve(process.cwd(), 'package.json')
    const pkgContent = fs.readFileSync(pkgPath, 'utf8')
    const pkg = JSON.parse(pkgContent)
    const repoUrl = (pkg && pkg.repository && (pkg.repository.url || pkg.repository)) || ''
    const m = String(repoUrl).match(/github\.com[:/](.+?)\/(.+?)(\.git)?$/i)
    if (m) return { org: m[1], repo: m[2] }
  } catch (_) {
    // Ignore errors
  }
  
  // Final fallback
  return { org: 'remix-project-org', repo: 'remix-project' }
}

main()
