# Orbital Sigma Frontend

A Next.js-based satellite intelligence platform for market analysis and trading signals.

## Features

- 🛰️ Real-time satellite data analysis
- 📊 Market intelligence dashboard
- 💹 Trading signal generation
- 🔐 Secure authentication with Clerk
- 💳 Stripe billing integration
- 🗺️ Interactive maps with MapLibre GL

## Tech Stack

- **Framework**: Next.js 15.4.6
- **UI**: React 19.1.0 with Tailwind CSS
- **Authentication**: Clerk
- **Payments**: Stripe
- **Maps**: MapLibre GL
- **Styling**: Tailwind CSS v4

## Prerequisites

- Node.js 20+ 
- npm or yarn
- Docker (for containerized deployment)

## Quick Start

### Local Development

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
# Edit .env.local with your actual API keys
```

4. **Run development server**
```bash
npm run dev
```

The app will be available at http://localhost:3000

### Production Build

1. **Build the application**
```bash
npm run build
```

2. **Start production server**
```bash
npm run start
```

## Environment Variables

Create a `.env.local` file based on `.env.example`:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Convex Backend (optional)
NEXT_PUBLIC_CONVEX_URL=https://your-convex-instance.convex.cloud
CONVEX_DEPLOY_KEY=your_convex_deploy_key

# API Configuration
NEXT_PUBLIC_API_BASE=https://your-domain.com/api

# Stripe Billing
STRIPE_SECRET_KEY=sk_test_your_stripe_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PRO_PRICE_ID=price_your_price_id

# Base URL
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

## Deployment

### Docker Deployment

1. **Build Docker image**
```bash
docker build -t orbital-sigma-frontend .
```

2. **Run with Docker**
```bash
docker run -p 3000:3000 --env-file .env.local orbital-sigma-frontend
```

### Docker Compose

1. **Start with docker-compose**
```bash
docker-compose up -d
```

2. **Stop the service**
```bash
docker-compose down
```

### Vercel Deployment

1. **Install Vercel CLI**
```bash
npm i -g vercel
```

2. **Deploy**
```bash
vercel --prod
```

### Manual Deployment

1. **Build the application**
```bash
npm run build
```

2. **Copy files to your server**
   - `.next/` directory
   - `public/` directory
   - `package.json` and `package-lock.json`
   - `next.config.js`

3. **Install production dependencies**
```bash
npm ci --only=production
```

4. **Start with PM2 (recommended)**
```bash
npm install -g pm2
pm2 start npm --name "orbital-sigma" -- start
pm2 save
pm2 startup
```

## Project Structure

```
frontend/
├── pages/              # Next.js pages
│   ├── api/           # API routes
│   ├── index.tsx      # Landing page
│   ├── dashboard.tsx  # Main dashboard
│   └── ...
├── components/        # React components
├── public/           # Static assets
├── styles/           # Global styles
├── types/            # TypeScript definitions
├── next.config.js    # Next.js configuration
├── tailwind.config.js # Tailwind configuration
└── package.json      # Dependencies
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run production` - Build and start production

## API Routes

- `/api/signals` - Trading signals endpoint
- `/api/aois` - Areas of Interest data
- `/api/instruments` - Trading instruments
- `/api/billing/mark-pro` - Billing upgrade endpoint
- `/api/stripe/*` - Stripe integration endpoints

## Performance Optimizations

- Static generation for public pages
- Dynamic imports for heavy components
- Image optimization with Next.js Image
- API route caching
- Tailwind CSS purging

## Security

- Environment variables for sensitive data
- Clerk authentication on all protected routes
- Stripe webhook signature verification
- CORS configuration for API routes
- Content Security Policy headers

## Troubleshooting

### Build Errors
- Clear `.next` cache: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`

### Environment Variables
- Ensure all required variables are set in `.env.local`
- Restart the server after changing environment variables

### Production Issues
- Check logs: `pm2 logs orbital-sigma`
- Verify environment: `NODE_ENV=production`
- Check port availability: `lsof -i :3000`

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

[Your License]

## Support

For support, email support@orbitalsigma.com or open an issue.
