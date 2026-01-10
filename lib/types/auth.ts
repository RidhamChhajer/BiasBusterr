/**
 * TypeScript type definitions for authentication
 */

import type { User, Session } from '@supabase/supabase-js'

/**
 * Auth result for sign up and sign in operations
 */
export interface AuthResult {
    user: User | null
    error: string | null
}

/**
 * Generic operation result
 */
export interface OperationResult {
    success: boolean
    error: string | null
}

/**
 * User profile data (can be extended later)
 */
export interface UserProfile {
    id: string
    email: string
    created_at: string
}

/**
 * Auth state for client components
 */
export interface AuthState {
    user: User | null
    session: Session | null
    isLoading: boolean
    isAuthenticated: boolean
}

/**
 * Re-export Supabase types for convenience
 */
export type { User, Session } from '@supabase/supabase-js'
