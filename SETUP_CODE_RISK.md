# Quick Setup Guide - Code Risk Feature

## Prerequisites

Before starting, ensure you have:
- ✅ Node.js (v18+)
- ✅ PostgreSQL running locally (or via Docker)
- ✅ Gemini API Key from Google AI Studio

## Step 1: Get Gemini API Key

1. Visit https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key (starts with `AIzaSy...`)

## Step 2: Configure Backend

1. Navigate to backend directory:
   ```bash
   cd packages/backend
   ```

2. Update `.env` file with your Gemini API key:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   ```
   Replace the placeholder `AIzaSyBbV********pndLw7t8l0` with your real key.

3. Install dependencies:
   ```bash
   npm install
   ```

4. Initialize database (if not already done):
   ```bash
   docker-compose up -d
   ```
   
   This will create the new tables:
   - `error_sessions`
   - `gemini_risk_results`

## Step 3: Start Backend

```bash
npm run dev
```

The backend should start on `http://localhost:4000`

## Step 4: Start Dashboard

1. In a new terminal, navigate to dashboard:
   ```bash
   cd packages/dashboard
   ```

2. Install dependencies (if needed):
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The dashboard should open at `http://localhost:5173`

## Step 5: Launch Extension

1. Open VS Code
2. Navigate to the extension directory:
   ```bash
   cd packages/extension
   ```

3. Install dependencies (if needed):
   ```bash
   npm install
   ```

4. Compile the extension:
   ```bash
   npm run compile
   ```

5. Press `F5` to launch the extension in a new VS Code window

## Step 6: Test the Feature

1. **Authenticate:**
   - In the dashboard, click "Sign in with GitHub"
   - Complete OAuth flow

2. **Create Some Errors:**
   - In the Extension Development Host window, open or create a TypeScript/JavaScript file
   - Write some code with intentional errors:
     ```typescript
     // Example: TypeScript with errors
     function test() {
       const x: number = "hello"; // Type error
       return y; // Undefined variable
     }
     ```

3. **Watch the Magic:**
   - Errors appear in VS Code Problems panel
   - Error session starts (check extension logs)
   - Wait 1 minute without adding new errors
   - Session ends, data sent to Gemini
   - Check the dashboard's "Code Risk" tab
   - You should see a color-coded risk card with AI guidance!

## Troubleshooting

### No risks showing up?

**Check backend logs:**
```bash
# In backend terminal
# Look for:
# - "Error creating error session" 
# - "Error calling Gemini API"
```

**Check extension logs:**
1. In Extension Development Host window
2. View → Output
3. Select "Extension Host" from dropdown
4. Look for `[ErrorSessionTracker]` messages

**Check dashboard network tab:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Look for failed requests to `/api/code-risk/`

### Gemini API errors?

**Error: Invalid API Key**
- Verify your API key in `packages/backend/.env`
- Make sure there are no extra spaces
- Restart the backend server

**Error: Quota exceeded**
- Check your usage at https://console.cloud.google.com/
- Free tier has limits
- Wait or upgrade your account

### Sessions not ending?

**Verify timer logic:**
- Sessions end after exactly 1 minute of NO new errors
- Adding a new error resets the timer
- Check extension output logs

### Database connection issues?

**Verify PostgreSQL is running:**
```bash
docker ps
# Should show postgres container running
```

**Check connection settings:**
- Review `packages/backend/.env`
- Ensure port 5432 is not in use by another service

## Viewing the Results

Once everything is working:

1. Navigate to dashboard → **Code Risk** tab
2. You'll see active risk assessments
3. Each card shows:
   - 🟢 Green (Low Risk)
   - 🟡 Yellow (Medium Risk)
   - 🔴 Red (High Risk)
   - Error count, LOC, recent edits
   - AI-generated explanation
   - Step-by-step fix guidance

4. Risks auto-update every 30 seconds
5. When you fix the errors, the card disappears

## Next Steps

- Review [CODE_RISK_FEATURE.md](./CODE_RISK_FEATURE.md) for detailed documentation
- Customize Gemini prompts in `packages/backend/src/features/Code-Risk/gemini/gemini.service.ts`
- Adjust session timeout in `packages/extension/src/tracking/ErrorSessionTracker.ts` (default: 60 seconds)
- Configure auto-refresh interval in `packages/dashboard/src/hooks/useCodeRisk.ts` (default: 30 seconds)

## Support

If you encounter issues:
1. Check all logs (backend, extension, browser console)
2. Verify all services are running
3. Ensure authentication is working
4. Review the troubleshooting section above

Happy coding! 🚀
