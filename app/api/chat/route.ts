import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/auth'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/chat
 * 
 * Save chat messages to database for authenticated users
 * 
 * Request body:
 * - analysisId: string
 * - userMessage: string
 * - assistantMessage: string
 * 
 * Returns: Success status
 */
export async function POST(request: NextRequest) {
    try {
        // 1. Check authentication
        const user = await getCurrentUser()

        if (!user) {
            return NextResponse.json(
                { error: 'Authentication required', code: 'UNAUTHORIZED' },
                { status: 401 }
            )
        }

        // 2. Parse request body
        const { analysisId, userMessage, assistantMessage } = await request.json()

        if (!analysisId || !userMessage || !assistantMessage) {
            return NextResponse.json(
                { error: 'Missing required fields', code: 'INVALID_REQUEST' },
                { status: 400 }
            )
        }

        // 3. Create Supabase client
        const supabase = await createClient()

        // 4. Save user message
        const { error: userMessageError } = await supabase
            .from('chat_messages')
            .insert({
                analysis_id: analysisId,
                user_id: user.id,
                role: 'user',
                content: userMessage,
                triggered_reanalysis: false
            })

        if (userMessageError) {
            console.error('Error saving user message:', userMessageError)
            return NextResponse.json(
                { error: 'Failed to save user message', code: 'DATABASE_ERROR' },
                { status: 500 }
            )
        }

        // 5. Save assistant message
        const { error: assistantMessageError } = await supabase
            .from('chat_messages')
            .insert({
                analysis_id: analysisId,
                user_id: user.id,
                role: 'assistant',
                content: assistantMessage,
                triggered_reanalysis: false
            })

        if (assistantMessageError) {
            console.error('Error saving assistant message:', assistantMessageError)
            return NextResponse.json(
                { error: 'Failed to save assistant message', code: 'DATABASE_ERROR' },
                { status: 500 }
            )
        }

        // 6. Return success
        return NextResponse.json({ success: true }, { status: 200 })

    } catch (error) {
        console.error('Unexpected error in /api/chat:', error)

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
