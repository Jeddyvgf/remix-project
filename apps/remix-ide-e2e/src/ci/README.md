# Remix E2E Test Runner

A modern React web UI for running and monitoring Remix IDE E2E tests via CircleCI.

## 🚀 Quick Start

```bash
# 1. Set your CircleCI token in .env.local (at project root)
echo "CIRCLECI_TOKEN=your_token_here" > .env.local

# 2. Build the UI
cd web-ui && npm run build

# 3. Start the server
cd .. && node proxy-server.js

# 4. Open http://localhost:5178
```

## ✨ Features

- ✅ **Browse 169 E2E tests** from a clean, searchable interface
- ✅ **Trigger tests on CircleCI** with a single click
- ✅ **Monitor pipeline status** in real-time
- ✅ **View workflow/job details** with duration and status
- ✅ **Download artifacts** (screenshots, videos)
- ✅ **Cancel/Rerun workflows** directly from the UI
- ✅ **Auto-detect running tests** on page load
- ✅ **Mark favorites** and filter tests
- ✅ **Dark mode** enabled by default
- ✅ **Draggable log panel** for viewing output

## 🏗️ Architecture

```
┌─────────────────────┐
│   React Frontend    │
│   (Port 5178)       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Proxy Server      │ ← Loads CIRCLECI_TOKEN from .env.local
│   (Express.js)      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   CircleCI API      │
│   (circleci.com)    │
└─────────────────────┘
```

**Why the proxy?** CircleCI's API has CORS restrictions that prevent direct browser calls. Our minimal proxy server (100 lines) handles authentication and bypasses CORS.

## 📁 Project Structure

```
ci/
├── proxy-server.js          # Minimal Express proxy (100 lines)
├── generate-tests-json.js   # Scans tests directory at build time
├── trigger-circleci.js      # Existing script to trigger pipelines
├── web-ui/                  # React app
│   ├── src/
│   │   ├── api.ts          # API client
│   │   ├── App.tsx         # Main component
│   │   ├── types.ts        # TypeScript interfaces
│   │   ├── hooks/          # Custom hooks (settings, favorites, CI status)
│   │   └── components/     # UI components
│   ├── public/
│   │   └── tests.json      # Generated list of tests
│   └── dist/               # Built static files
└── README.md               # This file
```

## 🔧 Configuration

### CircleCI Token

Get a Personal API Token from: https://app.circleci.com/settings/user/tokens

Add to `.env.local` at the **project root**:
```bash
CIRCLECI_TOKEN=your_token_here
```

### Customization

Edit `web-ui/src/api.ts` to change org/repo:
```typescript
function getOrgRepo(): { org: string; repo: string } {
  return { org: 'remix-project-org', repo: 'remix-project' }
}
```

## 🛠️ Development

```bash
# Generate tests list
node generate-tests-json.js

# Start dev server (with HMR)
cd web-ui && npm run dev

# Start proxy (in another terminal)
cd .. && node proxy-server.js

# Build for production
cd web-ui && npm run build
```

## 📊 API Endpoints

### Proxied (via `/api/*`)
- `POST /api/trigger` - Trigger new pipeline
- `GET /api/circleci/pipeline/{id}` - Get pipeline details
- `GET /api/circleci/pipeline/{id}/workflow` - Get workflows
- `GET /api/circleci/workflow/{id}/job` - Get jobs
- `GET /api/circleci/project/{slug}/{job}/artifacts` - Get artifacts
- `POST /api/circleci/workflow/{id}/cancel` - Cancel workflow
- `POST /api/circleci/workflow/{id}/rerun` - Rerun workflow

### Static
- `GET /tests.json` - List of all available tests
- `GET /*` - React SPA (serves index.html)

## 🎨 UI Features

### Test Management
- **Search/Filter** - Type to filter tests by name
- **Favorites** - Click ★ to mark favorite tests
- **Grouped Tests** - Automatically filters out non-grouped versions

### Pipeline Monitoring
- **Real-time Updates** - Polls every 5 seconds while running
- **Workflow Details** - Shows all workflows and their jobs
- **Job Status** - View duration, status badges, and links to CircleCI
- **Auto-Load** - Detects and loads running pipelines on page load

### Layout Options
- **Inline** - CI details below test list
- **Split** - Side-by-side view with pinnable details
- **Log Panel** - Draggable, collapsible log output

## 🚢 Deployment

The server is just Node.js + Express. Deploy anywhere:

### Local/Dev
```bash
node proxy-server.js
```

### PM2
```bash
pm2 start proxy-server.js --name remix-e2e-ui
```

### Docker
```dockerfile
FROM node:20
WORKDIR /app
COPY . .
RUN cd web-ui && npm install && npm run build
ENV CIRCLECI_TOKEN=your_token
EXPOSE 5178
CMD ["node", "proxy-server.js"]
```

### Systemd
Create `/etc/systemd/system/remix-e2e-ui.service`:
```ini
[Unit]
Description=Remix E2E Test Runner UI
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/remix-project/apps/remix-ide-e2e/src/ci
Environment="CIRCLECI_TOKEN=your_token"
ExecStart=/usr/bin/node proxy-server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

## 📝 Notes

### Test List Generation
- Scans `apps/remix-ide-e2e/src/tests/*.test.ts`
- Filters out tests with `@disabled: true`
- Handles grouped tests (e.g., `test_group1`, `test_group2`)
- Runs automatically before each build (`prebuild` script)

### Browser Storage
- **CircleCI Token** - Stored in localStorage (not used, server uses .env.local)
- **Favorites** - Stored in localStorage as JSON array
- **Settings** - Dark mode, layout, filters stored in localStorage

### Known Limitations
- Single branch support (defaults to `master`, can be configured)
- Token must be set on server (not in browser)
- Requires Node.js runtime for proxy server

## 🎯 Future Enhancements

- [ ] Branch selector
- [ ] Test history/analytics
- [ ] Multiple org/repo support
- [ ] Test duration graphs
- [ ] Notification system
- [ ] Keyboard shortcuts

## 🐛 Troubleshooting

### "CIRCLECI_TOKEN not found"
- Make sure `.env.local` exists at project root
- Check token is valid at https://app.circleci.com/settings/user/tokens
- Restart the proxy server after adding token

### "Failed to fetch"
- Check proxy server is running on port 5178
- Check server logs for errors
- Verify CircleCI token has correct permissions

### No tests showing
- Run `node generate-tests-json.js` manually
- Check `web-ui/public/tests.json` exists
- Rebuild the UI with `npm run build`

---

**Built with:** React 19, TypeScript, Vite, Express.js, CircleCI API v2

**Status:** ✅ Production ready!
