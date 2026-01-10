/**
 * Resource Validator (Phase 5)
 * 
 * Enforces resource limits and validates inputs
 * 
 * CRITICAL RULES:
 * - CSV rows: max 10,000
 * - File size: max 50MB (authenticated), 5MB (anonymous)
 * - Pending confirmation TTL: 15 minutes
 */

import type { ParsedDataset } from './types'
import { AnalysisError, ErrorCode } from './error-handler'

export interface ResourceLimits {
    maxCsvRows: number
    maxFileSize: number
    maxAnonymousFileSize: number
    maxPendingAnalyses: number
    pendingTTL: number  // milliseconds
}

export const RESOURCE_LIMITS: ResourceLimits = {
    maxCsvRows: 10000,
    maxFileSize: 50 * 1024 * 1024,  // 50MB
    maxAnonymousFileSize: 5 * 1024 * 1024,  // 5MB
    maxPendingAnalyses: 100,
    pendingTTL: 15 * 60 * 1000  // 15 minutes
}

export interface ValidationResult {
    valid: boolean
    errors: string[]
    warnings: string[]
}

/**
 * Validate dataset against resource limits
 */
export function validateDatasetLimits(dataset: ParsedDataset): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Check row count
    if (dataset.rowCount > RESOURCE_LIMITS.maxCsvRows) {
        errors.push(`Dataset exceeds maximum row limit: ${dataset.rowCount} > ${RESOURCE_LIMITS.maxCsvRows}`)
    }

    // Check for minimum rows
    if (dataset.rowCount < 10) {
        warnings.push(`Small dataset: ${dataset.rowCount} rows (minimum 10 recommended for reliable analysis)`)
    }

    // Check for minimum columns
    if (dataset.columnCount < 3) {
        warnings.push(`Few columns: ${dataset.columnCount} (minimum 3 recommended: merit, sensitive, outcome)`)
    }

    // Check for empty headers
    const emptyHeaders = dataset.headers.filter(h => !h || h.trim() === '')
    if (emptyHeaders.length > 0) {
        errors.push(`Dataset has ${emptyHeaders.length} empty column headers`)
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    }
}

/**
 * Validate file size
 */
export function validateFileSize(
    fileSizeBytes: number,
    isAnonymous: boolean
): ValidationResult {
    const limit = isAnonymous ? RESOURCE_LIMITS.maxAnonymousFileSize : RESOURCE_LIMITS.maxFileSize
    const limitMB = limit / (1024 * 1024)

    if (fileSizeBytes > limit) {
        return {
            valid: false,
            errors: [`File size exceeds limit: ${(fileSizeBytes / (1024 * 1024)).toFixed(2)}MB > ${limitMB}MB`],
            warnings: []
        }
    }

    return {
        valid: true,
        errors: [],
        warnings: []
    }
}

/**
 * Validate analysis ID format
 */
export function validateAnalysisId(analysisId: string): boolean {
    // Analysis ID should be in format: temp_timestamp_randomstring
    const pattern = /^temp_\d+_[a-zA-Z0-9]+$/
    return pattern.test(analysisId)
}

/**
 * Generate analysis ID
 */
export function generateAnalysisId(): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 15)
    return `temp_${timestamp}_${random}`
}
