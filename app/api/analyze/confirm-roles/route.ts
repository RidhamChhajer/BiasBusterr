/**
 * API Route: Confirm Column Roles (Phase 2)
 * 
 * Endpoint: POST /api/analyze/confirm-roles
 * 
 * Purpose: Accept user-confirmed column roles and proceed with Phase 1 bias analysis
 * 
 * CRITICAL RULES:
 * - Validate analysis_id (not expired, exists)
 * - Validate confirmed roles (≥1 merit, =1 outcome)
 * - Call Phase 1 logic ONLY after validation
 * - Delete pending analysis after completion
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPendingAnalysis, deletePendingAnalysis } from '@/lib/analysis/session-cache'
import { validateRoleAssignment, convertToPhase1Roles, type ConfirmedRole } from '@/lib/analysis/role-validator'
import { detectBiasPhase1 } from '@/lib/analysis/bias-detector-phase1'
import { generateExplanation } from '@/lib/analysis/explanation-generator'
import { getCurrentUser } from '@/lib/auth/auth'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
    // Collecting logs to return in response for debug purposes
    const logs: string[] = []
    const log = (msg: string) => {
        console.log(msg)
        logs.push(msg)
    }

    try {
        log('[CONFIRM ROLES] Processing role confirmation request...')

        // Parse request body
        const body = await request.json()
        const { analysis_id, confirmed_roles } = body

        // Validate request
        if (!analysis_id || typeof analysis_id !== 'string') {
            return NextResponse.json(
                { error: 'Missing or invalid analysis_id', debugLogs: logs },
                { status: 400 }
            )
        }

        if (!confirmed_roles || !Array.isArray(confirmed_roles)) {
            return NextResponse.json(
                { error: 'Missing or invalid confirmed_roles', debugLogs: logs },
                { status: 400 }
            )
        }

        // Retrieve pending analysis
        const pendingAnalysis = await getPendingAnalysis(analysis_id)

        if (!pendingAnalysis) {
            log(`[CONFIRM ROLES] ❌ Analysis not found or expired: ${analysis_id}`)

            return NextResponse.json(
                {
                    status: 'error',
                    error: 'Analysis not found or expired',
                    message: 'The analysis session has expired. Please upload your file again.',
                    debugLogs: logs
                },
                { status: 404 }
            )
        }

        log('[CONFIRM ROLES] ✅ Retrieved pending analysis')

        // Validate confirmed roles
        const allColumns = pendingAnalysis.dataset.headers
        const validation = validateRoleAssignment(confirmed_roles, allColumns)

        if (!validation.isValid) {
            log(`[CONFIRM ROLES] ❌ Validation failed: ${JSON.stringify(validation.errors)}`)

            return NextResponse.json(
                {
                    status: 'error',
                    errors: validation.errors,
                    warnings: validation.warnings,
                    debugLogs: logs
                },
                { status: 400 }
            )
        }

        log('[CONFIRM ROLES] ✅ Roles validated successfully')
        if (validation.warnings.length > 0) {
            log(`[CONFIRM ROLES] ⚠️ Warnings: ${JSON.stringify(validation.warnings)}`)
        }

        // Convert to Phase 1 format
        const phase1Roles = convertToPhase1Roles(confirmed_roles)

        log('[CONFIRM ROLES] Calling Phase 1 bias detection...')

        // Call Phase 1 logic
        const biasResult = detectBiasPhase1(
            pendingAnalysis.dataset,
            phase1Roles
        )

        log('[CONFIRM ROLES] ✅ Phase 1 analysis complete')

        // PHASE 3: Generate explanation
        log('[CONFIRM ROLES] Generating explanation...')

        let explanation
        try {
            explanation = await generateExplanation(
                biasResult,
                pendingAnalysis.dataset,
                phase1Roles
            )
            log(`[CONFIRM ROLES] ✅ Explanation generated (source: ${explanation.source})`)
        } catch (error: any) {
            log(`[CONFIRM ROLES] ⚠️ Explanation generation failed: ${error.message}`)
            // Continue without explanation (non-blocking)
            explanation = null
        }

        // PHASE 4: Save to Supabase (for authenticated users)
        let user = null
        try {
            log('[CONFIRM ROLES] Checking auth...')
            user = await getCurrentUser()
            log(`[CONFIRM ROLES] Auth result: ${user ? user.id : 'null'}`)
        } catch (authErr: any) {
            log(`[AUTH CHECK ERROR] ${authErr.message}`)
        }

        let savedAnalysisId = analysis_id // Default to temp ID
        let saveError = null

        if (user) {
            log('[CONFIRM ROLES] Attempting to save analysis to Supabase...')

            const supabase = await createClient()

            try {
                // 1. Insert dataset
                log('[CONFIRM ROLES] Step 1: Inserting dataset...')
                const { data: dataset, error: datasetError } = await supabase
                    .from('datasets')
                    .insert({
                        user_id: user.id,
                        filename: pendingAnalysis.dataset.metadata?.source || 'unknown.csv',
                        file_type: 'csv',
                        file_size_bytes: 0, // Not tracked for in-memory CSV
                        file_path: `/uploads/${user.id}/csv_${Date.now()}.csv`,
                        system_description: 'CSV analysis',
                        processed_data: {
                            headers: pendingAnalysis.dataset.headers,
                            rowCount: pendingAnalysis.dataset.rowCount,
                            columnCount: pendingAnalysis.dataset.columnCount
                        },
                        extraction_confirmed: true,
                        extraction_method: 'csv-direct',
                    })
                    .select()
                    .single()

                if (datasetError) {
                    log(`[CONFIRM ROLES] ❌ Dataset insert failed: ${datasetError.message}`)
                    throw datasetError
                }

                log(`[CONFIRM ROLES] ✅ Dataset saved: ${dataset.id}`)

                // 2. Insert analysis
                log('[CONFIRM ROLES] Step 2: Inserting analysis...')
                const { data: analysis, error: analysisError } = await supabase
                    .from('analyses')
                    .insert({
                        dataset_id: dataset.id,
                        user_id: user.id,
                        status: 'completed',
                        inferred_domain: 'general',
                        suggested_sensitive_attributes: biasResult.affected_sensitive_attributes || [],
                        user_confirmed_attributes: biasResult.affected_sensitive_attributes || [],
                        started_at: new Date().toISOString(),
                        completed_at: new Date().toISOString(),
                    })
                    .select()
                    .single()

                if (analysisError) {
                    log(`[CONFIRM ROLES] ❌ Analysis insert failed: ${analysisError.message}`)
                    throw analysisError
                }

                log(`[CONFIRM ROLES] ✅ Analysis saved: ${analysis.id}`)

                // 3. Insert analysis details
                log('[CONFIRM ROLES] Step 3: Inserting analysis details...')
                const { error: detailsError } = await supabase
                    .from('analysis_details')
                    .insert({
                        analysis_id: analysis.id,
                        user_id: user.id,
                        statistical_results: {
                            severity: biasResult.severity,
                            affectedAttributes: biasResult.affected_sensitive_attributes,
                            totalGroups: biasResult.metrics.total_groups,
                            biasedGroups: biasResult.metrics.biased_groups,
                            biasRatio: biasResult.metrics.bias_ratio,
                            averageMagnitude: biasResult.metrics.average_magnitude,
                        },
                        bias_signals: {
                            overallRisk: biasResult.severity.toLowerCase(),
                            detectedBiases: biasResult.affected_sensitive_attributes || [],
                            uncertaintyLevel: 'low',
                        },
                        limitations: [],
                    })

                if (detailsError) {
                    log(`[CONFIRM ROLES] ❌ Analysis details insert failed: ${detailsError.message}`)
                    throw detailsError
                }

                log('[CONFIRM ROLES] ✅ Analysis details saved')
                log('[CONFIRM ROLES] 🎉 Database persistence complete!')

                // Use real database ID
                savedAnalysisId = analysis.id

            } catch (dbError: any) {
                log(`[CONFIRM ROLES] ⚠️ Database save failed: ${dbError.message}`)
                saveError = dbError.message
                // Continue without saving (non-blocking)
            }
        } else {
            log('[CONFIRM ROLES] ⚠️ User NOT authenticated - skipping database save')
            // Log cookie status for debugging
            try {
                const cookieStore = await import('next/headers').then(mod => mod.cookies())
                const allCookies = cookieStore.getAll().map(c => c.name)
                log(`[CONFIRM ROLES] Available cookies: ${JSON.stringify(allCookies)}`)
            } catch (e) { }
        }

        // Delete pending analysis from cache (ignore errors)
        try {
            await deletePendingAnalysis(analysis_id)
            log('[CONFIRM ROLES] ✅ Cleaned up pending analysis')
        } catch (e: any) {
            log(`[CLEANUP WARNING] ${e.message}`)
        }

        // Return full result in expected format (matching initial upload response)
        return NextResponse.json({
            id: savedAnalysisId, // Return real DB ID or temp ID
            status: 'completed',
            isAnonymous: !user,
            debugLogs: logs,
            saveError: saveError,
            dataset: {
                fileName: pendingAnalysis.dataset.metadata?.source || 'unknown.csv',
                fileType: 'csv',
                fileSizeBytes: 0,
                rowCount: pendingAnalysis.dataset.rowCount || 0,
            },
            analysis: {
                inferredDomain: 'general', // Placeholder
                suggestedAttributes: biasResult.affected_sensitive_attributes || [],
                biasSignals: {
                    overallRisk: biasResult.severity.toLowerCase() as 'low' | 'medium' | 'high',
                    detectedBiases: biasResult.affected_sensitive_attributes || [],
                    uncertaintyLevel: 'low'
                },
                statisticalResults: {
                    severity: biasResult.severity,
                    metrics: biasResult.metrics,
                    affectedAttributes: biasResult.affected_sensitive_attributes,
                    totalGroups: biasResult.metrics.total_groups,
                    biasedGroups: biasResult.metrics.biased_groups,
                    biasRatio: biasResult.metrics.bias_ratio,
                    averageMagnitude: biasResult.metrics.average_magnitude
                },
                limitations: [] // Placeholder
            },
            bias_result: biasResult,
            explanation,
            warnings: validation.warnings,
            message: 'Analysis completed successfully'
        })

    } catch (error: any) {
        log(`[CONFIRM ROLES] CRITICAL ERROR: ${error.message}`)
        console.error(error.stack)

        return NextResponse.json(
            {
                status: 'error',
                error: 'Internal server error',
                message: error.message,
                debugLogs: logs
            },
            { status: 500 }
        )
    }
}
