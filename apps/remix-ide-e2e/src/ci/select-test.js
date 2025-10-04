#!/usr/bin/env node
/*
  Interactive or flag-based selector to run a single e2e test locally or remotely via CircleCI.

  Modes:
    - Local (default): replicates current select_tests.sh behavior
    - Remote: triggers CircleCI pipeline to run a specific pattern using .circleci/config.yml run_file_tests

  Flags:
    --remote                Trigger on CircleCI instead of running locally
    --pattern <grep>        Pattern to filter test files, e.g. ".pr" or a specific filename
    --browser <name>        Local browser choice (chrome, chrome with metamask, firefox)
    --branch <branch>       Branch to use when triggering CircleCI (defaults to current)
    --org <org>             GitHub org (auto-detected if omitted)
    --repo <repo>           GitHub repo (auto-detected if omitted)
    --vcs <vcs>             VCS slug; defaults to gh (GitHub)

  Env:
    CIRCLECI_TOKEN          Required for --remote
*/

const { spawnSync } = require('child_process')
const path = require('path')
const fs = require('fs')

function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.remote) {
    // Remote run on CircleCI; requires a pattern
    const pattern = args.pattern || promptPatternNonInteractive()

    // Ensure we have a token; if not, prompt to paste one and optionally persist to .env.local
    if (!process.env.CIRCLECI_TOKEN && !process.env.CIRCLE_TOKEN) {
      const token = promptForToken()
      if (!token) {
        console.error('Aborting: no CircleCI token provided.')
        process.exit(1)
      }
      process.env.CIRCLECI_TOKEN = token
      maybePersistToken(token)
    }

    const triggerPath = path.resolve(__dirname, './trigger-circleci.js')
    const forwarded = [
      '--pattern', pattern,
    ]
    if (args.branch) forwarded.push('--branch', args.branch)
    if (args.org) forwarded.push('--org', args.org)
    if (args.repo) forwarded.push('--repo', args.repo)
    if (args.vcs) forwarded.push('--vcs', args.vcs)
    const res = spawnSync('node', [triggerPath, ...forwarded], { stdio: 'inherit' })
    process.exit(res.status || 0)
  }

  // Local interactive run: call the existing bash script
  const script = path.resolve(process.cwd(), 'apps/remix-ide-e2e/src/select_tests.sh')
  if (!fs.existsSync(script)) {
    console.error(`Cannot find local script: ${script}`)
    process.exit(1)
  }
  const res = spawnSync('bash', [script], { stdio: 'inherit' })
  process.exit(res.status || 0)
}

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--remote') out.remote = true
    else if (a === '--pattern') out.pattern = argv[++i]
    else if (a === '--browser') out.browser = argv[++i]
    else if (a === '--branch') out.branch = argv[++i]
    else if (a === '--org') out.org = argv[++i]
    else if (a === '--repo') out.repo = argv[++i]
    else if (a === '--vcs') out.vcs = argv[++i]
  }
  return out
}

function promptPatternNonInteractive() {
  // Not building a full prompt—just provide guidance and exit
  console.error('When using --remote you must provide --pattern for the test selection.')
  console.error('Examples:')
  console.error('  yarn select_test --remote --pattern "\\.pr"')
  console.error('  yarn select_test --remote --pattern "etherscan_api.test"')
  process.exit(2)
}

function promptForToken() {
  try {
    const tty = require('tty')
    const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout })
    return syncQuestion(rl, 'Paste your CircleCI Personal API Token (hidden input not supported here): ')
  } catch (e) {
    console.error('Failed to prompt for token:', e.message)
    return null
  }
}

function syncQuestion(rl, q) {
  return new Promise((resolve) => {
    rl.question(q, (answer) => {
      rl.close()
      resolve(answer && answer.trim() ? answer.trim() : null)
    })
  })
}

function maybePersistToken(token) {
  const envPath = path.resolve(process.cwd(), '.env.local')
  try {
    const readline = require('readline-sync')
    const ans = readline.question('Store token to .env.local as CIRCLECI_TOKEN for next time? (y/N): ')
    if (String(ans).toLowerCase().startsWith('y')) {
      let content = ''
      if (fs.existsSync(envPath)) content = fs.readFileSync(envPath, 'utf8')
      const lines = content.split(/\r?\n/)
      const filtered = lines.filter((l) => !/^\s*CIRCLECI_TOKEN\s*=/.test(l))
      filtered.push(`CIRCLECI_TOKEN=${token}`)
      fs.writeFileSync(envPath, filtered.join('\n'))
      console.log(`Saved CIRCLECI_TOKEN to ${envPath}`)
    }
  } catch (_) {
    // readline-sync may not be installed; silently skip persistence
  }
}

main()
