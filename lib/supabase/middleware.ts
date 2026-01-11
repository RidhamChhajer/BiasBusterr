import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Create a Supabase client for use in Middleware
 * This client refreshes the user's session before loading Server Components
 */
export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    // Demo mode: Skip Supabase if credentials not configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey || supabaseUrl === 'placeholder') {
        console.warn('[Demo Mode] Supabase not configured, skipping authentication')
        return supabaseResponse
    }

    const supabase = createServerClient(
        supabaseUrl,
        supabaseKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value)
                        supabaseResponse.cookies.set(name, value, options)
                    })
                },
            },
        }
    )

    // IMPORTANT: Avoid writing any logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Optional: Protect routes that require authentication
    // if (
    //   !user &&
    //   !request.nextUrl.pathname.startsWith('/login') &&
    //   !request.nextUrl.pathname.startsWith('/auth')
    // ) {
    //   // No user, redirect to login
    //   const url = request.nextUrl.clone()
    //   url.pathname = '/login'
    //   return NextResponse.redirect(url)
    // }

    // IMPORTANT: You *must* return the supabaseResponse object as it is.
    // If you're creating a new response object with NextResponse.next() make sure to:
    // 1. Pass the request in it, like so: NextResponse.next({ request })
    // 2. Copy over the cookies, like so: supabaseResponse.cookies.getAll().forEach(...)
    // 3. Change the supabaseResponse object to your new response object and return it

    return supabaseResponse
}
