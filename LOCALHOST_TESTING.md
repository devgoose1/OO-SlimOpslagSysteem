# Localhost Testing Guide

## Overview

You can now test your application locally while keeping your GitHub Pages and Render deployments active! This guide explains how to run everything on `localhost` for development.

## Quick Start

### 1. Start Backend Server

```bash
cd project/backend
node server.js
```

Expected output:
```
Server draait op poort 3000
```

The backend will be available at: `http://localhost:3000`

### 2. Start Frontend Dev Server (in another terminal)

```bash
cd project/frontend
npm run dev
```

Expected output:
```
  VITE v7.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/OO-SlimOpslagSysteem/
  ➜  press h to show help
```

The frontend will be available at: `http://localhost:5173/OO-SlimOpslagSysteem/`

### 3. Test in Browser

Open: `http://localhost:5173/OO-SlimOpslagSysteem/`

Your app will automatically connect to `http://localhost:3000` for all API calls.

## Configuration Files

### `.env.development` (Automatic)
- **File**: `project/frontend/.env.development`
- **Content**: `VITE_API_URL=http://localhost:3000`
- **Used by**: `npm run dev` (development server)
- **Status**: ✅ Already configured

### `.env.production` (Deployed)
- **File**: `project/frontend/.env.production`
- **Content**: `VITE_API_URL=https://oo-slimopslagsysteem.onrender.com`
- **Used by**: `npm run build` (production build)
- **Status**: ✅ Already configured

### `.env.local` (Personal Overrides)
- **File**: `project/frontend/.env.local`
- **Used by**: All environments (highest priority)
- **Options**: 
  - `VITE_API_URL=http://localhost:3000` (this machine)
  - `VITE_API_URL=http://192.168.68.122:3000` (network IP for phone testing)

## What's Already Working

✅ **API Routing** - All endpoints automatically use the correct API URL based on environment
✅ **CORS** - Backend allows `http://localhost:5173` requests
✅ **Chat API** - ChatBot uses dynamic `apiBase` URL
✅ **Analytics** - Queries go to your configured API URL
✅ **All CRUD Operations** - Create, read, update, delete all work locally

## Testing Checklist

- [ ] Backend starts without errors
- [ ] Frontend dev server starts on port 5173
- [ ] Can access app at `http://localhost:5173/OO-SlimOpslagSysteem/`
- [ ] Login works with test user
- [ ] Can create and view items
- [ ] Chatbot responds correctly
- [ ] Analytics dashboard loads
- [ ] Network tab shows requests to `http://localhost:3000`

## Network Testing (Phone/Other Devices)

To test on your phone connected to the same network:

### 1. Find Your Machine's IP

**Windows PowerShell:**
```powershell
ipconfig | findstr "IPv4"
```

Look for something like: `192.168.x.x`

### 2. Update `.env.local`

```
VITE_API_URL=http://YOUR_IP:3000
```

Example: `VITE_API_URL=http://192.168.68.122:3000`

### 3. Update Backend CORS (if needed)

Add your machine's IP to CORS origins in [project/backend/server.js](../project/backend/server.js#L48):

```javascript
app.use(cors({
    origin: [
        'https://devgoose1.github.io',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://YOUR_IP:5173',  // Add this line
        'http://192.168.68.122:5173'
    ],
    credentials: true
}));
```

### 4. Access from Phone

On your phone, visit: `http://YOUR_IP:5173/OO-SlimOpslagSysteem/`

## Command Reference

| Task | Command | Port | URL |
|------|---------|------|-----|
| Start Backend | `cd project/backend && node server.js` | 3000 | `http://localhost:3000` |
| Start Frontend Dev | `cd project/frontend && npm run dev` | 5173 | `http://localhost:5173/OO-SlimOpslagSysteem/` |
| Build for Production | `cd project/frontend && npm run build` | - | Builds to `dist/` |
| Deploy to GitHub Pages | `cd project/frontend && npm run deploy` | - | GitHub Pages |
| Preview Production Build | `cd project/frontend && npm run preview` | 4173 | `http://localhost:4173/OO-SlimOpslagSysteem/` |

## Environment-Based API Resolution

The frontend automatically determines which API to use:

1. **`npm run dev`** → Uses `.env.development` → `http://localhost:3000`
2. **`npm run build`** → Uses `.env.production` → `https://oo-slimopslagsysteem.onrender.com`
3. **`.env.local`** → Overrides all environments (for personal testing)
4. **Fallback** → If no env file, uses current hostname + port 3000

Code in [App.jsx](../project/frontend/src/App.jsx#L136):
```javascript
const envApiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const inferredApiBase = `${window.location.protocol}//${window.location.hostname}:3000`
const API_BASE_URL = envApiBase || inferredApiBase
```

## Troubleshooting

### "Cannot GET /OO-SlimOpslagSysteem/"

This is expected with GitHub Pages. The frontend handles routing internally. Use the app navigation instead of direct URLs.

### "API calls fail with CORS error"

1. Make sure backend is running on port 3000
2. Check that `http://localhost:5173` is in CORS origins (it is ✅)
3. Verify `.env.development` hasn't been modified

### "404 on /api/endpoints"

1. Backend not running - start with `node server.js`
2. Check API URL in `.env` files - should point to correct port
3. Verify endpoint exists in [project/backend/server.js](../project/backend/server.js)

### Frontend shows "Server offline" message

This means it can't reach the backend API. Check:
1. Is backend running? `http://localhost:3000/status` in browser
2. Is `VITE_API_URL` correctly set in `.env`?
3. Is the backend on the correct port?

## Three-Tier Deployment Strategy

You now have three ways to run the app:

| Environment | Frontend | Backend | Use Case |
|-------------|----------|---------|----------|
| **Local Dev** | `npm run dev` (5173) | `node server.js` (3000) | Development & testing |
| **Staging** | `npm run preview` (4173) | `node server.js` (3000) | Test production build locally |
| **Production** | GitHub Pages | Render | Live application |

## Next Steps

- Modify your app locally and see changes instantly
- Test features without waiting for deployment
- Debug issues using browser DevTools
- Keep your GitHub Pages and Render deployments running in parallel

Happy coding! 🚀
