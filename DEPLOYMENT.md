# Deployment Guide

This guide covers deploying the OO-SlimOpslagSysteem application with the backend on Render and the frontend on GitHub Pages.

## Prerequisites

- GitHub account with access to this repository
- Render account (free tier is sufficient)
- Node.js and npm installed locally for testing

## Architecture Overview

- **Backend**: Deployed on Render (Node.js/Express with SQLite)
- **Frontend**: Deployed on GitHub Pages (React/Vite static site)
- **Communication**: Frontend connects to backend API via HTTPS

## Part 1: Deploy Backend to Render

### Step 1: Create a New Web Service on Render

1. Log in to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository or use the public repository URL
4. Configure the service:
   - **Name**: `oo-slimopslagsysteem` (or your preferred name)
   - **Region**: Choose closest to your users
   - **Branch**: `main` (or your deployment branch)
   - **Root Directory**: `project/backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: `Free` (or choose paid plan for better performance)

### Step 2: Configure Environment Variables

In Render, add the following environment variables (optional but recommended):

- `NODE_ENV`: `production`

**Note**: The `PORT` variable is automatically set by Render and should not be manually configured.

### Step 3: Configure Persistent Disk (Important!)

⚠️ **Critical for Database Persistence**

1. In your Render service settings, go to **"Disks"**
2. Click **"Add Disk"**
3. Configure:
   - **Name**: `database-storage`
   - **Mount Path**: `/home/runner/work/OO-SlimOpslagSysteem/OO-SlimOpslagSysteem/project/backend`
   - **Size**: 1 GB (free tier allows up to 1 GB)

Without this, your database will be reset on every deployment!

### Step 4: Deploy Backend

1. Click **"Create Web Service"**
2. Wait for the initial deployment (5-10 minutes)
3. Once deployed, note your service URL: `https://your-app-name.onrender.com`
4. Test the backend by visiting: `https://your-app-name.onrender.com/status`
   - You should see: `{"status":"Server draait goed!"}`

### Step 5: Test Backend Endpoints

Verify key endpoints are working:

```bash
# Check status
curl https://your-app-name.onrender.com/status

# Test root endpoint
curl https://your-app-name.onrender.com/
```

## Part 2: Deploy Frontend to GitHub Pages

### Step 1: Update Production Environment File

1. Open `project/frontend/.env.production`
2. Update with your actual Render URL:
   ```
   VITE_API_URL=https://your-app-name.onrender.com
   ```
   Replace `your-app-name` with your actual Render service name

### Step 2: Install Dependencies

```bash
cd project/frontend
npm install
```

This will install the `gh-pages` package needed for deployment.

### Step 3: Build and Deploy

From the `project/frontend` directory:

```bash
npm run deploy
```

This command will:
1. Build the production version of your app
2. Deploy it to the `gh-pages` branch
3. Make it available at `https://devgoose1.github.io/OO-SlimOpslagSysteem/`

### Step 4: Enable GitHub Pages

1. Go to your GitHub repository settings
2. Navigate to **Settings** → **Pages**
3. Under **Source**, select:
   - **Branch**: `gh-pages`
   - **Folder**: `/ (root)`
4. Click **Save**
5. Wait 2-5 minutes for GitHub to deploy your site

### Step 5: Verify Deployment

1. Visit `https://devgoose1.github.io/OO-SlimOpslagSysteem/`
2. Open browser DevTools (F12) → Console
3. Check for any errors connecting to the backend
4. Try logging in to verify full functionality

## Part 3: Local Development Setup

### Backend Local Development

```bash
cd project/backend
npm install
node server.js
```

The server will run on `http://localhost:3000`

### Frontend Local Development

1. Ensure `.env.development` exists with:
   ```
   VITE_API_URL=http://localhost:3000
   ```

2. Start the development server:
   ```bash
   cd project/frontend
   npm install
   npm run dev
   ```

3. Open `http://localhost:5173` in your browser

## Environment Variables Reference

### Frontend Environment Files

- **`.env.development`**: Used during local development (`npm run dev`)
  ```
  VITE_API_URL=http://localhost:3000
  ```

- **`.env.production`**: Used during production builds (`npm run build`)
  ```
  VITE_API_URL=https://your-app-name.onrender.com
  ```

- **`.env`**: Local override (gitignored, not committed)
  - Use this for personal testing configurations

### Backend Environment Variables

- **`PORT`**: Automatically set by Render (defaults to 3000 locally)
- **`NODE_ENV`**: Set to `production` on Render (optional)

## CORS Configuration

The backend is configured to accept requests from:
- `https://devgoose1.github.io` (GitHub Pages production)
- `http://localhost:5173` (Local development)
- `http://127.0.0.1:5173` (Alternative localhost)
- `http://192.168.68.122:5173` (Local network testing)

If you need to add additional origins, edit `project/backend/server.js` line 47-52.

## Troubleshooting

### Backend Issues

#### 1. "Cannot connect to backend"
- Check if your Render service is running in the dashboard
- Verify the URL in `.env.production` matches your Render URL exactly
- Check Render logs for errors: Dashboard → Your Service → Logs

#### 2. "Database resets on deployment"
- Ensure you've configured a persistent disk in Render
- Verify the mount path matches your database location

#### 3. "CORS errors in browser"
- Verify your GitHub Pages URL is in the CORS origins list
- Check that you're using `https://` (not `http://`) for GitHub Pages

### Frontend Issues

#### 1. "404 errors on refresh"
- This is expected with GitHub Pages and client-side routing
- Users should use the app navigation, not direct URLs

#### 2. "Assets not loading"
- Verify `base: '/OO-SlimOpslagSysteem/'` is set in `vite.config.js`
- Check that `homepage` in `package.json` matches your repository name

#### 3. "API calls fail in production"
- Check `.env.production` has the correct Render URL
- Rebuild and redeploy: `npm run deploy`
- Clear browser cache

### Render Free Tier Limitations

⚠️ **Important Notes about Render Free Tier**:

1. **Service Spin-Down**: Free tier services automatically sleep after 15 minutes of inactivity
   - First request after sleep takes 30-60 seconds to respond
   - Consider upgrading to paid tier for production use

2. **Monthly Limits**: 
   - 750 hours per month of running time (enough for continuous operation)
   - 100 GB bandwidth per month

3. **Database Persistence**:
   - Requires persistent disk configuration (see Part 1, Step 3)
   - Free tier includes 1 GB of persistent storage

## Post-Deployment Checklist

- [ ] Backend is running on Render and accessible via HTTPS
- [ ] Backend `/status` endpoint returns successful response
- [ ] Persistent disk is configured for database storage
- [ ] Frontend `.env.production` has correct Render URL
- [ ] Frontend is deployed to GitHub Pages
- [ ] GitHub Pages is enabled in repository settings
- [ ] Can access application at `https://devgoose1.github.io/OO-SlimOpslagSysteem/`
- [ ] Login functionality works end-to-end
- [ ] No CORS errors in browser console
- [ ] Test creating/reading/updating data
- [ ] Verify data persists after Render service restarts

## Updating the Application

### Backend Updates

1. Push changes to your GitHub repository
2. Render will automatically detect changes and redeploy
3. Monitor deployment in Render dashboard
4. Test endpoints after deployment

### Frontend Updates

1. Update your code locally
2. Commit and push to GitHub
3. Run deployment command:
   ```bash
   cd project/frontend
   npm run deploy
   ```
4. Wait 2-5 minutes for GitHub Pages to update
5. Clear browser cache and test

## Security Considerations

1. **Never commit sensitive data**:
   - Database files (already in `.gitignore`)
   - `.env` files with real API keys
   - User credentials

2. **HTTPS Only**: 
   - Backend must use HTTPS (Render provides this automatically)
   - Frontend on GitHub Pages is HTTPS by default

3. **Environment Variables**:
   - Use Render dashboard to set sensitive environment variables
   - Never hardcode credentials in source code

## Support and Resources

- [Render Documentation](https://render.com/docs)
- [GitHub Pages Documentation](https://docs.github.com/pages)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)

## Common Commands Reference

```bash
# Backend
cd project/backend
npm install          # Install dependencies
node server.js       # Start server locally

# Frontend
cd project/frontend
npm install          # Install dependencies
npm run dev          # Start development server
npm run build        # Build for production
npm run deploy       # Deploy to GitHub Pages
npm run preview      # Preview production build locally
```
