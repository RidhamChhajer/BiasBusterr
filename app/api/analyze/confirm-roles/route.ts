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
    try {
        console.log('[CONFIRM ROLES] Processing role confirmation request...')

        // Parse request body
        const body = await request.json()
        const { analysis_id, confirmed_roles } = body

        // Validate request
        if (!analysis_id || typeof analysis_id !== 'string') {
            return NextResponse.json(
                { error: 'Missing or invalid analysis_id' },
                { status: 400 }
            )
        }

        if (!confirmed_roles || !Array.isArray(confirmed_roles)) {
            return NextResponse.json(
                { error: 'Missing or invalid confirmed_roles' },
                { status: 400 }
            )
        }

        // Retrieve pending analysis
        const pendingAnalysis = await getPendingAnalysis(analysis_id)

        if (!pendingAnalysis) {
            console.log('[CONFIRM ROLES] ❌ Analysis not found or expired:', analysis_id)

            return NextResponse.json(
                {
                    status: 'error',
                    error: 'Analysis not found or expired',
                    message: 'The analysis session has expired. Please upload your file again.'
                },
                { status: 404 }
            )
        }

        console.log('[CONFIRM ROLES] ✅ Retrieved pending analysis')

        // Validate confirmed roles
        const allColumns = pendingAnalysis.dataset.headers
        const validation = validateRoleAssignment(confirmed_roles, allColumns)

        if (!validation.isValid) {
            console.log('[CONFIRM ROLES] ❌ Validation failed:', validation.errors)

            return NextResponse.json(
                {
                    status: 'error',
                    errors: validation.errors,
                    warnings: validation.warnings
                },
                { status: 400 }
            )
        }

        console.log('[CONFIRM ROLES] ✅ Roles validated successfully')
        if (validation.warnings.length > 0) {
            console.log('[CONFIRM ROLES] ⚠️ Warnings:', validation.warnings)
        }

        // Convert to Phase 1 format
        const phase1Roles = convertToPhase1Roles(confirmed_roles)

        console.log('[CONFIRM ROLES] Calling Phase 1 bias detection...')

        // Call Phase 1 logic
        const biasResult = detectBiasPhase1(
            pendingAnalysis.dataset,
            phase1Roles
        )

        console.log('[CONFIRM ROLES] ✅ Phase 1 analysis complete')

        // PHASE 3: Generate explanation
        console.log('[CONFIRM ROLES] Generating explanation...')

        let explanation
        try {
            explanation = await generateExplanation(
                biasResult,
                pendingAnalysis.dataset,
                phase1Roles
            )
            console.log('[CONFIRM ROLES] ✅ Explanation generated (source:', explanation.source + ')')
        } catch (error: any) {
            console.error('[CONFIRM ROLES] ⚠️ Explanation generation failed:', error.message)
            // Continue without explanation (non-blocking)
            explanation = null
        }

        // PHASE 4: Save to Supabase (for authenticated users)
        const user = await getCurrentUser()
        let savedAnalysisId = analysis_id // Default to temp ID

        if (user) {
            console.log('[CONFIRM ROLES] Saving analysis to database for user:', user.id)
            
            const supabase = await createClient()
            
            try {
                // 1. Insert dataset
                console.log('[CONFIRM ROLES] Step 1: Inserting dataset...')
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
                
                if (datasetError) throw datasetError
                
                console.log('[CONFIRM ROLES] ✅ Dataset saved:', dataset.id)
                
                // 2. Insert analysis
                console.log('[CONFIRM ROLES] Step 2: Inserting analysis...')
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
                
                if (analysisError) throw analysisError
                
                console.log('[CONFIRM ROLES] ✅ Analysis saved:', analysis.id)
                
                // 3. Insert analysis details
                console.log('[CONFIRM ROLES] Step 3: Inserting analysis details...')
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
                            groupingMetadata: biasResult.metrics.groupingMetadata,
                        },
                        bias_signals: {
                            overallRisk: biasResult.severity.toLowerCase(),
                            detectedBiases: biasResult.affected_sensitive_attributes || [],
                            uncertaintyLevel: 'low',
                        },
                        limitations: [],
                    })
                
                if (detailsError) throw detailsError
                
                console.log('[CONFIRM ROLES] ✅ Analysis details saved')
                console.log('[CONFIRM ROLES] 🎉 Database persistence complete!')
                
                // Use real database ID
                savedAnalysisId = analysis.id
                
            } catch (dbError: any) {
                console.error('[CONFIRM ROLES] ⚠️ Database save failed:', dbError.message)
                console.error('[CONFIRM ROLES] Error details:', dbError)
                // Continue without saving (non-blocking)
            }
        } else {
            console.log('[CONFIRM ROLES] Anonymous user - skipping database save')
        }

        // Delete pending analysis from cache
        await deletePendingAnalysis(analysis_id)

        console.log('[CONFIRM ROLES] ✅ Cleaned up pending analysis')

        // Return full result in expected format (matching initial upload response)
        return NextResponse.json({
            id: savedAnalysisId, // Use real DB ID if authenticated, temp ID if anonymous
            status: 'completed',
            isAnonymous: !user,
            dataset: {
                fileName: pendingAnalysis.dataset.metadata?.source || 'unknown.csv',
                fileType: 'csv',
                fileSizeBytes: 0,
                rowCount: pendingAnalysis.dataset.rowCount || 0,
            },
            analysis: {
                inferredDomain: 'general',
                suggestedAttributes: biasResult.affected_sensitive_attributes || [],
                biasSignals: {
                    overallRisk: biasResult.severity.toLowerCase() as 'low' | 'medium' | 'high',
                    detectedBiases: biasResult.affected_sensitive_attributes || [],
                    uncertaintyLevel: 'low' as 'low' | 'medium' | 'high',
                },
                statisticalResults: {
                    severity: biasResult.severity,
                    affectedAttributes: biasResult.affected_sensitive_attributes,
                    totalGroups: biasResult.metrics.total_groups,
                    biasedGroups: biasResult.metrics.biased_groups,
                    biasRatio: biasResult.metrics.bias_ratio,
                    averageMagnitude: biasResult.metrics.average_magnitude,
                },
                limitations: [],
            },
            bias_result: biasResult,
            explanation,
            warnings: validation.warnings,
            message: 'Analysis completed successfully'
        })

    } catch (error: any) {
        console.error('[CONFIRM ROLES] Error:', error.message)
        console.error(error.stack)

        return NextResponse.json(
            {
                status: 'error',
                error: 'Internal server error',
                message: error.message
            },
            { status: 500 }
        )
    }
}
