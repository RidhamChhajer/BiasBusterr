/**
 * Client-side authentication utilities
 * 
 * This file contains ONLY client-side auth functions to avoid
 * importing server-only modules (next/headers) in client components.
 */

import { createClient as createBrowserClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

/**
 * Sign up a new user with email and password
 */
export async function signUp(email: string, password: string) {
    const supabase = createBrowserClient()

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    })

    if (error) {
        return { user: null, error: error.message }
    }

    return { user: data.user, error: null }
}

/**
 * Sign in an existing user with email and password
 */
export async function signIn(email: string, password: string) {
    const supabase = createBrowserClient()

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        return { user: null, error: error.message }
    }

    return { user: data.user, error: null }
}

/**
 * Sign out the current user
 */
export async function signOut() {
    const supabase = createBrowserClient()

    const { error } = await supabase.auth.signOut()

    if (error) {
        return { success: false, error: error.message }
    }

    return { success: true, error: null }
}

/**
 * Get the currently authenticated user (client-side)
 */
export async function getCurrentUserClient(): Promise<User | null> {
    const supabase = createBrowserClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    return user
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (user: User | null) => void) {
    const supabase = createBrowserClient()

    const {
        data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
        callback(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
}
