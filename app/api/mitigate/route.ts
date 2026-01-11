import { NextRequest, NextResponse } from 'next/server'

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000'

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()

        // Forward the request to Python backend
        const response = await fetch(`${PYTHON_BACKEND_URL}/mitigate`, {
            method: 'POST',
            body: formData,
        })

        const data = await response.json()

        if (!response.ok) {
            return NextResponse.json(
                { error: data.detail || 'Failed to process request' },
                { status: response.status }
            )
        }

        return NextResponse.json(data, { status: 200 })
    } catch (error) {
        console.error('Error in /api/mitigate:', error)
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}
