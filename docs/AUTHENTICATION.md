# Supabase Authentication Setup - Bias Buster v1

## Overview

This document explains the Supabase authentication implementation for Bias Buster v1.

## Files Created

### Configuration Files

| File | Purpose |
|------|---------|
| `env.template` | Environment variable template |
| `lib/supabase/client.ts` | Browser client (Client Components) |
| `lib/supabase/server.ts` | Server client (Server Components) |
| `lib/supabase/middleware.ts` | Middleware client (session refresh) |

### Auth Utilities

| File | Purpose |
|------|---------|
| `lib/auth/auth.ts` | Auth helper functions |
| `lib/types/auth.ts` | TypeScript type definitions |
| `middleware.ts` | Next.js middleware configuration |

## Setup Instructions

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in project details:
   - Name: `bias-buster`
   - Database Password: (save this securely)
   - Region: (choose closest to your users)
4. Wait for project to be created (~2 minutes)

### 2. Get API Credentials

1. Go to **Project Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

### 3. Configure Environment Variables

1. Copy `env.template` to `.env.local`:
   ```bash
   cp env.template .env.local
   ```

2. Edit `.env.local` and add your credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. **IMPORTANT**: Never commit `.env.local` to git (it's already in `.gitignore`)

### 4. Run Database Schema

1. Go to Supabase Dashboard → **SQL Editor**
2. Copy the contents of `database/schema.sql`
3. Paste and click **Run**
4. Verify all tables were created successfully

### 5. Enable Email Auth (Optional)

By default, Supabase requires email confirmation. To disable for development:

1. Go to **Authentication** → **Providers** → **Email**
2. Disable "Confirm email"
3. Click "Save"

For production, keep email confirmation enabled.

### 6. Test Authentication

Restart your development server:
```bash
npm run dev
```

The authentication system is now ready to use.

## Authentication Functions

### Server-Side (Server Components & Server Actions)

```typescript
import { getCurrentUser, isAuthenticated, getCurrentUserId } from '@/lib/auth/auth'

// Get current user
const user = await getCurrentUser()
if (user) {
  console.log('User ID:', user.id)
  console.log('Email:', user.email)
}

// Check if authenticated
const authenticated = await isAuthenticated()

// Get user ID
const userId = await getCurrentUserId()
```

### Client-Side (Client Components)

```typescript
'use client'

import { signUp, signIn, signOut, getCurrentUserClient } from '@/lib/auth/auth'

// Sign up
const { user, error } = await signUp('user@example.com', 'password123')

// Sign in
const { user, error } = await signIn('user@example.com', 'password123')

// Sign out
const { success, error } = await signOut()

// Get current user
const user = await getCurrentUserClient()
```

### Auth State Listener

```typescript
'use client'

import { useEffect, useState } from 'react'
import { onAuthStateChange } from '@/lib/auth/auth'
import type { User } from '@supabase/supabase-js'

function MyComponent() {
  const [user, setUser] = useState<User | null>(null)
  
  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setUser(user)
    })
    
    return () => unsubscribe()
  }, [])
  
  return <div>{user ? `Logged in as ${user.email}` : 'Not logged in'}</div>
}
```

## Anonymous Users

**Important**: Anonymous users can browse the site but **cannot write to the database**.

All database operations are protected by Row-Level Security (RLS) policies that check:
```sql
auth.uid() = user_id
```

If `auth.uid()` is null (anonymous), all write operations will fail.

## Security Features

### ✅ Row-Level Security (RLS)
- All database tables have RLS enabled
- Users can only access their own data
- Anonymous users have read-only access (if any)

### ✅ Cookie-Based Sessions
- Sessions are stored in HTTP-only cookies
- Automatically refreshed by middleware
- Secure by default

### ✅ Environment Variables
- API keys stored in `.env.local`
- Never exposed to client (except anon key, which is safe)
- Service role key (if used) is server-side only

### ✅ Password Requirements
- Minimum 6 characters (Supabase default)
- Can be customized in Supabase Dashboard

## Client Types

### 1. Browser Client (`lib/supabase/client.ts`)
- **Use in**: Client Components
- **Purpose**: Client-side auth operations
- **Example**: Sign up, sign in, sign out

### 2. Server Client (`lib/supabase/server.ts`)
- **Use in**: Server Components, Server Actions
- **Purpose**: Server-side data fetching
- **Example**: Get current user, fetch user data

### 3. Middleware Client (`lib/supabase/middleware.ts`)
- **Use in**: `middleware.ts`
- **Purpose**: Session refresh
- **Example**: Automatic session management

## Middleware Configuration

The middleware runs on **all routes** except:
- Static files (`_next/static`)
- Image optimization (`_next/image`)
- Favicon
- Public assets (images, SVGs, etc.)

This ensures:
- Sessions are always fresh
- Auth state is consistent
- Cookies are properly managed

## Route Protection (Optional)

To protect specific routes, uncomment the code in `lib/supabase/middleware.ts`:

```typescript
if (
  !user &&
  !request.nextUrl.pathname.startsWith('/login') &&
  !request.nextUrl.pathname.startsWith('/auth')
) {
  const url = request.nextUrl.clone()
  url.pathname = '/login'
  return NextResponse.redirect(url)
}
```

This will redirect unauthenticated users to `/login`.

## Error Handling

All auth functions return error messages:

```typescript
const { user, error } = await signIn(email, password)

if (error) {
  // Use helper function for user-friendly messages
  const message = getAuthErrorMessage(error)
  console.error(message)
}
```

Common errors:
- `Invalid login credentials` → Invalid email or password
- `Email not confirmed` → Email needs verification
- `User already registered` → Account already exists

## Password Reset Flow

### 1. Request Reset
```typescript
const { success, error } = await resetPassword('user@example.com')
```

### 2. User Receives Email
Supabase sends an email with a reset link.

### 3. Update Password
```typescript
const { success, error } = await updatePassword('newpassword123')
```

## TypeScript Types

All auth types are defined in `lib/types/auth.ts`:

```typescript
import type { User, Session, AuthResult, AuthState } from '@/lib/types/auth'
```

## Testing Authentication

### Manual Testing

1. **Sign Up**:
   ```typescript
   await signUp('test@example.com', 'password123')
   ```

2. **Check Supabase Dashboard**:
   - Go to **Authentication** → **Users**
   - Verify user was created

3. **Sign In**:
   ```typescript
   await signIn('test@example.com', 'password123')
   ```

4. **Verify Session**:
   ```typescript
   const user = await getCurrentUser()
   console.log(user) // Should show user object
   ```

5. **Sign Out**:
   ```typescript
   await signOut()
   ```

### Automated Testing (Future)

Create tests for:
- Sign up with valid/invalid data
- Sign in with correct/incorrect credentials
- Session persistence
- Sign out functionality

## Common Issues

### Issue: "Invalid API key"
**Solution**: Check that environment variables are set correctly in `.env.local`

### Issue: "User already registered"
**Solution**: User exists. Use sign in instead, or delete user from Supabase Dashboard.

### Issue: "Email not confirmed"
**Solution**: Disable email confirmation in Supabase Dashboard for development.

### Issue: Session not persisting
**Solution**: Ensure middleware is running and cookies are enabled in browser.

## Next Steps

After authentication is set up:

1. **Create UI pages**:
   - `/app/login/page.tsx` - Login form
   - `/app/signup/page.tsx` - Sign up form
   - `/app/dashboard/page.tsx` - Protected dashboard

2. **Protect API routes**:
   ```typescript
   const user = await getCurrentUser()
   if (!user) {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
   }
   ```

3. **Add user profile**:
   - Extend `auth.users` with custom fields
   - Create user settings page

## Resources

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Next.js + Supabase Guide](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Row-Level Security](https://supabase.com/docs/guides/auth/row-level-security)

## Summary

✅ **Supabase client configured** for browser, server, and middleware  
✅ **Auth functions created** for sign up, sign in, sign out  
✅ **Middleware set up** for automatic session refresh  
✅ **Type definitions** for TypeScript support  
✅ **Anonymous users supported** (read-only, no DB writes)  
✅ **RLS enforced** at database level  
✅ **Environment variables** configured securely  

Authentication infrastructure is complete and ready for UI implementation.
