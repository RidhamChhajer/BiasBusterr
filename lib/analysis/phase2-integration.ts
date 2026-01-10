/**
 * Phase 2 Integration Helper
 * 
 * Adds CSV role confirmation workflow to analyze route
 * 
 * This file contains the modified processAnonymousAnalysis function
 * that should replace the existing one in route.ts
 */

import { processCSVForRoleConfirmation } from '@/lib/analysis/csv-processor'
import { extractTextFromFile, hasSufficientText } from '@/lib/analysis/text-extractor'
import { analyzeBias } from '@/lib/analysis/bias-detector'
import type { AnalysisResult } from '@/lib/types/api'

/**
 * Process analysis for anonymous users (WITH PHASE 2 CSV SUPPORT)
 * 
 * Flow:
 * 1. If CSV → Role confirmation workflow (pending_confirmation)
 * 2. If non-CSV → Text-based analysis (existing flow)
 */
export async function processAnonymousAnalysisWithPhase2(params: {
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

            // Return pending_confirmation response (extends AnalysisResult)
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
                // Phase 2 extensions (non-breaking)
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

    // EXISTING: Text-based analysis for non-CSV files (or CSV fallback)
    await new Promise((resolve) => setTimeout(resolve, 1000))

    try {
        const extractedText = await extractTextFromFile(fileBuffer, fileType)

        let biasSignals, statisticalResults, limitations

        if (!hasSufficientText(extractedText)) {
            biasSignals = {
                overallRisk: 'unknown' as 'low' | 'medium' | 'high',
                detectedBiases: [],
                uncertaintyLevel: 'high' as 'low' | 'medium' | 'high',
            }
            statisticalResults = {}
            limitations = ['Insufficient textual content for analysis']
        } else {
            const biasResult = await analyzeBias(extractedText)

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
                biasSignals,
                statisticalResults,
                limitations,
            },
            message: 'Analysis complete (ephemeral - not saved)',
        }
    } catch (error: any) {
        console.error('[ANONYMOUS ANALYSIS] Error:', error.message)

        return {
            id: `error_${Date.now()}`,
            status: 'failed',
            isAnonymous: true,
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
                limitations: [`Analysis failed: ${error.message}`],
            },
            message: `Analysis failed: ${error.message}`,
        }
    }
}
