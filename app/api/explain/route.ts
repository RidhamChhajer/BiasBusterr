import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000'

export async function POST(request: NextRequest) {
    try {
        console.log('[/api/explain] Request received')

        // Read the indian_loans.csv from public folder
        const csvPath = path.join(process.cwd(), 'public', 'indian_loans.csv')
        const csvBuffer = await fs.readFile(csvPath)
        const csvBlob = new Blob([csvBuffer], { type: 'text/csv' })

        // Create FormData for Python backend
        const pythonFormData = new FormData()
        pythonFormData.append('file', csvBlob, 'indian_loans.csv')

        console.log('[/api/explain] Forwarding to Python backend')

        const response = await fetch(`${PYTHON_BACKEND_URL}/explain`, {
            method: 'POST',
            body: pythonFormData,
        })

        console.log('[/api/explain] Python response status:', response.status)

        if (!response.ok) {
            const errorText = await response.text()
            console.error('[/api/explain] Python error:', errorText)
            return NextResponse.json(
                { error: 'Python backend error', details: errorText },
                { status: response.status }
            )
        }

        const result = await response.json()
        console.log('[/api/explain] Success - Top features:', result.top_features)

        return NextResponse.json(result, { status: 200 })

    } catch (error) {
        console.error('[/api/explain] Error:', error)
        return NextResponse.json(
            {
                error: 'Internal server error',
                code: 'INTERNAL_ERROR',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
