/**
 * Quality Assessment (Phase 4)
 * 
 * Assesses extraction quality and confidence for structured data
 * 
 * CRITICAL RULES:
 * - Quality assessment determines if data is safe for fairness analysis
 * - Low confidence MUST result in INCONCLUSIVE
 * - NO guessing or imputation allowed
 */

import type { ParsedDataset, QualityAssessment } from './types'
import { BIAS_CONFIG } from './config'

/**
 * Assess extraction quality
 * 
 * Returns quality metrics and overall confidence score
 */
export function assessExtractionQuality(
    dataset: ParsedDataset
): QualityAssessment {
    const issues: string[] = []

    // 1. Structural Integrity (consistent column count)
    const columnCounts = dataset.rows.map(r => r.length)
    const consistentColumns = columnCounts.every(c => c === dataset.columnCount)
    const structuralIntegrity = consistentColumns ? 1.0 : calculateStructuralScore(columnCounts, dataset.columnCount)

    if (!consistentColumns) {
        issues.push('Inconsistent column count across rows')
    }

    // 2. Data Completeness (% non-empty cells)
    const totalCells = dataset.rowCount * dataset.columnCount
    const nonEmptyCells = dataset.rows.flat().filter(v =>
        v !== null && v !== undefined && v !== ''
    ).length
    const dataCompleteness = totalCells > 0 ? nonEmptyCells / totalCells : 0

    if (dataCompleteness < 0.7) {
        issues.push(`Low data completeness: ${(dataCompleteness * 100).toFixed(0)}%`)
    }

    // 3. Header Clarity (distinct, non-empty headers)
    const nonEmptyHeaders = dataset.headers.filter(h => h && h.trim() !== '')
    const uniqueHeaders = new Set(nonEmptyHeaders)
    const headerClarity = dataset.headers.length > 0
        ? uniqueHeaders.size / dataset.headers.length
        : 0

    if (headerClarity < 1.0) {
        issues.push('Duplicate or empty column headers detected')
    }

    // 4. Type Consistency (consistent data types per column)
    const typeConsistency = calculateTypeConsistency(dataset)

    if (typeConsistency < 0.8) {
        issues.push('Inconsistent data types within columns')
    }

    // 5. Overall Confidence (weighted average)
    const overallConfidence = (
        structuralIntegrity * 0.3 +
        dataCompleteness * 0.3 +
        headerClarity * 0.2 +
        typeConsistency * 0.2
    )

    console.log('[QUALITY] Assessment:', {
        structuralIntegrity: structuralIntegrity.toFixed(2),
        dataCompleteness: dataCompleteness.toFixed(2),
        headerClarity: headerClarity.toFixed(2),
        typeConsistency: typeConsistency.toFixed(2),
        overallConfidence: overallConfidence.toFixed(2),
        issues: issues.length
    })

    return {
        structuralIntegrity,
        dataCompleteness,
        headerClarity,
        typeConsistency,
        overallConfidence,
        issues
    }
}

/**
 * Calculate structural integrity score
 */
function calculateStructuralScore(
    columnCounts: number[],
    expectedCount: number
): number {
    const correctCount = columnCounts.filter(c => c === expectedCount).length
    return correctCount / columnCounts.length
}

/**
 * Calculate type consistency per column
 */
function calculateTypeConsistency(dataset: ParsedDataset): number {
    if (dataset.rows.length === 0) return 0

    const columnScores: number[] = []

    for (let colIdx = 0; colIdx < dataset.columnCount; colIdx++) {
        const columnValues = dataset.rows
            .map(row => row[colIdx])
            .filter(v => v !== null && v !== undefined && v !== '')

        if (columnValues.length === 0) {
            columnScores.push(0)
            continue
        }

        // Detect dominant type
        const types = columnValues.map(v => typeof v)
        const typeCounts = new Map<string, number>()

        types.forEach(t => {
            typeCounts.set(t, (typeCounts.get(t) || 0) + 1)
        })

        const maxCount = Math.max(...typeCounts.values())
        const consistency = maxCount / columnValues.length

        columnScores.push(consistency)
    }

    return columnScores.reduce((sum, score) => sum + score, 0) / columnScores.length
}

/**
 * Determine if extraction is safe for fairness analysis
 * 
 * Based on confidence thresholds from config
 */
export function shouldProceedWithFairness(
    confidence: number,
    quality: QualityAssessment
): boolean {
    const { confidenceThresholds } = BIAS_CONFIG

    // High confidence → Proceed
    if (confidence >= confidenceThresholds.high) {
        console.log('[QUALITY] High confidence - safe for fairness analysis')
        return true
    }

    // Medium confidence → Proceed with warnings
    if (confidence >= confidenceThresholds.medium) {
        console.warn('[QUALITY] Medium confidence - proceeding with warnings')
        return true
    }

    // Low confidence → INCONCLUSIVE
    console.warn('[QUALITY] Low confidence - NOT safe for fairness analysis')
    return false
}

/**
 * Generate warnings based on quality assessment
 */
export function generateQualityWarnings(
    quality: QualityAssessment,
    confidence: number
): string[] {
    const warnings: string[] = []

    if (confidence < BIAS_CONFIG.confidenceThresholds.high) {
        warnings.push(`Extraction confidence: ${(confidence * 100).toFixed(0)}% (below high threshold)`)
    }

    if (quality.structuralIntegrity < 1.0) {
        warnings.push('Some rows have inconsistent column counts')
    }

    if (quality.dataCompleteness < 0.8) {
        warnings.push('Dataset contains significant missing data')
    }

    if (quality.headerClarity < 1.0) {
        warnings.push('Some column headers are duplicate or empty')
    }

    if (quality.typeConsistency < 0.9) {
        warnings.push('Some columns have inconsistent data types')
    }

    warnings.push(...quality.issues)

    return warnings
}
