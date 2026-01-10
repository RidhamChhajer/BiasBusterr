import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/auth'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/history/[analysisId]
 * 
 * Fetch a specific analysis with full details for authenticated users
 * 
 * Authentication: REQUIRED
 * - Anonymous users receive 401 Unauthorized
 * - Authenticated users can only access their own analyses (RLS enforced)
 * 
 * Returns:
 * - analysis: Analysis record
 * - analysisDetails: Full analysis results
 * - chatMessages: Associated chat messages
 * 
 * Security: Row-Level Security (RLS) automatically filters by auth.uid()
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ analysisId: string }> }
) {
    try {
        // 1. Check authentication - REQUIRED
        const user = await getCurrentUser()

        if (!user) {
            return NextResponse.json(
                { error: 'Authentication required', code: 'UNAUTHORIZED' },
                { status: 401 }
            )
        }

        const { analysisId } = await params

        if (!analysisId) {
            return NextResponse.json(
                { error: 'Analysis ID required', code: 'MISSING_ID' },
                { status: 400 }
            )
        }

        // 2. Create Supabase client (inherits user session)
        const supabase = await createClient()

        // 3. Fetch analysis with details
        // RLS automatically filters: WHERE auth.uid() = user_id
        const { data: analysis, error: analysisError } = await supabase
            .from('analyses')
            .select(`
                *,
                datasets (
                    filename,
                    file_type,
                    system_description
                )
            `)
            .eq('id', analysisId)
            .single()

        if (analysisError) {
            if (analysisError.code === 'PGRST116') {
                return NextResponse.json(
                    { error: 'Analysis not found', code: 'NOT_FOUND' },
                    { status: 404 }
                )
            }

            console.error('Error fetching analysis:', analysisError)
            return NextResponse.json(
                {
                    error: 'Failed to fetch analysis',
                    code: 'DATABASE_ERROR',
                    details: analysisError.message
                },
                { status: 500 }
            )
        }

        // 4. Fetch analysis details
        const { data: analysisDetails, error: detailsError } = await supabase
            .from('analysis_details')
            .select('*')
            .eq('analysis_id', analysisId)
            .single()

        if (detailsError && detailsError.code !== 'PGRST116') {
            console.error('Error fetching analysis details:', detailsError)
        }

        // 5. Fetch chat messages
        const { data: chatMessages, error: messagesError } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('analysis_id', analysisId)
            .order('created_at', { ascending: true })

        if (messagesError) {
            console.error('Error fetching chat messages:', messagesError)
        }

        // 6. Return combined data
        return NextResponse.json({
            analysis,
            analysisDetails: analysisDetails || null,
            chatMessages: chatMessages || []
        }, { status: 200 })

    } catch (error) {
        console.error('Unexpected error in /api/history/[analysisId]:', error)

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
