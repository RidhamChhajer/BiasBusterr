import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/auth'
import { createClient } from '@/lib/supabase/server'
import {
    canMakeAnonymousRequest,
    startAnonymousRequest,
    completeAnonymousRequest,
    getClientIp,
    validateAnonymousFileSize,
} from '@/lib/utils/rate-limit'
import type { AnalysisResult, ApiError } from '@/lib/types/api'
import { extractTextFromFile, hasSufficientText } from '@/lib/analysis/text-extractor'
import { analyzeBias } from '@/lib/analysis/bias-detector'
import { processCSVForRoleConfirmation } from '@/lib/analysis/csv-processor'

/**
 * POST /api/analyze
 * 
 * Analyze a dataset for potential bias
 * 
 * Supports two flows:
 * 1. Anonymous users: Ephemeral processing, no DB writes, limited to 5MB files
 * 2. Authenticated users: Placeholder for persistent flow (DB writes not implemented yet)
 * 
 * Request body (FormData):
 * - file: File (CSV, PDF, or Image)
 * - systemDescription: string (description of what the data represents)
 * 
 * Returns:
 * - Mock analysis result (static JSON for now)
 */
export async function POST(request: NextRequest) {
    try {
        // 1. Check authentication status
        const user = await getCurrentUser()
        const isAuthenticated = user !== null

        // 2. Get client IP for anonymous rate limiting
        const clientIp = getClientIp(request)

        // 3. Handle anonymous user limits
        if (!isAuthenticated) {
            // Check if anonymous user can make a request
            const { allowed, reason } = canMakeAnonymousRequest(clientIp)

            if (!allowed) {
                return NextResponse.json<ApiError>(
                    {
                        error: reason || 'Rate limit exceeded',
                        code: 'RATE_LIMIT_EXCEEDED',
                    },
                    { status: 429 }
                )
            }
        }

        // 4. Parse form data
        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const systemDescription = formData.get('systemDescription') as string | null

        // 5. Validate input
        if (!file) {
            return NextResponse.json<ApiError>(
                { error: 'File is required', code: 'MISSING_FILE' },
                { status: 400 }
            )
        }

        if (!systemDescription || systemDescription.trim().length === 0) {
            return NextResponse.json<ApiError>(
                {
                    error: 'System description is required',
                    code: 'MISSING_DESCRIPTION',
                },
                { status: 400 }
            )
        }

        // 6. Validate file type
        const fileName = file.name
        const fileType = getFileType(fileName)

        if (!fileType) {
            return NextResponse.json<ApiError>(
                {
                    error: 'Invalid file type. Supported: CSV, PDF, Image (PNG, JPG, JPEG)',
                    code: 'INVALID_FILE_TYPE',
                },
                { status: 400 }
            )
        }

        // 7. Validate file size for anonymous users
        const fileSizeBytes = file.size

        if (!isAuthenticated) {
            const { valid, reason } = validateAnonymousFileSize(fileSizeBytes)

            if (!valid) {
                return NextResponse.json<ApiError>(
                    {
                        error: reason || 'File size exceeds limit',
                        code: 'FILE_TOO_LARGE',
                    },
                    { status: 413 }
                )
            }
        }

        // 8. Mark anonymous request as started (if anonymous)
        if (!isAuthenticated) {
            startAnonymousRequest(clientIp)
        }

        // 9. Process based on user type
        let result: AnalysisResult

        if (isAuthenticated) {
            // AUTHENTICATED FLOW (placeholder)
            result = await processAuthenticatedAnalysis({
                file,
                fileName,
                fileType,
                fileSizeBytes,
                systemDescription,
                userId: user.id,
            })
        } else {
            // ANONYMOUS FLOW (ephemeral)
            result = await processAnonymousAnalysis({
                file,
                fileName,
                fileType,
                fileSizeBytes,
                systemDescription,
                clientIp,
            })
        }

        // 10. Mark anonymous request as completed (if anonymous)
        if (!isAuthenticated) {
            completeAnonymousRequest(clientIp)
        }

        // 11. Return result
        return NextResponse.json<AnalysisResult>(result, { status: 200 })
    } catch (error) {
        console.error('Error in /api/analyze:', error)

        return NextResponse.json<ApiError>(
            {
                error: 'Internal server error',
                code: 'INTERNAL_ERROR',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}

/**
 * Process analysis for authenticated users
 * 
 * Saves to database:
 * 1. Dataset record
 * 2. Analysis record (version auto-incremented by trigger)
 * 3. Analysis details record
 * 
 * Returns analysis with real database ID
 */
async function processAuthenticatedAnalysis(params: {
    file: File
    fileName: string
    fileType: string
    fileSizeBytes: number
    systemDescription: string
    userId: string
}): Promise<AnalysisResult | any> {
    const { fileName, fileType, fileSizeBytes, systemDescription, userId, file } = params

    // Read file buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    // PHASE 2: CSV Role Confirmation Workflow (for authenticated users too)
    if (fileType === 'csv') {
        console.log('[AUTH ANALYSIS] CSV detected - initiating role confirmation workflow')

        try {
            const result = await processCSVForRoleConfirmation(fileBuffer, fileName)

            console.log('[AUTH ANALYSIS] ✅ CSV processed, returning pending_confirmation')

            return {
                id: result.analysis_id,
                status: 'pending_confirmation',
                isAnonymous: false,
                dataset: {
                    fileName,
                    fileType,
                    fileSizeBytes,
                    rowCount: result.row_count,
                },
                analysis: {
                    inferredDomain: 'general',
                    suggestedAttributes: [],
                    biasSignals: {
                        overallRisk: 'unknown' as 'low' | 'medium' | 'high',
                        detectedBiases: [],
                        uncertaintyLevel: 'low' as 'low' | 'medium' | 'high',
                    },
                    statisticalResults: {},
                    limitations: [],
                },
                analysis_id: result.analysis_id,
                suggested_roles: result.suggested_roles,
                data_preview: result.data_preview,
                column_count: result.column_count,
                row_count: result.row_count,
                message: result.message,
            }
        } catch (error: any) {
            console.error('[AUTH ANALYSIS] CSV processing failed:', error.message)
            // Fall through to text-based analysis
        }
    }

    // Create Supabase client
    const supabase = await createClient()

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    try {
        console.log('[AUTH ANALYSIS] Starting database persistence for user:', userId)
        console.log('[AUTH ANALYSIS] File details:', { fileName, fileType, fileSizeBytes })

        // 1. Insert dataset
        console.log('[AUTH ANALYSIS] Step 1: Inserting dataset...')
        const { data: dataset, error: datasetError } = await supabase
            .from('datasets')
            .insert({
                user_id: userId,
                filename: fileName,
                file_type: fileType,
                file_size_bytes: fileSizeBytes,
                file_path: `/uploads/${userId}/${fileName}`, // Placeholder path
                system_description: systemDescription,
                processed_data: { rows: 1500, columns: [] }, // Mock for now
                extraction_confirmed: true,
                extraction_method: 'direct',
            })
            .select()
            .single()

        if (datasetError) {
            console.error('[AUTH ANALYSIS] ❌ Dataset insert FAILED:', {
                error: datasetError,
                message: datasetError.message,
                details: datasetError.details,
                hint: datasetError.hint,
                code: datasetError.code,
            })
            throw new Error(`Failed to save dataset: ${datasetError.message}`)
        }

        console.log('[AUTH ANALYSIS] ✅ Dataset inserted successfully:', dataset.id)

        // 2. Insert analysis (version will be auto-set by fixed trigger)
        console.log('[AUTH ANALYSIS] Step 2: Inserting analysis...')
        const { data: analysis, error: analysisError } = await supabase
            .from('analyses')
            .insert({
                dataset_id: dataset.id,
                user_id: userId,
                status: 'completed',
                inferred_domain: 'hiring', // Mock
                suggested_sensitive_attributes: ['gender', 'age', 'race'], // Mock
                user_confirmed_attributes: ['gender', 'age'], // Mock
                started_at: new Date().toISOString(),
                completed_at: new Date().toISOString(),
            })
            .select()
            .single()

        if (analysisError) {
            console.error('[AUTH ANALYSIS] ❌ Analysis insert FAILED:', {
                error: analysisError,
                message: analysisError.message,
                details: analysisError.details,
                hint: analysisError.hint,
                code: analysisError.code,
            })
            throw new Error(`Failed to save analysis: ${analysisError.message}`)
        }

        console.log('[AUTH ANALYSIS] ✅ Analysis inserted successfully:', analysis.id)

        // 3. REAL BIAS DETECTION (replacing mock logic)
        console.log('[AUTH ANALYSIS] Step 3: Performing real bias analysis...')

        // Read file buffer
        const fileBuffer = Buffer.from(await params.file.arrayBuffer())

        // Extract text from file
        console.log('[AUTH ANALYSIS] Extracting text from file...')
        const extractedText = await extractTextFromFile(fileBuffer, fileType)
        console.log('[AUTH ANALYSIS] Extracted text length:', extractedText.length)

        let biasSignals, statisticalResults, limitations

        // Check if we have sufficient text
        if (!hasSufficientText(extractedText)) {
            console.log('[AUTH ANALYSIS] ⚠️ Insufficient text for analysis')
            biasSignals = {
                overallRisk: 'unknown' as 'low' | 'medium' | 'high',
                detectedBiases: [],
                uncertaintyLevel: 'high' as 'low' | 'medium' | 'high',
            }
            statisticalResults = {}
            limitations = ['Insufficient textual content for analysis']
        } else {
            // Perform real bias analysis with OpenAI
            console.log('[AUTH ANALYSIS] Calling OpenAI for bias analysis...')
            const biasResult = await analyzeBias(extractedText)
            console.log('[AUTH ANALYSIS] Bias analysis complete:', {
                risk: biasResult.risk_level,
                biasesFound: biasResult.detected_biases.length
            })

            // Map to existing response format
            biasSignals = {
                overallRisk: biasResult.risk_level as 'low' | 'medium' | 'high',
                detectedBiases: biasResult.detected_biases.map(b => b.type),
                uncertaintyLevel: biasResult.detected_biases.length === 0 ? 'low' as 'low' | 'medium' | 'high' :
                    biasResult.detected_biases.some(b => b.confidence < 0.5) ? 'high' as 'low' | 'medium' | 'high' : 'medium' as 'low' | 'medium' | 'high',
            }

            // Include detailed bias information in statistical results
            statisticalResults = {
                bias_details: biasResult.detected_biases,
                text_length: extractedText.length,
                analysis_timestamp: new Date().toISOString(),
            }

            limitations = [biasResult.limitations]
        }

        // 4. Insert analysis details
        console.log('[AUTH ANALYSIS] Step 4: Inserting analysis details...')
        const { error: detailsError } = await supabase
            .from('analysis_details')
            .insert({
                analysis_id: analysis.id,
                user_id: userId,
                statistical_results: statisticalResults,
                bias_signals: biasSignals,
                limitations: limitations,
            })

        if (detailsError) {
            console.error('[AUTH ANALYSIS] ❌ Analysis details insert FAILED:', {
                error: detailsError,
                message: detailsError.message,
                details: detailsError.details,
                hint: detailsError.hint,
                code: detailsError.code,
            })
            throw new Error(`Failed to save analysis details: ${detailsError.message}`)
        }

        console.log('[AUTH ANALYSIS] ✅ Analysis details inserted successfully')
        console.log('[AUTH ANALYSIS] 🎉 All database operations completed successfully!')

        // 5. Return result with real database ID
        return {
            id: analysis.id,
            status: 'completed',
            isAnonymous: false,
            dataset: {
                fileName,
                fileType,
                fileSizeBytes,
                rowCount: 0, // Not calculated for now
            },
            analysis: {
                inferredDomain: 'general', // Can be enhanced later
                suggestedAttributes: biasSignals.detectedBiases,
                biasSignals: biasSignals,
                statisticalResults: statisticalResults,
                limitations: limitations,
            },
            message: 'Analysis complete. Results saved to your account.',
        }
    } catch (error) {
        console.error('[AUTH ANALYSIS] 💥 CRITICAL ERROR:', error)

        // Return error result with detailed message
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

        return {
            id: `error_${Date.now()}`,
            status: 'failed',
            isAnonymous: false,
            dataset: {
                fileName,
                fileType,
                fileSizeBytes,
                rowCount: 0,
            },
            analysis: {
                inferredDomain: '',
                suggestedAttributes: [],
                biasSignals: {
                    overallRisk: 'low' as 'low' | 'medium' | 'high',
                    detectedBiases: [],
                    uncertaintyLevel: 'low' as 'low' | 'medium' | 'high',
                },
                statisticalResults: {},
                limitations: [
                    'Analysis failed to save to database',
                    `Error: ${errorMessage}`,
                    'Please check the console for details',
                ],
            },
            message: `Analysis failed: ${errorMessage}`,
        }
    }
}

/**
 * Process analysis for anonymous users
 * 
 * Ephemeral processing only - no database writes
 * Results are returned immediately and not persisted
 */
async function processAnonymousAnalysis(params: {
    file: File
    fileName: string
    fileType: string
    fileSizeBytes: number
    systemDescription: string
    clientIp: string
}): Promise<AnalysisResult | any> {
    const { fileName, fileType, fileSizeBytes, systemDescription, file } = params

    // Read file buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    // PHASE 2: CSV Role Confirmation Workflow
    if (fileType === 'csv') {
        console.log('[ANONYMOUS ANALYSIS] CSV detected - initiating role confirmation workflow')

        try {
            const result = await processCSVForRoleConfirmation(fileBuffer, fileName)

            console.log('[ANONYMOUS ANALYSIS] ✅ CSV processed, returning pending_confirmation')

            return {
                id: result.analysis_id,
                status: 'pending_confirmation',
                isAnonymous: true,
                dataset: {
                    fileName,
                    fileType,
                    fileSizeBytes,
                    rowCount: result.row_count,
                },
                analysis: {
                    inferredDomain: 'general',
                    suggestedAttributes: [],
                    biasSignals: {
                        overallRisk: 'unknown' as 'low' | 'medium' | 'high',
                        detectedBiases: [],
                        uncertaintyLevel: 'low' as 'low' | 'medium' | 'high',
                    },
                    statisticalResults: {},
                    limitations: [],
                },
                analysis_id: result.analysis_id,
                suggested_roles: result.suggested_roles,
                data_preview: result.data_preview,
                column_count: result.column_count,
                row_count: result.row_count,
                message: result.message,
            }
        } catch (error: any) {
            console.error('[ANONYMOUS ANALYSIS] CSV processing failed:', error.message)
            // Fall through to text-based analysis
        }
    }

    // EXISTING: Text-based analysis for non-CSV files
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // REAL BIAS DETECTION for anonymous users
    try {

        // Extract text from file
        const extractedText = await extractTextFromFile(fileBuffer, fileType)

        let biasSignals, statisticalResults, limitations

        // Check if we have sufficient text
        if (!hasSufficientText(extractedText)) {
            biasSignals = {
                overallRisk: 'unknown' as 'low' | 'medium' | 'high',
                detectedBiases: [],
                uncertaintyLevel: 'high' as 'low' | 'medium' | 'high',
            }
            statisticalResults = {}
            limitations = ['Insufficient textual content for analysis']
        } else {
            // Perform real bias analysis with OpenAI
            const biasResult = await analyzeBias(extractedText)

            // Map to existing response format
            biasSignals = {
                overallRisk: biasResult.risk_level as 'low' | 'medium' | 'high',
                detectedBiases: biasResult.detected_biases.map(b => b.type),
                uncertaintyLevel: biasResult.detected_biases.length === 0 ? 'low' as 'low' | 'medium' | 'high' :
                    biasResult.detected_biases.some(b => b.confidence < 0.5) ? 'high' as 'low' | 'medium' | 'high' : 'medium' as 'low' | 'medium' | 'high',
            }

            statisticalResults = {
                bias_details: biasResult.detected_biases,
                text_length: extractedText.length,
            }

            limitations = [biasResult.limitations]
        }

        // Return result
        return {
            id: `anonymous_${Date.now()}`,
            status: 'completed',
            isAnonymous: true,
            dataset: {
                fileName,
                fileType,
                fileSizeBytes,
                rowCount: 0,
            },
            analysis: {
                inferredDomain: 'general',
                suggestedAttributes: biasSignals.detectedBiases,
                biasSignals: biasSignals,
                statisticalResults: statisticalResults,
                limitations: limitations,
            },
            message: 'Analysis complete. Results are ephemeral and will not be saved.',
        }
    } catch (error) {
        console.error('[ANONYMOUS ANALYSIS] Error:', error)

        // Return safe fallback on error
        return {
            id: `anonymous_${Date.now()}`,
            status: 'failed',
            isAnonymous: true,
            dataset: {
                fileName,
                fileType,
                fileSizeBytes,
                rowCount: 0,
            },
            analysis: {
                inferredDomain: 'unknown',
                suggestedAttributes: [],
                biasSignals: {
                    overallRisk: 'unknown' as 'low' | 'medium' | 'high',
                    detectedBiases: [],
                    uncertaintyLevel: 'high' as 'low' | 'medium' | 'high',
                },
                statisticalResults: {},
                limitations: ['Analysis failed safely'],
            },
            message: 'Analysis failed. Please try again.',
        }
    }
}

/**
 * Determine file type from filename
 */
function getFileType(fileName: string): 'csv' | 'pdf' | 'image' | null {
    const extension = fileName.split('.').pop()?.toLowerCase()

    if (extension === 'csv') return 'csv'
    if (extension === 'pdf') return 'pdf'
    if (['png', 'jpg', 'jpeg'].includes(extension || '')) return 'image'

    return null
}
