import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * Middleware for Bias Buster v1
 * 
 * This middleware:
 * 1. Refreshes the user's Supabase session on every request
 * 2. Ensures auth cookies are properly managed
 * 3. Can be extended to protect specific routes
 * 
 * IMPORTANT: Anonymous users can browse the site but cannot write to the database.
 * Database writes are protected by Row-Level Security (RLS) policies.
 */

export async function middleware(request: NextRequest) {
    // Update the Supabase session
    return await updateSession(request)
}

/**
 * Configure which routes the middleware should run on
 * 
 * Current configuration:
 * - Runs on all routes except static files and Next.js internals
 * - This ensures session is always fresh
 */
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder files
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
