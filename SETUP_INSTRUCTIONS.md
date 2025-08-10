# Orbital Sigma - Complete Setup Instructions

## Overview
Orbital Sigma is a fully functional satellite anomaly detection and trading signal application that combines:
- Real-time satellite data analysis from Google Earth Engine
- Natural language processing for queries
- AI-powered trading signal generation
- Interactive map visualization
- Evidence-based analysis with historical context

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
│  - Map Interface (Leaflet/Mapbox)                           │
│  - Natural Language Chat                                     │
│  - Evidence Panel with Satellite Imagery                    │
│  - Signal Cards with Trading Recommendations                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     API Layer (Next.js API)                  │
│  - /api/intelligence/generate-signals                       │
│  - /api/intelligence/satellite-evidence                     │
│  - Authentication via Clerk                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────┴──────────────────────┐
        │                                            │
        ▼                                            ▼
┌──────────────────────┐              ┌──────────────────────┐
│   Convex Backend     │              │   Geo-Service        │
│  - Query Parsing     │              │  - Earth Engine API  │
│  - AOI Matching      │              │  - Anomaly Detection │
│  - Signal Generation │              │  - Satellite Data    │
│  - GPT Integration   │              │  - Live Feed         │
└──────────────────────┘              └──────────────────────┘
```

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Python** (v3.8 or higher)
3. **Git**
4. **Required API Keys**:
   - Clerk (Authentication)
   - OpenAI API Key (GPT-4/GPT-5)
   - Google Earth Engine credentials (optional, for real satellite data)
   - Mapbox API Key (optional, for enhanced maps)

## Step-by-Step Setup

### 1. Clone Repository (if needed)
```bash
git clone <repository-url>
cd orbital-sigma
```

### 2. Install Dependencies

#### Frontend Dependencies
```bash
cd frontend
npm install
```

#### Backend Dependencies
```bash
cd ../backend
npm install
```

#### Geo-Service Dependencies
```bash
cd ../geo-service
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Environment Configuration

#### Frontend (.env.local)
Create `frontend/.env.local`:
```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/intelligence
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/intelligence

# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
CONVEX_DEPLOYMENT=your_deployment_id

# Optional: Mapbox for enhanced maps
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token

# Geo-Service URL
GEO_SERVICE_URL=http://127.0.0.1:8000
```

#### Backend (.env.local)
Create `backend/.env.local`:
```env
# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Optional: Earth Engine (for real satellite data)
EARTH_ENGINE_PRIVATE_KEY=your_ee_private_key
EARTH_ENGINE_EMAIL=your_ee_service_account_email
```

#### Geo-Service (.env)
Create `geo-service/.env`:
```env
# Earth Engine Credentials (optional)
EARTH_ENGINE_PROJECT=your_project_id
EARTH_ENGINE_PRIVATE_KEY_PATH=path_to_key.json

# API Configuration
API_PORT=8000
ENABLE_CORS=true
```

### 4. Database Setup (Convex)

```bash
cd backend
npx convex dev
# This will start the Convex development server

# In another terminal, seed the database:
npx convex run seed
```

### 5. Start All Services

You need to run all three services simultaneously:

#### Terminal 1: Geo-Service
```bash
cd geo-service
# Activate virtual environment
venv\Scripts\activate  # Windows
# or
source venv/bin/activate  # Mac/Linux

python -m uvicorn app:app --reload --port 8000
```

#### Terminal 2: Convex Backend
```bash
cd backend
npx convex dev
```

#### Terminal 3: Frontend
```bash
cd frontend
npm run dev
```

### 6. Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

## Features Overview

### 1. Main Interface
- **Left Panel**: Interactive world map with glowing hotspots
  - Green = Low anomaly
  - Yellow = Medium anomaly  
  - Red = High anomaly
- **Right Panel**: Natural language chat interface

### 2. Natural Language Queries
Example queries you can try:
- "Show me any changes in Brazilian soy regions in the past 2 weeks"
- "Which ports look stressed this week and what could that do to shipping?"
- "Find copper mine disruptions in Chile"
- "Detect energy infrastructure changes in Texas"

### 3. Evidence Panel
Click "Show evidence" on any signal to see:
- Before/after satellite imagery comparison
- NDVI changes and vegetation health metrics
- Statistical significance (sigma levels)
- Historical context (5-year comparison)
- Market impact analysis

### 4. Export Capabilities
- **Export CSV**: Download signals as spreadsheet
- **Copy Thesis**: Copy trading rationale to clipboard
- **Export Evidence**: Download complete analysis as JSON

### 5. Query Management
- Save queries for monitoring
- Set up alerts for magnitude thresholds
- View query history
- Re-run saved queries

## Data Flow

1. **User enters natural language query**
2. **Query parsed** using NLP to extract:
   - Regions (Brazil, China, etc.)
   - Commodities (soy, copper, oil)
   - Time windows (week, month)
   - Magnitude thresholds

3. **AOI Matching** finds relevant Areas of Interest:
   - Ports, farms, mines, energy facilities
   - Filtered by region and commodity

4. **Anomaly Detection** (2025 vs 2024 baseline):
   - Fetches satellite data for each AOI
   - Compares current state to historical baseline
   - Calculates magnitude and confidence scores

5. **Signal Generation**:
   - Converts anomalies to trading signals
   - Determines direction (long/short)
   - Generates market thesis
   - Calculates impact and confidence

6. **Evidence Compilation**:
   - Satellite imagery comparison
   - Statistical analysis
   - Historical precedents
   - Market impact assessment

## Testing the System

### Quick Test (With Simulated Data)
The system works with simulated data if backends are unavailable:
1. Start only the frontend: `npm run dev`
2. Sign in with Clerk
3. Enter any query - will use mock data

### Full Test (With Real Services)
1. Start all three services (geo-service, convex, frontend)
2. Sign in with Clerk
3. Try: "Show copper mine activity in Chile"
4. Click "Show evidence" on generated signals
5. Export results as CSV

## Troubleshooting

### Issue: "Failed to process query"
**Solution**: Check if all backend services are running:
- Convex: `npx convex dev` 
- Geo-service: `python -m uvicorn app:app`

### Issue: Map not loading
**Solution**: The map works with free Stadia tiles by default. For Mapbox:
1. Get free API key from mapbox.com
2. Add to frontend/.env.local as NEXT_PUBLIC_MAPBOX_TOKEN

### Issue: No anomalies detected
**Solution**: The system generates simulated anomalies if none found. For real data:
1. Configure Earth Engine credentials
2. Ensure AOIs exist in your query region

### Issue: Authentication errors
**Solution**: 
1. Check Clerk keys in .env.local
2. Ensure NEXT_PUBLIC_CLERK_* variables are set
3. Try clearing cookies and re-authenticating

## Production Deployment

### Frontend (Vercel)
```bash
cd frontend
vercel deploy
```

### Backend (Convex)
```bash
cd backend
npx convex deploy
```

### Geo-Service (Cloud Run/Heroku)
```bash
cd geo-service
# Deploy using your preferred platform
gcloud run deploy  # Google Cloud
heroku create      # Heroku
```

## API Endpoints

### Main Intelligence API
`POST /api/intelligence/generate-signals`
```json
{
  "query": "Show soy farm changes in Brazil"
}
```

### Satellite Evidence API  
`POST /api/intelligence/satellite-evidence`
```json
{
  "aoi_id": "aoi_123",
  "coordinates": {"lat": -15.79, "lng": -47.88},
  "timeframe": "14d"
}
```

## Performance Optimization

1. **Caching**: AOI matches cached for 1 hour
2. **Batch Processing**: Up to 5 AOIs processed simultaneously
3. **Lazy Loading**: Map and evidence panel load on-demand
4. **Query Throttling**: Max 10 queries per minute per user

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review logs in each service terminal
3. Ensure all environment variables are set correctly

## License

MIT
