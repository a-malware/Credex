# Vercel Deployment via Dashboard (Recommended)

The Vercel CLI is having timeout issues with the large project size. Let's deploy directly via the Vercel Dashboard instead, which is more reliable.

## Step 1: Push to GitHub

First, make sure your code is pushed to GitHub:

```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

## Step 2: Connect GitHub to Vercel

1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Click "Import Git Repository"
4. Search for your repository (e.g., "anything-dev" or your repo name)
5. Click "Import"

## Step 3: Configure Project Settings

When Vercel shows the configuration screen:

**Framework Preset**: Select "Other" (since we're using React Router)

**Build Command**: 
```
cd apps/web && npm install && npm run build
```

**Output Directory**: 
```
apps/web/build/client
```

**Root Directory**: 
```
./
```

## Step 4: Add Environment Variables

Before deploying, add these environment variables:

1. Click "Environment Variables"
2. Add:
   - **Name**: `VITE_SOLANA_CLUSTER`
   - **Value**: `devnet`
   - Click "Add"

3. Add another:
   - **Name**: `VITE_PROGRAM_ID`
   - **Value**: `CFK9b4RXvcmJKfxodF5HNshWGfkvoQ2iAaN9eyRJnGfh`
   - Click "Add"

4. Click "Deploy"

## Step 5: Wait for Deployment

Vercel will:
1. Clone your repository
2. Install dependencies
3. Build the project
4. Deploy to production

This typically takes 3-5 minutes.

## Step 6: Access Your Deployment

Once complete, you'll see:
- **Production URL**: `https://your-project-name.vercel.app`
- **Deployment Status**: "Ready"

## Step 7: Test the Deployment

1. Visit your production URL
2. Connect your Phantom wallet
3. Test the features:
   - Register node
   - Submit tasks
   - Vouch for nodes
   - Cast votes
   - Check Explorer links

## Troubleshooting

### Build Fails
- Check that `apps/web/package.json` exists
- Verify build command is correct
- Check that all dependencies are listed

### Environment Variables Not Working
- Make sure variables start with `VITE_`
- Verify they're added in Environment Variables section
- Redeploy after adding variables

### Deployment Hangs
- This is normal for large projects
- Wait 5-10 minutes
- Check deployment logs in Vercel Dashboard

### URL Not Working
- Wait 2-3 minutes after deployment completes
- Clear browser cache
- Try incognito/private mode

## Next Steps

After successful deployment:
1. Test all features on the live site
2. Share the URL with team members
3. Monitor deployment logs for any errors
4. Set up auto-deployment (optional)

## Auto-Deployment Setup (Optional)

Vercel automatically deploys on every push to main branch. To disable:
1. Go to Project Settings
2. Click "Git"
3. Toggle "Automatic Deployments" as needed

