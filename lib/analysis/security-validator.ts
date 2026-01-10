/**
 * Security Validator (Phase 5)
 * 
 * Security and safety guarantees
 * 
 * CRITICAL RULES:
 * - No raw dataset logged
 * - No extracted table sent to OpenAI (except Vision)
 * - No user data persisted beyond TTL
 * - Google Drive URLs validated strictly
 */

import type { ParsedDataset } from './types'
import { isGoogleDriveUrl } from './drive-fetcher'

/**
 * Validate Google Drive URL
 */
export function validateDriveUrl(url: string): { valid: boolean; error?: string } {
    // Check if it's a Drive URL
    if (!isGoogleDriveUrl(url)) {
        return {
            valid: false,
            error: 'Not a valid Google Drive URL'
        }
    }

    // Check for suspicious patterns
    if (url.includes('javascript:') || url.includes('<script')) {
        return {
            valid: false,
            error: 'URL contains suspicious content'
        }
    }

    // Check URL length (prevent DOS)
    if (url.length > 500) {
        return {
            valid: false,
            error: 'URL exceeds maximum length'
        }
    }

    return { valid: true }
}

/**
 * Sanitize dataset for logging
 * 
 * Removes actual data, keeps only metadata
 */
export function sanitizeDatasetForLogging(dataset: ParsedDataset): object {
    return {
        rowCount: dataset.rowCount,
        columnCount: dataset.columnCount,
        headers: dataset.headers,  // Headers are OK to log
        // DO NOT log actual row data
        metadata: dataset.metadata
    }
}

/**
 * Redact sensitive data from object
 * 
 * Used for error logging to prevent PII leakage
 */
export function redactSensitiveData(data: any): any {
    if (typeof data !== 'object' || data === null) {
        return data
    }

    const redacted = { ...data }

    // Redact known sensitive fields
    const sensitiveFields = ['rows', 'data', 'values', 'records', 'dataset']

    for (const field of sensitiveFields) {
        if (field in redacted) {
            redacted[field] = '[REDACTED]'
        }
    }

    return redacted
}

/**
 * Validate column name
 * 
 * Ensures column names don't contain malicious content
 */
export function validateColumnName(columnName: string): boolean {
    // Check length
    if (columnName.length > 100) {
        return false
    }

    // Check for suspicious patterns
    if (columnName.includes('<script') || columnName.includes('javascript:')) {
        return false
    }

    return true
}

/**
 * Validate all column names in dataset
 */
export function validateDatasetSecurity(dataset: ParsedDataset): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Validate column names
    for (const header of dataset.headers) {
        if (!validateColumnName(header)) {
            errors.push(`Invalid column name: ${header.substring(0, 50)}...`)
        }
    }

    // Check for excessive columns (potential DOS)
    if (dataset.columnCount > 100) {
        errors.push(`Too many columns: ${dataset.columnCount} (maximum 100)`)
    }

    return {
        valid: errors.length === 0,
        errors
    }
}
