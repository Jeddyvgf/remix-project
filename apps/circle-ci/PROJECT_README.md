# Circle CI Test Runner

A modern React-based web UI for triggering and monitoring Remix E2E tests on CircleCI.

## What It Is

This is a standalone web application that provides a clean interface for:
- Browsing all available E2E tests in the Remix project
- Triggering individual tests or test patterns on CircleCI
- Monitoring pipeline status, workflows, and job progress in real-time
- Viewing logs and downloading artifacts (screenshots, videos)
- Managing favorites and filtering tests by name or status

It replaces a 700+ line monolithic HTML file with a modern TypeScript/React architecture.

## What It Does

1. **Test Discovery**: Automatically scans `apps/remix-ide-e2e/src/tests/` and generates a list of all available tests (excluding disabled ones)
2. **CircleCI Integration**: Triggers CircleCI pipelines with specific test patterns via API
3. **Real-time Monitoring**: Polls CircleCI API every 5 seconds to show live pipeline/workflow/job status
4. **Branch Awareness**: Automatically detects your current git branch and filters CI results accordingly
5. **Log Viewing**: Displays job logs in a resizable bottom panel
6. **Artifact Access**: Lists and provides download links for test artifacts

## How to Use

### Prerequisites

You need a CircleCI Personal API Token:
1. Go to https://app.circleci.com/settings/user/tokens
2. Create a new token
3. Create `.env.local` in the repo root:
   ```bash
   CIRCLECI_TOKEN=your_token_here
   ```

### Quick Start

**Option 1: Using nx (recommended)**
```bash
# From repo root
npx nx serve circle-ci
```

**Option 2: Manual**
```bash
# From repo root
cd apps/circle-ci
npm install
npm run build  # Generates tests.json + builds React app
npm run serve  # Starts proxy server on port 5178
```

Then open http://localhost:5178

### Using the UI

1. **Select a Test**: Click any test in the left panel
2. **Trigger on CircleCI**: Click "Run on CircleCI" button
3. **Monitor Progress**: Watch the CI details panel (right side) update automatically
4. **View Logs**: Click on any job to see its logs in the bottom panel
5. **Download Artifacts**: Click artifact links to download screenshots/videos
6. **Favorite Tests**: Star tests you use frequently for quick access

## Architecture

### Frontend (React + TypeScript + Vite)
- **VS Code-style 3-panel layout**: Tests (left), CI details (right), Logs (bottom)
- **Dark mode by default** with persistent settings
- **Components**: TestTable, ControlPanel, CIPipelineDetails, LogPanel
- **Hooks**: useSettings, useFavorites, useCIStatus
- **Build output**: `dist/` (static files served by proxy server)

### Backend (Express + TypeScript)
- **proxy-server.ts**: Minimal Express server (~100 lines)
  - Serves static files from `dist/`
  - Proxies CircleCI API calls (CORS-blocked operations)
  - Provides `/api/trigger`, `/api/status`, `/api/circleci/*` endpoints
- **trigger-circleci.ts**: CLI tool to trigger CircleCI pipelines
- **generate-tests-json.ts**: Scans test files and outputs `public/tests.json`

### Integration with CircleCI
- Reads test patterns from `apps/remix-ide-e2e/src/tests/`
- Triggers CircleCI workflows: `run_file_tests`, `run_pr_tests`, `run_flaky_tests`
- Uses `apps/remix-ide/ci/singletest.sh` to filter and run specific tests
- Supports patterns like: `blockchain_group1`, `\.pr`, `\.flaky`

### Integration with CircleCI
- Reads test patterns from `apps/remix-ide-e2e/src/tests/`
- Triggers CircleCI workflows: `run_file_tests`, `run_pr_tests`, `run_flaky_tests`
- Uses `apps/remix-ide/ci/singletest.sh` to filter and run specific tests
- Supports patterns like: `blockchain_group1`, `\.pr`, `\.flaky`

## Development

### Run in development mode
```bash
npm run dev  # Starts Vite dev server with HMR on port 5173
```

### Build for production
```bash
npm run build  # Runs generate-tests-json.ts, then builds React app to dist/
```

### Regenerate test list
```bash
npm run prebuild  # Or: npx tsx generate-tests-json.ts
```

## Project Structure

```
apps/circle-ci/
├── src/                      # React app source
│   ├── components/           # UI components
│   ├── hooks/               # Custom React hooks
│   ├── api.ts               # CircleCI API client
│   └── App.tsx              # Main app component
├── public/                   # Static assets
│   └── tests.json           # Generated test list (169 tests)
├── dist/                     # Build output (Vite)
├── generate-tests-json.ts   # Scans test files → tests.json
├── proxy-server.ts          # Express server (port 5178)
├── trigger-circleci.ts      # CLI tool to trigger pipelines
├── package.json             # Dependencies + scripts
├── tsconfig.json            # TypeScript config
├── vite.config.ts           # Vite build config
└── PROJECT_README.md        # This file
```

## Key Files Explained

- **generate-tests-json.ts**: Scans `apps/remix-ide-e2e/src/tests/*.test.ts`, filters out `@disabled` tests, generates `public/tests.json` with 169 tests
- **proxy-server.ts**: Express server that serves `dist/`, proxies CircleCI API calls (bypasses CORS), provides `/api/trigger`, `/api/status`, `/api/circleci/*`
- **trigger-circleci.ts**: Standalone CLI tool to trigger CircleCI pipelines with test pattern parameter
- **src/api.ts**: Client-side API wrapper with branch filtering and CircleCI integration
- **src/App.tsx**: Main React component with VS Code-style 3-panel layout

## Notes

- All settings (dark mode, favorites, filters) are stored in browser localStorage
- CI polling happens every 5 seconds when monitoring a pipeline
- The app automatically detects your current git branch via `/api/status`
- Test patterns support regex: `blockchain_group1`, `\.pr`, `\.flaky`, etc.
- The proxy server must be running for CircleCI integration to work (CORS restrictions)
