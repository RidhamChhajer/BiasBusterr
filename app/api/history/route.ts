import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/auth'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/history
 * 
 * Fetch analysis history for authenticated users
 * 
 * Authentication: REQUIRED
 * - Anonymous users receive 401 Unauthorized
 * - Authenticated users see only their own analyses (RLS enforced)
 * 
 * Returns: Array of analysis records
 * - id: Analysis UUID
 * - status: Analysis status (pending, processing, completed, failed)
 * - createdAt: ISO timestamp
 * - datasetName: Original dataset filename
 * 
 * Security: Row-Level Security (RLS) automatically filters by auth.uid()
 */
export async function GET(request: NextRequest) {
    try {
        // 1. Check authentication - REQUIRED
        const user = await getCurrentUser()

        if (!user) {
            return NextResponse.json(
                { error: 'Authentication required', code: 'UNAUTHORIZED' },
                { status: 401 }
            )
        }

        // 2. Create Supabase client (inherits user session)
        const supabase = await createClient()

        // 3. Query analyses table
        // RLS policy automatically filters: WHERE auth.uid() = user_id
        // No manual user_id filtering needed - RLS handles it
        const { data: analyses, error } = await supabase
            .from('analyses')
            .select(`
                id,
                status,
                started_at,
                datasets (
                    filename
                )
            `)
            .order('started_at', { ascending: false })

        if (error) {
            console.error('Error fetching history:', error)
            return NextResponse.json(
                {
                    error: 'Failed to fetch analysis history',
                    code: 'DATABASE_ERROR',
                    details: error.message
                },
                { status: 500 }
            )
        }

        // 4. Transform data to match API contract
        const formattedHistory = (analyses || []).map(analysis => ({
            id: analysis.id,
            status: analysis.status,
            createdAt: analysis.started_at,
            datasetName: (analysis.datasets as any)?.filename || (analysis.datasets as any)?.[0]?.filename || 'Unknown'
        }))

        // 5. Return history (empty array if no analyses)
        return NextResponse.json(formattedHistory, { status: 200 })

    } catch (error) {
        console.error('Unexpected error in /api/history:', error)

        return NextResponse.json(
            {
                error: 'Internal server error',
                code: 'INTERNAL_ERROR',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}
