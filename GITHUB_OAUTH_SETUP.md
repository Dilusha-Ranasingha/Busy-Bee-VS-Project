# GitHub OAuth Setup Guide

This guide walks you through setting up GitHub OAuth for both the **VS Code Extension** and the **Dashboard**.

## Overview

The Busy Bee system uses GitHub authentication in two different ways:

### 1. **VS Code Extension** (Built-in Auth)
- Uses VS Code's built-in GitHub authentication provider
- **No OAuth app registration required**
- Automatically handles OAuth flow
- Token managed by VS Code

### 2. **Dashboard** (Manual OAuth App)
- Requires creating a GitHub OAuth App
- Uses traditional OAuth 2.0 flow
- Token stored in browser localStorage
- Backend proxies token exchange to keep secrets secure

---

## Part 1: VS Code Extension (Already Working ✅)

The extension uses VS Code's built-in authentication - **no setup needed!**

Just run these commands in VS Code:
1. Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
2. Type: `Busy Bee: Sign in with GitHub`
3. Authorize in the browser popup
4. Done! ✅

---

## Part 2: Dashboard OAuth Setup

### Step 1: Create a GitHub OAuth App

1. **Go to GitHub Settings**
   - Navigate to: https://github.com/settings/developers
   - Click "OAuth Apps" in the left sidebar
   - Click "New OAuth App"

2. **Fill in the application details:**
   ```
   Application name: Busy Bee Dashboard (Development)
   Homepage URL: http://localhost:5173
   Authorization callback URL: http://localhost:5173/auth/callback
   ```

3. **Register the application**
   - Click "Register application"
   - You'll be redirected to your new app's page

4. **Get your credentials:**
   - **Client ID**: Copy this value (looks like: `Ov23liABjmFCB9YjjfRA`)
   - **Client Secret**: Click "Generate a new client secret" and copy it
   - ⚠️ **Important**: Save the client secret immediately - you won't be able to see it again!

### Step 2: Configure the Backend

1. **Update `.env` file in `packages/backend/`:**
   ```bash
   cd packages/backend
   ```

2. **Add your GitHub OAuth credentials:**
   ```env
   # GitHub OAuth Configuration
   GITHUB_CLIENT_ID=Ov23liABjmFCB9YjjfRA  # Replace with your Client ID
   GITHUB_CLIENT_SECRET=your_secret_here   # Replace with your Client Secret
   ```

3. **Restart the backend:**
   ```bash
   # Stop the current server (Ctrl+C)
   npm run dev
   ```

### Step 3: Configure the Dashboard

1. **Create `.env` file in `packages/dashboard/`:**
   ```bash
   cd packages/dashboard
   cp .env.example .env
   ```

2. **Update the `.env` file:**
   ```env
   VITE_GITHUB_CLIENT_ID=Ov23liABjmFCB9YjjfRA  # Same Client ID as backend
   VITE_GITHUB_REDIRECT_URI=http://localhost:5173/auth/callback
   ```

3. **Restart the dashboard:**
   ```bash
   # Stop the current server (Ctrl+C)
   npm run dev
   ```

---

## Testing the Dashboard Authentication

### 1. Open the Dashboard
```bash
# Navigate to:
http://localhost:5173
```

### 2. Sign In
- You'll see a **"Sign in with GitHub"** button in the top-right header
- Click the button
- You'll be redirected to GitHub's authorization page
- Click **"Authorize"**
- You'll be redirected back to the dashboard

### 3. Verify Authentication
- Your GitHub avatar and username should appear in the header
- The File Switch page should now load your session data
- Click **"Sign Out"** to test logout

### 4. Check File Switch Tracking
- Go to the "File Switch" tab
- Select today's date
- You should see sessions from your authenticated user only

---

## Production Deployment

When deploying to production, you'll need to:

### 1. Create a Production OAuth App
- Use the same steps as above, but with your production URLs:
  ```
  Homepage URL: https://yourdomain.com
  Authorization callback URL: https://yourdomain.com/auth/callback
  ```

### 2. Update Environment Variables
- **Backend**: Update `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`
- **Dashboard**: Update `VITE_GITHUB_CLIENT_ID` and `VITE_GITHUB_REDIRECT_URI`

### 3. Secure Your Secrets
- Never commit `.env` files to git
- Use environment variable management (Vercel, Heroku, etc.)
- Rotate secrets regularly

---

## Troubleshooting

### Issue: "OAuth not configured" error
**Solution**: 
1. Check that `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are set in `backend/.env`
2. Restart the backend server
3. Check backend logs for errors

### Issue: "Failed to exchange code for token"
**Solution**:
1. Verify the Client Secret is correct (regenerate if needed)
2. Check that the redirect URI matches exactly: `http://localhost:5173/auth/callback`
3. Ensure backend is running on `http://localhost:4000`

### Issue: Redirect loop or "Invalid OAuth state"
**Solution**:
1. Clear browser localStorage: Open DevTools → Application → Local Storage → Clear all
2. Try signing in again
3. Check browser console for errors

### Issue: CORS errors
**Solution**:
1. Verify backend CORS is enabled (it should be by default)
2. Check that backend is running on `http://localhost:4000`
3. Dashboard should be on `http://localhost:5173`

---

## Security Best Practices

1. **Never commit secrets to git**
   - Add `.env` to `.gitignore`
   - Use `.env.example` for templates

2. **Use different OAuth apps for dev/prod**
   - Development: `http://localhost:5173/auth/callback`
   - Production: `https://yourdomain.com/auth/callback`

3. **Rotate secrets regularly**
   - Generate new Client Secrets every 90 days
   - Update environment variables

4. **Limit OAuth scopes**
   - Current scopes: `user:email`, `read:user`
   - Only request what you need

---

## Architecture Overview

```
User → Dashboard → GitHub OAuth Popup
                    ↓
                Authorize & Redirect
                    ↓
Dashboard (with code) → POST /api/auth/github/token → Backend
                                                         ↓
                                        Exchange code for token
                                                         ↓
Backend → Returns access_token → Dashboard
                                    ↓
Dashboard → Fetch user info from GitHub API
            ↓
Store token + user in localStorage
            ↓
Make authenticated API calls to backend (with userId)
```

---

## API Endpoints

### Backend OAuth Endpoint
```
POST /api/auth/github/token
Body: { code: string, redirect_uri: string }
Response: { access_token: string }
```

### File Switch Endpoints (with userId)
```
GET /api/file-switch/sessions?date=YYYY-MM-DD&userId=12345
GET /api/file-switch/windows?sessionId=xxx&userId=12345
POST /api/file-switch/windows
Body: { userId, sessionId, windowStart, windowEnd, activationCount, ratePerMin }
```

---

## Next Steps

1. ✅ Set up GitHub OAuth App
2. ✅ Configure backend `.env`
3. ✅ Configure dashboard `.env`
4. ✅ Test sign-in flow
5. ✅ Verify session filtering by userId
6. 🔄 Deploy to production (optional)

---

## Questions?

- Check the backend logs: `packages/backend/` terminal
- Check browser console: DevTools → Console
- Check network requests: DevTools → Network tab
- Review this guide: `GITHUB_OAUTH_SETUP.md`
