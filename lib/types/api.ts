/**
 * Type definitions for API requests and responses
 */

/**
 * Analysis request payload
 */
export interface AnalyzeRequest {
    file: File
    systemDescription: string
    fileName: string
    fileType: 'csv' | 'pdf' | 'image'
    fileSizeBytes: number
}

/**
 * Mock analysis result (placeholder)
 */
export interface AnalysisResult {
    id: string
    status: 'completed' | 'processing' | 'failed'
    isAnonymous: boolean
    dataset: {
        fileName: string
        fileType: string
        fileSizeBytes: number
        rowCount: number
        systemDescription?: string
    }
    analysis: {
        inferredDomain: string
        suggestedAttributes: string[]
        biasSignals: {
            overallRisk: 'low' | 'medium' | 'high'
            detectedBiases: string[]
            uncertaintyLevel: 'low' | 'medium' | 'high'
        }
        statisticalResults: Record<string, unknown>
        limitations: string[]
    }
    message?: string
}

/**
 * API error response
 */
export interface ApiError {
    error: string
    code?: string
    details?: unknown
}

/**
 * Rate limit info
 */
export interface RateLimitInfo {
    isLimited: boolean
    reason?: string
    retryAfter?: number
}
