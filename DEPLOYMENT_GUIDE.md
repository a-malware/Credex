## Deployment Status

**Latest Deployment**: Commit 80eae59 - "Add dynamic index.html generation from manifest"

**Key Changes**:
1. ~~Created `apps/web/scripts/generate-index.js` - Dynamically generates index.html from Vite manifest~~ **REMOVED** - React Router v7 SPA mode handles this automatically
2. ~~Updated build script to run generation after React Router build~~ **REVERTED** - Using default `react-router build`
3. Updated vercel.json to use SPA routing with automatic index.html generation

**Why This Matters**:
- Vite generates hashed filenames (e.g., `entry.client-BqM3s2RH.js`) that change on every build
- Static index.html would break when filenames change
- Dynamic generation reads the manifest and injects correct filenames automatically

**Deployment URL**: Check Vercel Dashboard for the latest deployment URL

**Next Steps After Deployment**:
1. Verify site loads without 404 errors
2. Test wallet connection (Phantom on Devnet)
3. Test all blockchain interactions
4. Verify Solana Explorer links work

---

# Deployment Guide - ColdStart PoR Protocol

## Prerequisites

- Node.js 18+ installed
- Vercel CLI installed: `npm install -g vercel`
- Vercel account (free tier works)
- Git repository connected to Vercel (optional for auto-deployment)

## Environment Variables

The following environment variables are required for deployment:

```bash
VITE_SOLANA_CLUSTER=devnet
VITE_PROGRAM_ID=CFK9b4RXvcmJKfxodF5HNshWGfkvoQ2iAaN9eyRJnGfh
```

## Manual Deployment to Vercel

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

### Step 3: Deploy from Project Root

```bash
# Production deployment
vercel --prod

# Preview deployment (for testing)
vercel
```

### Step 4: Configure Environment Variables (First Time Only)

During the first deployment, Vercel will prompt you to:
1. Set up and deploy the project
2. Link to existing project or create new one
3. Configure project settings

After deployment, add environment variables via Vercel Dashboard:
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add:
   - `VITE_SOLANA_CLUSTER` = `devnet`
   - `VITE_PROGRAM_ID` = `CFK9b4RXvcmJKfxodF5HNshWGfkvoQ2iAaN9eyRJnGfh`

### Step 5: Redeploy with Environment Variables

```bash
vercel --prod
```

## Automatic Deployment (GitHub Integration)

### Step 1: Connect GitHub Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure project settings:
   - **Framework Preset**: Other
   - **Root Directory**: `./`
   - **Build Command**: `cd apps/web && npm install && npm run build`
   - **Output Directory**: `apps/web/build/client`
   - **Install Command**: `npm install`

### Step 2: Configure Environment Variables

In project settings, add:
- `VITE_SOLANA_CLUSTER` = `devnet`
- `VITE_PROGRAM_ID` = `CFK9b4RXvcmJKfxodF5HNshWGfkvoQ2iAaN9eyRJnGfh`

### Step 3: Deploy

Click "Deploy" - Vercel will automatically build and deploy your application.

### Step 4: Enable Auto-Deployment

By default, Vercel automatically deploys:
- **Production**: Pushes to `main` or `master` branch
- **Preview**: Pull requests and other branches

To configure:
1. Go to Project Settings → Git
2. Configure branch settings
3. Enable/disable auto-deployment as needed

## Build Configuration

The project uses React Router v7 with the following build setup:

```json
{
  "buildCommand": "cd apps/web && npm install && npm run build",
  "outputDirectory": "apps/web/build/client",
  "installCommand": "npm install",
  "devCommand": "cd apps/web && npm run dev"
}
```

## Testing Deployment

### 1. Check Build Locally

```bash
cd apps/web
npm install
npm run build
npm run start
```

Visit `http://localhost:3000` to test the production build locally.

### 2. Test Deployed Application

After deployment, test the following:

1. **Wallet Connection**
   - Connect Phantom wallet
   - Switch to Solana Devnet
   - Verify wallet connects successfully

2. **Node Registration**
   - Click "Register Node" button
   - Confirm transaction in wallet
   - Verify transaction on Solana Explorer

3. **Task Submission**
   - Complete Phase 1 tasks
   - Verify Merkle proof generation
   - Check Explorer links work

4. **Vouching**
   - Navigate to Vouch tab
   - Verify Phase 2 nodes display
   - Test vouch transaction

5. **Voting**
   - Navigate to Validate tab
   - Cast vote for current round
   - Verify vote recorded

6. **Network Data**
   - Check dashboard displays current round
   - Verify total nodes count
   - Check reputation updates

## Troubleshooting

### Build Fails

**Issue**: Build command fails
**Solution**: 
```bash
# Clear node_modules and reinstall
cd apps/web
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Environment Variables Not Working

**Issue**: VITE_ variables not accessible
**Solution**: 
- Ensure variables are prefixed with `VITE_`
- Redeploy after adding variables
- Check Vercel deployment logs

### Wallet Connection Issues

**Issue**: Wallet doesn't connect on deployed site
**Solution**:
- Verify Phantom wallet is installed
- Switch wallet to Devnet network
- Check browser console for errors
- Ensure HTTPS is enabled (Vercel provides this automatically)

### 404 Errors on Routes

**Issue**: Direct navigation to routes returns 404
**Solution**: Vercel configuration includes rewrites for SPA routing. If issues persist, check `vercel.json` configuration.

## Monitoring

### Vercel Analytics

Enable Vercel Analytics in project settings to monitor:
- Page views
- Performance metrics
- Error rates
- User geography

### Deployment Logs

View deployment logs:
1. Go to Vercel Dashboard
2. Select your project
3. Click on a deployment
4. View "Build Logs" and "Function Logs"

## Custom Domain (Optional)

### Add Custom Domain

1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. Wait for DNS propagation (up to 48 hours)

### SSL Certificate

Vercel automatically provisions SSL certificates for all domains.

## Rollback

### Rollback to Previous Deployment

1. Go to Vercel Dashboard
2. Select your project
3. Click "Deployments"
4. Find the deployment you want to rollback to
5. Click "..." → "Promote to Production"

## Performance Optimization

### Enable Edge Caching

Vercel automatically caches static assets at the edge. For API routes:

```typescript
export const config = {
  runtime: 'edge',
};
```

### Optimize Bundle Size

```bash
# Analyze bundle
cd apps/web
npm run build -- --analyze
```

## Security

### Environment Variables

- Never commit `.env` files
- Use Vercel's environment variable management
- Rotate sensitive keys regularly

### HTTPS

- Vercel enforces HTTPS by default
- All HTTP requests are redirected to HTTPS

## Support

- **Vercel Documentation**: https://vercel.com/docs
- **React Router Documentation**: https://reactrouter.com/
- **Solana Documentation**: https://docs.solana.com/

## Deployment Checklist

- [ ] Vercel CLI installed
- [ ] Logged into Vercel account
- [ ] Environment variables configured
- [ ] Build tested locally
- [ ] Deployed to Vercel
- [ ] Wallet connection tested
- [ ] All features tested on deployed site
- [ ] Explorer links verified
- [ ] Custom domain configured (optional)
- [ ] Auto-deployment enabled (optional)
- [ ] Monitoring enabled

---

**Deployment Status**: Ready for deployment
**Network**: Solana Devnet
**Program ID**: CFK9b4RXvcmJKfxodF5HNshWGfkvoQ2iAaN9eyRJnGfh
**Framework**: React Router v7
**Hosting**: Vercel
