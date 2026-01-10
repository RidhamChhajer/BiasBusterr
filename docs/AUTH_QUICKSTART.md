# Authentication Setup - Quick Reference

## Environment Variables Required

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Get these values from: **Supabase Dashboard → Project Settings → API**

## Files Created

```
lib/
├── supabase/
│   ├── client.ts          # Browser client
│   ├── server.ts          # Server client
│   └── middleware.ts      # Middleware client
├── auth/
│   └── auth.ts            # Auth helper functions
└── types/
    └── auth.ts            # TypeScript types

middleware.ts              # Next.js middleware
env.template              # Environment variable template
```

## Usage Examples

### Server Components

```typescript
import { getCurrentUser } from '@/lib/auth/auth'

export default async function Page() {
  const user = await getCurrentUser()
  
  return <div>{user ? `Hello ${user.email}` : 'Not logged in'}</div>
}
```

### Client Components

```typescript
'use client'

import { signIn, signOut } from '@/lib/auth/auth'

export default function LoginButton() {
  const handleLogin = async () => {
    const { user, error } = await signIn('user@example.com', 'password')
    if (error) console.error(error)
  }
  
  return <button onClick={handleLogin}>Login</button>
}
```

### API Routes

```typescript
import { getCurrentUser } from '@/lib/auth/auth'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const user = await getCurrentUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // User is authenticated, proceed with operation
  return NextResponse.json({ success: true })
}
```

## Available Functions

### Server-Side
- `getCurrentUser()` - Get current user
- `isAuthenticated()` - Check if user is logged in
- `getCurrentUserId()` - Get user ID
- `getSession()` - Get current session

### Client-Side
- `signUp(email, password)` - Create new account
- `signIn(email, password)` - Log in
- `signOut()` - Log out
- `getCurrentUserClient()` - Get current user
- `onAuthStateChange(callback)` - Listen to auth changes
- `resetPassword(email)` - Request password reset
- `updatePassword(newPassword)` - Update password

### Helpers
- `isValidEmail(email)` - Validate email format
- `isValidPassword(password)` - Validate password (min 6 chars)
- `getAuthErrorMessage(error)` - Get user-friendly error message

## Setup Steps

1. **Create Supabase project** at supabase.com
2. **Copy API credentials** from Project Settings → API
3. **Create `.env.local`** with credentials
4. **Run database schema** in Supabase SQL Editor
5. **Restart dev server**: `npm run dev`

## Security Notes

✅ Anonymous users can browse but **cannot write to database**  
✅ All database operations protected by **Row-Level Security (RLS)**  
✅ Sessions managed via **HTTP-only cookies**  
✅ Middleware **automatically refreshes sessions**  
✅ Environment variables **never exposed to client** (except anon key)  

## Next Steps

- Create login/signup UI pages
- Protect routes that require authentication
- Add user profile management
- Implement password reset flow

See `docs/AUTHENTICATION.md` for detailed documentation.
