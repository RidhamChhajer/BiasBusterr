import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/auth'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        console.log('[DEBUG] Starting debug save check...')

        // 1. Check Auth
        const user = await getCurrentUser()
        console.log('[DEBUG] User auth result:', user?.id || 'none')

        if (!user) {
            return NextResponse.json({
                status: 'auth_failed',
                message: 'No authenticated user found. Cookies might be missing or invalid.'
            })
        }

        // 2. Check DB Connection & Insert
        const supabase = await createClient()

        const testPayload = {
            user_id: user.id,
            filename: 'DEBUG_TEST_FILE',
            file_type: 'csv',
            file_size_bytes: 100,
            file_path: 'debug/test.csv',
            system_description: 'Debug test entry',
            processed_data: { debug: true }
        }

        const { data, error } = await supabase
            .from('datasets')
            .insert(testPayload)
            .select()
            .single()

        if (error) {
            console.error('[DEBUG] Insert error:', error)
            return NextResponse.json({
                status: 'db_error',
                message: error.message,
                details: error
            })
        }

        console.log('[DEBUG] Insert success:', data)

        // 3. Clean up (delete the test entry)
        await supabase.from('datasets').delete().eq('id', data.id)

        return NextResponse.json({
            status: 'success',
            message: 'Auth and Database Write working correctly!',
            userId: user.id,
            insertedId: data.id
        })

    } catch (e: any) {
        return NextResponse.json({
            status: 'exception',
            message: e.message
        })
    }
}
