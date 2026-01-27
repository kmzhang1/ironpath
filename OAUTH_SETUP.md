# Google OAuth Setup - Critical Implementation Guide

## Overview
This document describes the reliable OAuth implementation for the IronPath application.

## Architecture

### How It Works (Event-Based, No Timeouts)

1. **User clicks "Continue with Google"** → `loginWithGoogle()` is called
2. **Supabase redirects to Google OAuth** → User authenticates with Google
3. **Google redirects back** → User returns to `http://localhost:5173/` (or your domain)
4. **Supabase detects callback** → `detectSessionInUrl: true` processes the OAuth response
5. **Auth state change fires** → `onAuthStateChange` listener in App.tsx receives 'SIGNED_IN' event
6. **User data is extracted** → Session user data is mapped to app User type
7. **Backend sync** → User profile is synced with backend database
8. **Programs loaded** → User's programs are fetched from backend
9. **Navigation** → User is redirected to /dashboard or /wizard

### Key Files

- **frontend/src/App.tsx** - Contains `onAuthStateChange` listener (primary OAuth handler)
- **frontend/src/lib/supabase.ts** - Supabase client configuration
- **frontend/src/services/api.ts** - API functions including `loginWithGoogle()`
- **frontend/src/pages/Login.tsx** - Login UI with Google button

## Critical Configuration

### 1. Supabase Client Settings

```typescript
// frontend/src/lib/supabase.ts
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,        // ✅ Persist across page reloads
    autoRefreshToken: true,      // ✅ Auto refresh before expiry
    detectSessionInUrl: true,    // ✅ CRITICAL: Detect OAuth callback
    flowType: 'pkce',           // ✅ Use PKCE flow (secure, recommended)
    storage: window.localStorage,
    storageKey: 'ironpath-auth',
  },
});
```

### 2. Supabase Dashboard Configuration

**IMPORTANT**: You must configure these settings in your Supabase dashboard:

1. Go to: https://supabase.com/dashboard/project/xkoknpqgymqwcoakkdcl/auth/url-configuration

2. **Site URL**: Set to your frontend URL
   - Development: `http://localhost:5173`
   - Production: `https://yourdomain.com`

3. **Redirect URLs**: Add these URLs (one per line):
   ```
   http://localhost:5173/**
   http://localhost:5173/
   ```
   For production, also add:
   ```
   https://yourdomain.com/**
   https://yourdomain.com/
   ```

4. **Google OAuth Provider**: Ensure Google provider is enabled
   - Go to Authentication → Providers → Google
   - Ensure "Enabled" is checked
   - Verify Client ID and Client Secret are set

### 3. Environment Variables

Verify these are set in `frontend/.env`:

```bash
VITE_SUPABASE_URL=https://xkoknpqgymqwcoakkdcl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_URL=http://localhost:8001
```

## Testing Checklist

### Before Testing
- [ ] Backend is running on port 8001
- [ ] Frontend dev server is running (usually port 5173)
- [ ] Supabase redirect URLs are configured (see above)
- [ ] Browser console is open (F12) to view logs

### Test Steps

1. **Navigate to login page**
   ```
   http://localhost:5173/
   ```

2. **Open browser console** (F12)

3. **Click "Continue with Google"**
   - Should see: `🔐 Initiating Google OAuth login...`
   - Should see: `✅ OAuth flow initiated, waiting for redirect...`

4. **Complete Google authentication**
   - Google will show account selection
   - Select account and grant permissions

5. **Redirected back to app**
   - URL should be: `http://localhost:5173/` (with possible hash/query params)
   - Console should show:
     ```
     🔧 Setting up Supabase auth listener...
     ✅ Found existing session for: your@email.com
     👤 Setting user: your@email.com
     🔄 Syncing user profile with backend...
     📚 Loading user programs...
     ✅ Found X program(s)
     🚀 Navigating to /dashboard (or /wizard)
     ```

6. **Verify navigation**
   - Should be redirected to `/dashboard` (if you have programs)
   - OR `/wizard` (if you're a new user)

### Expected Console Output (Success)

```
🔐 Initiating Google OAuth login...
✅ OAuth flow initiated, waiting for redirect...
[Google OAuth flow...]
🔧 Setting up Supabase auth listener...
✅ Found existing session for: user@example.com
🔔 Auth state changed: SIGNED_IN user@example.com
👤 Setting user: user@example.com
🔄 Syncing user profile with backend...
✅ User profile synced with backend
📚 Loading user programs...
✅ Found 2 program(s)
🚀 Navigating to /dashboard
```

## Troubleshooting

### Issue: "No OAuth callback detected"
**Cause**: Redirect URL not configured in Supabase dashboard
**Fix**: Add `http://localhost:5173/**` to Redirect URLs in Supabase dashboard

### Issue: "Session retrieval error"
**Cause**: Token expired or invalid Supabase keys
**Fix**: Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file

### Issue: Returns to login page after OAuth
**Cause**: onAuthStateChange not firing or session not persisting
**Fix**:
1. Check that `detectSessionInUrl: true` in supabase.ts
2. Clear browser localStorage and cookies
3. Restart frontend dev server

### Issue: Backend sync fails
**Cause**: Backend not running or wrong URL
**Fix**:
1. Verify backend is running: `ps aux | grep uvicorn`
2. Check VITE_API_URL in .env matches backend port
3. Check backend logs for errors

### Issue: "User profile not found" after OAuth
**Cause**: Backend database not initialized
**Fix**: Ensure PostgreSQL is running and tables are created

## Production Deployment

### Frontend
1. Update Supabase redirect URLs to include production domain
2. Set production environment variables
3. Deploy frontend

### Backend
1. Ensure database is accessible from production
2. Update CORS_ORIGINS to include production frontend URL
3. Deploy backend

### Supabase
1. Add production URLs to Redirect URLs
2. Update Site URL to production domain
3. Verify Google OAuth credentials are production-ready

## Security Notes

- **PKCE Flow**: Using PKCE (Proof Key for Code Exchange) for enhanced security
- **Token Refresh**: Tokens are automatically refreshed before expiry
- **Session Persistence**: Sessions persist across page reloads via localStorage
- **Backend Sync**: User profiles are synced with backend database on login
- **HTTPS Required**: Production must use HTTPS for OAuth to work

## Support

If OAuth is still not working after following this guide:

1. Share the browser console logs (all messages starting with 🔧, 🔔, ✅, ❌, ⚠️)
2. Share the URL you're redirected to after Google OAuth
3. Verify Supabase dashboard settings match this guide
4. Check backend logs for any errors during user sync

---

**Last Updated**: 2026-01-26
**Implementation**: Event-based with Supabase onAuthStateChange
**Status**: Production-ready, no timeouts or race conditions
