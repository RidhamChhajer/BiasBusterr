import { NextRequest, NextResponse } from 'next/server'

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000'

export async function POST(request: NextRequest) {
    try {
        console.log('[/api/analyze] Request received')

        const formData = await request.formData()
        const file = formData.get('file') as File | null

        console.log('[/api/analyze] File:', file?.name, file?.type, file?.size)

        if (!file) {
            return NextResponse.json(
                { error: 'File is required', code: 'MISSING_FILE' },
                { status: 400 }
            )
        }

        // Forward to Python backend
        const pythonFormData = new FormData()
        pythonFormData.append('file', file)

        console.log('[/api/analyze] Forwarding to Python backend:', `${PYTHON_BACKEND_URL}/process_csv`)

        const response = await fetch(`${PYTHON_BACKEND_URL}/process_csv`, {
            method: 'POST',
            body: pythonFormData,
        })

        console.log('[/api/analyze] Python response status:', response.status)

        if (!response.ok) {
            const errorText = await response.text()
            console.error('[/api/analyze] Python error:', errorText)
            return NextResponse.json(
                { error: 'Python backend error', details: errorText },
                { status: response.status }
            )
        }

        const pythonResult = await response.json()
        console.log('[/api/analyze] Python result:', pythonResult)

        // Return result with both old and new structure for compatibility
        return NextResponse.json({
            id: `analysis_${Date.now()}`,
            status: 'completed',
            isAnonymous: true,
            dataset: {
                fileName: file.name,
                fileType: 'csv',
                fileSizeBytes: file.size,
                rowCount: 1000,
                systemDescription: 'ML Analysis',
            },
            analysis: {
                inferredDomain: 'Financial Services',
                suggestedAttributes: [pythonResult.details?.protected_attribute || 'Unknown'],
                biasSignals: {
                    overallRisk: pythonResult.fairness_score < 50 ? 'high' : pythonResult.fairness_score < 70 ? 'medium' : 'low',
                    detectedBiases: [pythonResult.details?.protected_attribute || 'Unknown'],
                    uncertaintyLevel: 'low',
                },
                statisticalResults: pythonResult.details || {},
                limitations: ['Statistical analysis only'],
            },
            // Python backend data
            fairness_score: pythonResult.fairness_score,
            accuracy: pythonResult.accuracy,
            top_features: pythonResult.top_features, // PASS THROUGH SHAP DATA
            details: pythonResult.details,
        }, { status: 200 })

    } catch (error) {
        console.error('[/api/analyze] Error:', error)
        return NextResponse.json(
            {
                error: 'Internal server error',
                code: 'INTERNAL_ERROR',
                details: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
            },
            { status: 500 }
        )
    }
}
