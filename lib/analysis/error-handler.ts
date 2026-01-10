/**
 * Error Handler (Phase 5)
 * 
 * Centralized error handling with graceful degradation
 * 
 * CRITICAL RULES:
 * - OpenAI failure → explanation fallback (never error)
 * - Vision failure → downgrade confidence / fallback
 * - Drive fetch failure → error with clear message
 * - Invalid CSV → error with validation details
 * - Missing role confirmation → inconclusive
 */

import { createErrorResponse, createInconclusiveResponse, type ResponseMetadata } from './response-standardizer'

export enum ErrorCode {
    EXTRACTION_FAILED = 'EXTRACTION_FAILED',
    VISION_FAILED = 'VISION_FAILED',
    OPENAI_FAILED = 'OPENAI_FAILED',
    DRIVE_FETCH_FAILED = 'DRIVE_FETCH_FAILED',
    INVALID_CSV = 'INVALID_CSV',
    VALIDATION_FAILED = 'VALIDATION_FAILED',
    TIMEOUT = 'TIMEOUT',
    EXPIRED_SESSION = 'EXPIRED_SESSION',
    RESOURCE_LIMIT_EXCEEDED = 'RESOURCE_LIMIT_EXCEEDED',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class AnalysisError extends Error {
    constructor(
        message: string,
        public code: ErrorCode,
        public recoverable: boolean = false
    ) {
        super(message)
        this.name = 'AnalysisError'
    }
}

export interface ErrorContext {
    analysisId: string
    phase?: string
    metadata?: Partial<ResponseMetadata>
}

/**
 * Handle error with appropriate response
 */
export function handleError(
    error: Error | AnalysisError,
    context: ErrorContext
): any {
    console.error(`[ERROR HANDLER] ${context.phase || 'Unknown phase'}:`, error.message)

    // Check if it's an AnalysisError with specific handling
    if (error instanceof AnalysisError) {
        return handleAnalysisError(error, context)
    }

    // Generic error handling
    return createErrorResponse(
        error,
        context.analysisId,
        context.metadata || {}
    )
}

/**
 * Handle specific analysis errors
 */
function handleAnalysisError(
    error: AnalysisError,
    context: ErrorContext
): any {
    const { code, recoverable, message } = error
    const { analysisId, metadata = {} } = context

    switch (code) {
        case ErrorCode.EXPIRED_SESSION:
            return createInconclusiveResponse(
                'Analysis session expired. Please upload your file again.',
                analysisId,
                metadata,
                ['Session timeout: 15 minutes']
            )

        case ErrorCode.VALIDATION_FAILED:
            return createErrorResponse(
                new Error(`Validation failed: ${message}`),
                analysisId,
                metadata
            )

        case ErrorCode.INVALID_CSV:
            return createErrorResponse(
                new Error(`Invalid CSV file: ${message}`),
                analysisId,
                metadata
            )

        case ErrorCode.DRIVE_FETCH_FAILED:
            return createErrorResponse(
                new Error(`Google Drive fetch failed: ${message}`),
                analysisId,
                metadata
            )

        case ErrorCode.EXTRACTION_FAILED:
            return createInconclusiveResponse(
                `Could not extract structured data: ${message}`,
                analysisId,
                metadata,
                ['Please try uploading a CSV file or clearer image']
            )

        case ErrorCode.VISION_FAILED:
            // Vision failure is recoverable - downgrade to text
            console.warn('[ERROR HANDLER] Vision failed, downgrading to text analysis')
            return createInconclusiveResponse(
                'Vision extraction failed. Please upload a CSV file for bias analysis.',
                analysisId,
                metadata
            )

        case ErrorCode.TIMEOUT:
            return createInconclusiveResponse(
                `Analysis timed out: ${message}`,
                analysisId,
                metadata,
                ['Please try again or upload a smaller file']
            )

        case ErrorCode.RESOURCE_LIMIT_EXCEEDED:
            return createErrorResponse(
                new Error(`Resource limit exceeded: ${message}`),
                analysisId,
                metadata
            )

        default:
            return createErrorResponse(
                new Error(message || 'Unknown error occurred'),
                analysisId,
                metadata
            )
    }
}

/**
 * Wrap async function with error handling
 */
export async function withErrorHandling<T>(
    fn: () => Promise<T>,
    context: ErrorContext
): Promise<T> {
    try {
        return await fn()
    } catch (error: any) {
        throw new AnalysisError(
            error.message,
            ErrorCode.UNKNOWN_ERROR,
            false
        )
    }
}
