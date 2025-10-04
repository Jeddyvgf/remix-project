# Remix E2E Test Runner - Web UI

A **100% client-side** React application for running and monitoring Remix E2E tests via CircleCI.

## 🎯 No Backend Required!

This app runs entirely in the browser - no Node.js server needed!

## 🚀 Quick Start

### Build & Serve
```bash
npm run build
cd dist
python3 -m http.server 8080
```

Visit http://localhost:8080 and click "Set token" to enter your CircleCI Personal API Token.

Get your token: https://app.circleci.com/settings/user/tokens

## ✨ Features

- ✅ List all E2E tests
- ✅ Filter & favorite tests  
- ✅ Trigger CircleCI pipelines
- ✅ Monitor pipeline status
- ✅ View workflow/job details
- ✅ Download artifacts
- ✅ Cancel/rerun workflows
- ✅ Dark mode (default)
- ✅ Draggable log panel

## 🏗️ Architecture

Pure static site - all CircleCI API calls made directly from the browser!

**Status**: ✨ Serverless, secure, and simple!
