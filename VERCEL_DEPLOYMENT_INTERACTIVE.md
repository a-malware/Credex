# Vercel Deployment - Interactive Guide

## Step-by-Step Deployment Process

You're already logged in to Vercel! Now let's deploy. Follow these steps carefully.

---

## Question 1: Set up and deploy?

**What it's asking**: Do you want to set up and deploy this project?

**Your answer**: Type `y` or `yes` and press Enter

**Why**: This confirms you want to proceed with deployment.

---

## Question 2: Which scope should contain your project?

**What it's asking**: Which Vercel team/account should own this project?

**Your answer**: Select `a-malware's projects` (use arrow keys to navigate, then press Enter)

**Why**: This is your personal Vercel account where the project will be deployed.

---

## Question 3: Link to existing project?

**What it's asking**: Do you have an existing Vercel project you want to link to?

**Your answer**: Type `n` or `no` and press Enter

**Why**: This is your first deployment, so there's no existing project to link to. Vercel will create a new one.

---

## Question 4: What's your project's name?

**What it's asking**: What should this project be called on Vercel?

**Your answer**: Type `coldstart-por` and press Enter

**Why**: This will be the name of your project in the Vercel dashboard and part of your deployment URL.

---

## Question 5: In which directory is your code located?

**What it's asking**: Where is the code to deploy?

**Your answer**: Type `./` and press Enter

**Why**: The root directory contains the vercel.json configuration that tells Vercel how to build and deploy your app.

---

## After These Questions

Vercel will:
1. **Upload your files** (this takes a few minutes - 1.6GB total)
2. **Build your application** (runs: `cd apps/web && npm install && npm run build`)
3. **Deploy to production** (creates your live URL)

**During upload/build, you'll see**:
- Progress bars showing upload percentage
- Build logs showing compilation progress
- Final deployment URL when complete

---

## Expected Output

When deployment succeeds, you'll see something like:

```
✓ Production: https://coldstart-por.vercel.app
✓ Deployment complete!
```

---

## Environment Variables

After deployment completes, you need to add environment variables:

1. Go to: https://vercel.com/dashboard
2. Click on your `coldstart-por` project
3. Go to Settings → Environment Variables
4. Add these variables:
   - **Name**: `VITE_SOLANA_CLUSTER`
   - **Value**: `devnet`
   - Click "Add"

5. Add another:
   - **Name**: `VITE_PROGRAM_ID`
   - **Value**: `CFK9b4RXvcmJKfxodF5HNshWGfkvoQ2iAaN9eyRJnGfh`
   - Click "Add"

6. Click "Save"

---

## Redeploy After Adding Variables

After adding environment variables:

1. Go back to terminal
2. Run: `vercel --prod`
3. Answer the same questions again (or just press Enter to use defaults)
4. This redeploys with the environment variables

---

## Testing Your Deployment

Once deployed:

1. Visit your URL: `https://coldstart-por.vercel.app`
2. Connect your Phantom wallet
3. Test the features:
   - Register node
   - Submit tasks
   - Vouch for nodes
   - Cast votes

---

## Troubleshooting

### Build Fails
- Check that `apps/web/package.json` exists
- Ensure all dependencies are listed
- Try: `cd apps/web && npm install && npm run build` locally first

### Environment Variables Not Working
- Make sure you added them in Vercel Dashboard
- Redeploy after adding variables
- Check that variable names start with `VITE_`

### Deployment Hangs
- This is normal for large projects
- Wait 5-10 minutes for upload to complete
- Don't close the terminal

### URL Not Working
- Wait 2-3 minutes after deployment completes
- Clear browser cache
- Try incognito/private mode

---

## Quick Reference

| Question | Answer |
|----------|--------|
| Set up and deploy? | `y` |
| Which scope? | `a-malware's projects` |
| Link to existing? | `n` |
| Project name? | `coldstart-por` |
| Code directory? | `./` |

---

## Next: Run the Deployment

Ready? Run this command in your terminal:

```bash
vercel --prod
```

Then follow the prompts using the answers above!
