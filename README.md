# Orbital Sigma 🛰️

**Satellite-powered market intelligence platform** that detects anomalies in real-time and generates actionable trading signals.

## 🚀 Latest Updates (August 2025)

✅ **Complete NRT (Near Real-Time) satellite anomaly detection platform**  
✅ **Fixed Google Earth Engine integration with Sentinel-2 HARMONIZED dataset**  
✅ **AlphaEarth embedding support with intelligent fallback**  
✅ **Interactive map with auto-focus based on natural language queries**  
✅ **Domain-specific anomaly scoring for ports, farms, mines, and energy**  
✅ **Evidence panel with satellite imagery and market impact analysis**

## Stack

- Next.js (App Router, TypeScript, Tailwind) — frontend web app
- Convex (TypeScript) — realtime database + server functions
- FastAPI (Python 3.10) — geo-service microservice
- Google Earth Engine (GEE) — geospatial data/processing via earthengine-api
- GPT-5 (LLM) — placeholder for AI features using OpenAI API

```
+-------------------+         +------------------------+        +---------------------+
|  Next.js 14 (TS)  |  HTTP   |  Convex (functions +   |  RPC   |  FastAPI (Python)   |
|  Tailwind, ESLint | <-----> |  realtime DB, auth)    | <----> |  earthengine-api    |
+-------------------+         +------------------------+        +---------------------+
         |                                                                |
         |                                                                |
         v                                                                v
   OpenAI API (GPT-5, placeholder)                              Google Earth Engine
```

## Repository layout

- frontend/ — Next.js app
- backend/ — Convex project (TypeScript)
- geo-service/ — FastAPI microservice with GEE integration
- .env.example — environment variable template
- LICENSE — MIT

## Prerequisites

- Windows 10/11 with PowerShell
- Node.js 18+ and npm
- Python 3.10
- Git
- GitHub CLI (gh) (already installed during setup)

Optional but recommended:
- Convex account (login happens on first dev run)
- Google Earth Engine access for your service account

## Environment variables

Copy .env.example and fill values as needed (do not commit secrets):

- OPENAI_API_KEY — for GPT-5 placeholder usage
- CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY — if using Clerk auth
- STRIPE_SECRET_KEY — if using Stripe
- GEE_SERVICE_ACCOUNT_JSON — absolute path to your GEE service account key JSON (local only)
- GCP_PROJECT_ID — your Google Cloud project id
- CONVEX_DEPLOYMENT — set by Convex CLI (in backend/.env.local for local dev)

Example (PowerShell session only):

$env:GEE_SERVICE_ACCOUNT_JSON = "C:\Users\<you>\Downloads\ee-key.json"

## First-time setup

1) Install dependencies
- Frontend (Next.js):
  npm install -C .\frontend

- Backend (Convex): already initialized with convex in backend/package.json
  If needed:
  npm install -C .\backend

- Geo-service (Python): a virtual env is already created at geo-service/.venv and requirements.txt was generated.
  To recreate/install:
  py -3.10 -m venv .\geo-service\.venv
  .\geo-service\.venv\Scripts\python.exe -m pip install --upgrade pip
  .\geo-service\.venv\Scripts\pip install -r .\geo-service\requirements.txt

2) Convex login and link (one-time)
- From backend/ the CLI has already provisioned a dev deployment and wrote backend/.env.local with CONVEX_URL and CONVEX_DEPLOYMENT.
- To reconfigure or change project name:
  npx convex dev --once --configure=new -C .\backend

3) Google Earth Engine service account
- Make sure the service account is enabled for Earth Engine and has needed roles.
- In your PowerShell session before starting the geo-service:
  $env:GEE_SERVICE_ACCOUNT_JSON = "C:\Users\<you>\Downloads\ee-key.json"

## Running locally

Run each service in its own terminal.

- Frontend (Next.js):
  npm run -C .\frontend dev
  Open http://localhost:3000

- Backend (Convex):
  npx convex dev -C .\backend
  Convex will watch functions in backend/convex and print the local deployment URL.

- Geo-service (FastAPI):
  .\geo-service\.venv\Scripts\python.exe -m uvicorn main:app --reload --app-dir .\geo-service --port 8000
  Health check: http://127.0.0.1:8000/health
  GEE status: http://127.0.0.1:8000/gee/info

## Notes on secrets

- Do not commit key files or secrets. The repo .gitignore is configured to ignore Python venvs, .env files, and generic *.json (with exceptions for common manifests).
- Use environment variables during local development.

## Scripts cheat sheet

- Verify git remote: git --no-pager remote -v
- Push latest changes:
  git add .
  git commit -m "chore: update"
  git push

## License

MIT
