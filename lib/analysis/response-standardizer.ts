/**
 * Response Standardizer (Phase 5)
 * 
 * Ensures all API responses follow a consistent, predictable shape
 * 
 * CRITICAL RULES:
 * - All responses MUST include standard fields
 * - Fields MAY be null but MUST NOT be omitted
 * - Guarantees frontend/demo stability
 */

import type { Phase1BiasResult } from './bias-detector-phase1'
import type { ExplanationResult } from './explanation-templates'

export type ResponseStatus = 'completed' | 'pending_confirmation' | 'inconclusive' | 'error'

export interface ResponseMetadata {
    input_type: 'csv' | 'pdf' | 'image' | 'drive' | 'text' | 'unknown'
    extraction_method: string | null
    confidence: number | null
    timestamp: string
}

export interface StandardizedResponse {
    status: ResponseStatus
    analysis_id: string
    bias_result: Phase1BiasResult | null
    explanation: ExplanationResult | null
    warnings: string[]
    metadata: ResponseMetadata
}

/**
 * Create standardized response
 */
export function standardizeResponse(
    status: ResponseStatus,
    analysisId: string,
    options: {
        biasResult?: Phase1BiasResult | null
        explanation?: ExplanationResult | null
        warnings?: string[]
        metadata: Partial<ResponseMetadata>
    }
): StandardizedResponse {
    return {
        status,
        analysis_id: analysisId,
        bias_result: options.biasResult || null,
        explanation: options.explanation || null,
        warnings: options.warnings || [],
        metadata: {
            input_type: options.metadata.input_type || 'unknown',
            extraction_method: options.metadata.extraction_method || null,
            confidence: options.metadata.confidence || null,
            timestamp: new Date().toISOString()
        }
    }
}

/**
 * Create error response
 */
export function createErrorResponse(
    error: Error,
    analysisId: string,
    metadata: Partial<ResponseMetadata>
): StandardizedResponse {
    return standardizeResponse('error', analysisId, {
        biasResult: null,
        explanation: null,
        warnings: [error.message],
        metadata
    })
}

/**
 * Create inconclusive response
 */
export function createInconclusiveResponse(
    reason: string,
    analysisId: string,
    metadata: Partial<ResponseMetadata>,
    additionalWarnings: string[] = []
): StandardizedResponse {
    // Create inconclusive bias result
    const inconclusiveBiasResult: Phase1BiasResult = {
        bias_detected: 'inconclusive',
        severity: 'INCONCLUSIVE',
        metrics: {
            total_groups: 0,
            biased_groups: 0,
            bias_ratio: 0,
            average_magnitude: 0,
            consistency_score: 0
        },
        affected_sensitive_attributes: [],
        reasoning: [reason],
        confidence: 0
    }

    return standardizeResponse('inconclusive', analysisId, {
        biasResult: inconclusiveBiasResult,
        explanation: null,
        warnings: [reason, ...additionalWarnings],
        metadata
    })
}

/**
 * Create pending confirmation response
 */
export function createPendingConfirmationResponse(
    analysisId: string,
    suggestedRoles: any[],
    dataPreview: any[][],
    metadata: Partial<ResponseMetadata>,
    warnings: string[] = []
): any {
    return {
        status: 'pending_confirmation',
        analysis_id: analysisId,
        suggested_roles: suggestedRoles,
        data_preview: dataPreview,
        warnings,
        metadata: {
            input_type: metadata.input_type || 'unknown',
            extraction_method: metadata.extraction_method || null,
            confidence: metadata.confidence || null,
            timestamp: new Date().toISOString()
        }
    }
}
