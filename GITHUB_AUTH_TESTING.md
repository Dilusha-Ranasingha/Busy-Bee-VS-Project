# GitHub Authentication Testing Guide

## Overview
The Busy Bee extension now requires GitHub authentication to track file switching metrics. All data is associated with the authenticated GitHub user.

## System Architecture

### 1. Extension (VS Code)
- **AuthManager** (`extension/src/auth/AuthManager.ts`): Manages GitHub OAuth using VS Code's built-in authentication provider
- **FileSwitchTracker** (`extension/src/tracking/FileSwitchTracker.ts`): Tracks file activations, requires authenticated user
- **Extension Commands**:
  - `Busy Bee: Sign in with GitHub` - Initiates OAuth flow
  - `Busy Bee: Sign out` - Clears authentication
  - `Busy Bee: Show File Switch Stats` - Shows current session stats

### 2. Backend (Node.js/Express/PostgreSQL)
- **Database Schema**: `file_switch_windows` table with `user_id` column
- **API Endpoints**:
  - `POST /api/file-switch/windows` - Create session (requires userId in payload)
  - `GET /api/file-switch/sessions?date=YYYY-MM-DD&userId=xxx` - List sessions by date and user
  - `GET /api/file-switch/windows?sessionId=xxx&userId=xxx` - Get session details

### 3. Dashboard (React)
- Currently displays all sessions
- Will be updated to filter by authenticated user

## Testing Steps

### Step 1: Start the Extension
```bash
# In VS Code, press F5 to start the Extension Development Host
# Or run:
code --extensionDevelopmentPath=/Users/dilusharanasingha/Documents/development/Research/busy-bee/packages/extension
```

### Step 2: Sign In with GitHub

1. **Open Command Palette** (Cmd+Shift+P)
2. **Type**: `Busy Bee: Sign in with GitHub`
3. **Select the command** - VS Code will open GitHub OAuth popup
4. **Authorize the application** in the browser
5. **Check Debug Console** for:
   ```
   [AuthManager] User signed in: {username}
   [AuthManager] Auth state changed: signed in
   [FileSwitchTracker] Tracker started after sign-in
   ```

### Step 3: Verify Tracking

1. **Switch between files** in the Extension Development Host
2. **Check Debug Console** for activation logs:
   ```
   [FileSwitchTracker] File activated: file:///... (count: 1, session: session-xxx)
   [FileSwitchTracker] File activated: file:///... (count: 2, session: session-xxx)
   ```

3. **Wait 10 minutes of inactivity** OR manually trigger session end
4. **Check for successful upload**:
   ```
   [FileSwitchTracker] Flushing session data: {userId: "12345", sessionId: "session-xxx", ...}
   [FileSwitchTracker] Successfully saved session: {id: "uuid", ...}
   ```

5. **Verify notification** appears: "Session ended: X file switches in Y min (rate: Z/min)"

### Step 4: Verify Database

```bash
# Connect to PostgreSQL
docker exec -it productivity-postgres-busy-bee psql -U postgres -d productivity_db

# Check data
SELECT id, user_id, session_id, activation_count, rate_per_min, window_start, window_end 
FROM file_switch_windows 
ORDER BY created_at DESC 
LIMIT 5;

# Verify user_id matches GitHub user ID
# Get your GitHub user ID from: https://api.github.com/users/{your-username}
```

### Step 5: Test Sign Out

1. **Open Command Palette** (Cmd+Shift+P)
2. **Type**: `Busy Bee: Sign out`
3. **Check Debug Console**:
   ```
   [AuthManager] User signed out
   [AuthManager] Auth state changed: signed out
   [FileSwitchTracker] Tracker stopped after sign-out
   ```

4. **Try switching files** - should show warning:
   ```
   [FileSwitchTracker] User not signed in, skipping data upload
   Warning notification: "Sign in with GitHub to track file switching metrics"
   ```

### Step 6: Test Session Restoration

1. **Close the Extension Development Host**
2. **Press F5 again** to restart
3. **Check Debug Console**:
   ```
   [AuthManager] Restored session for user: {username}
   [FileSwitchTracker] Tracker started (user already signed in)
   ```

4. **Verify tracking works** without re-authentication

## Expected Behavior

### When Signed In ✅
- File activations are tracked
- Sessions are created on first file switch
- Sessions end after 10 minutes of inactivity
- Data is uploaded to backend with userId
- User sees success notifications

### When Signed Out ❌
- File activations are NOT tracked
- No data is sent to backend
- Warning message shown if user switches files
- Stats command shows "Sign in with GitHub to view stats"

## API Testing with cURL

```bash
# Test creating a session (requires userId)
curl -X POST http://localhost:4000/api/file-switch/windows \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "12345",
    "sessionId": "test-session-1",
    "windowStart": "2025-01-02T10:00:00.000Z",
    "windowEnd": "2025-01-02T10:15:00.000Z",
    "activationCount": 42,
    "ratePerMin": 2.8,
    "workspaceTag": "workspace-busy-bee"
  }'

# Get sessions for a specific date and user
curl "http://localhost:4000/api/file-switch/sessions?date=2025-01-02&userId=12345"

# Get windows for a specific session
curl "http://localhost:4000/api/file-switch/windows?sessionId=test-session-1&userId=12345"
```

## Troubleshooting

### Issue: "Sign in with GitHub" command not found
**Solution**: Rebuild the extension
```bash
cd packages/extension
npm run compile
# Then press F5 again
```

### Issue: GitHub OAuth popup doesn't appear
**Solution**: Check VS Code authentication settings
1. Open Settings (Cmd+,)
2. Search for "authentication"
3. Ensure "GitHub Authentication" is enabled

### Issue: Data not appearing in database
**Solution**: Check the following:
1. Backend is running: `http://localhost:4000/health`
2. Database is running: `docker ps | grep postgres`
3. User is signed in: Check Debug Console for auth logs
4. Network errors: Check Debug Console for axios errors

### Issue: "userId is required" error
**Solution**: 
1. Verify you're signed in
2. Check `authManager.getUserId()` returns a value
3. Ensure FileSwitchTracker received authManager in constructor

## GitHub User ID Lookup

To find your GitHub user ID:
```bash
# Replace {username} with your GitHub username
curl https://api.github.com/users/{username}

# Returns: {"id": 12345, "login": "username", ...}
```

Or use the AuthManager in debug console:
```typescript
// In Extension Development Host debug console
authManager.getUser()
// Returns: {id: "12345", username: "...", email: "...", avatarUrl: "..."}
```

## Next Steps

1. **Update Dashboard**: Add GitHub sign-in and filter sessions by userId
2. **Add User Profile**: Display current user in extension sidebar
3. **Metrics Visualization**: Show user-specific analytics
4. **Export Data**: Allow users to download their tracking data

## Files Modified

### Extension
- ✅ `extension/src/auth/AuthManager.ts` - GitHub OAuth manager
- ✅ `extension/src/tracking/FileSwitchTracker.ts` - Auth-aware tracking
- ✅ `extension/src/extension.ts` - Auth integration
- ✅ `extension/package.json` - Added sign-in/sign-out commands

### Backend
- ✅ `backend/init.sql` - Added user_id column and index
- ✅ `backend/.../fileSwitch.types.ts` - Added userId to types
- ✅ `backend/.../fileSwitch.service.ts` - userId validation and filtering
- ✅ `backend/.../fileSwitch.controller.ts` - Optional userId query param

### Database
- ✅ Rebuilt with user_id column
- ✅ Index on (user_id, created_at DESC) for performance

## Security Notes

- **No OAuth App Registration Required**: Uses VS Code's built-in GitHub provider
- **No Client Secrets**: Authentication handled entirely by VS Code
- **Session Persistence**: GitHub session stored in VS Code's globalState (encrypted)
- **Token Scope**: Requests minimal scope: `user:email` (read-only)
- **User Privacy**: Each user can only see their own data (when dashboard filtering is implemented)
