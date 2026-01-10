/**
 * Merit Normalization Module
 * 
 * PURPOSE:
 * Normalize merit columns for distance-based similarity grouping
 * 
 * RULES:
 * - Numeric columns: z-score normalization
 * - Categorical columns: exact-match encoding (non-ordinal)
 * - ALL merit columns MUST be normalized
 * - Normalization parameters MUST be stored for audit
 */

import type { ParsedDataset, Phase1Roles } from './types'

export interface NormalizationParams {
    column: string
    type: 'numeric' | 'categorical'
    method: 'z-score' | 'exact'
    mean?: number
    stddev?: number
}

export interface NormalizedDataset {
    normalizedRows: number[][]   // Numeric matrix
    params: NormalizationParams[]
    originalHeaders: string[]
}

/**
 * Normalize all merit columns for distance calculation
 * 
 * @param dataset - Parsed dataset
 * @param roles - Column role assignments
 * @returns Normalized dataset with parameters
 */
export function normalizeMeritColumns(
    dataset: ParsedDataset,
    roles: Phase1Roles
): NormalizedDataset {
    console.log('[NORMALIZER] Starting merit normalization...')

    // Extract merit columns only
    const meritColumns = Object.entries(roles)
        .filter(([_, role]) => role === 'merit')
        .map(([col]) => col)

    console.log('[NORMALIZER] Merit columns:', meritColumns)

    const params: NormalizationParams[] = []
    const normalizedData: number[][] = []

    meritColumns.forEach(col => {
        const colIndex = dataset.headers.indexOf(col)
        const values = dataset.rows.map(row => row[colIndex])

        // Determine if numeric or categorical
        const isNumeric = values.every(v => v !== null && v !== '' && !isNaN(Number(v)))

        if (isNumeric) {
            // Z-score normalization: (x - mean) / stddev
            const numericValues = values.map(Number)
            const mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length
            const variance =
                numericValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
                numericValues.length
            const stddev = Math.sqrt(variance)

            const normalized = numericValues.map(v =>
                stddev > 0 ? (v - mean) / stddev : 0
            )

            console.log(`[NORMALIZER]   ${col}: numeric (mean=${mean.toFixed(2)}, stddev=${stddev.toFixed(2)})`)

            params.push({
                column: col,
                type: 'numeric',
                method: 'z-score',
                mean,
                stddev
            })
            normalizedData.push(normalized)
        } else {
            // Categorical: encode as numeric identifiers (non-ordinal)
            const uniqueVals = Array.from(new Set(values))
            const codeMap = new Map(uniqueVals.map((v, i) => [v, i]))
            const codes = values.map(v => codeMap.get(v) ?? 0)

            console.log(`[NORMALIZER]   ${col}: categorical (${uniqueVals.length} unique values)`)

            params.push({
                column: col,
                type: 'categorical',
                method: 'exact'
            })
            normalizedData.push(codes)
        }
    })

    // Transpose: columns × rows → rows × columns
    const rowCount = dataset.rows.length
    const normalizedRows = Array(rowCount)
        .fill(0)
        .map((_, rowIdx) => normalizedData.map(col => col[rowIdx]))

    console.log('[NORMALIZER] ✅ Normalized', normalizedRows.length, 'rows ×', normalizedData.length, 'merit columns')

    return {
        normalizedRows,
        params,
        originalHeaders: meritColumns
    }
}
