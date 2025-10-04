#!/usr/bin/env node

/**
 * Generate tests.json - a static list of all available e2e tests
 * Run this before building the web UI: node generate-tests-json.js
 */

const fs = require('fs')
const path = require('path')

const projectRoot = path.resolve(__dirname, '../../../../')
const testsDir = path.resolve(projectRoot, 'apps/remix-ide-e2e/src/tests')
const outputFile = path.resolve(__dirname, 'web-ui/public/tests.json')

function findTests() {
  const tests = []
  
  if (!fs.existsSync(testsDir)) {
    console.error(`Tests directory not found: ${testsDir}`)
    process.exit(1)
  }

  const files = fs.readdirSync(testsDir)
  
  for (const file of files) {
    if (!file.endsWith('.test.ts') && !file.endsWith('.test.js')) continue
    
    const base = file.replace(/\.(test|spec)\.(ts|js)$/, '')
    const srcPath = path.join(testsDir, file)
    const distPath = path.join(projectRoot, 'dist/apps/remix-ide-e2e/src/tests', file.replace(/\.ts$/, '.js'))
    
    // Check if test is disabled
    const content = fs.readFileSync(srcPath, 'utf8')
    const isDisabled = /@disabled\s*:\s*true/i.test(content)
    
    if (!isDisabled) {
      tests.push({
        base,
        src: srcPath,
        dist: distPath,
        hasDist: fs.existsSync(distPath)
      })
    }
  }

  // Filter out non-grouped tests if a grouped version exists
  const groupedRoots = new Set()
  tests.forEach(t => {
    if (t.base.includes('_group')) {
      const root = t.base.replace(/_group\d+$/, '')
      groupedRoots.add(root)
    }
  })

  const filteredTests = tests.filter(t => 
    !(groupedRoots.has(t.base) && !t.base.includes('_group'))
  )

  return filteredTests
}

try {
  const tests = findTests()
  
  // Ensure public directory exists
  const publicDir = path.dirname(outputFile)
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true })
  }

  // Write tests.json
  fs.writeFileSync(outputFile, JSON.stringify({ tests }, null, 2))
  
  console.log(`✓ Generated ${outputFile}`)
  console.log(`  Found ${tests.length} tests`)
} catch (error) {
  console.error('Error generating tests.json:', error.message)
  process.exit(1)
}
