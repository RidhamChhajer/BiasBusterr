/**
 * Distance Calculator Module
 * 
 * PURPOSE:
 * Compute pairwise distances between normalized merit vectors
 * 
 * RULES:
 * - Use L1 (Manhattan) distance for numeric dimensions
 * - Use binary distance (0/1) for categorical dimensions
 * - Normalize final distance by number of dimensions
 * - Distance matrix MUST be symmetric
 */

import type { NormalizationParams, NormalizedDataset } from './merit-normalizer'

export interface DistanceMatrix {
    matrix: number[][]  // [i][j] = normalized distance between row i and row j
    rowCount: number
}

/**
 * Calculate pairwise distance matrix for all records
 * 
 * Complexity: O(n²) - acceptable for correctness
 * 
 * @param normalized - Normalized dataset
 * @returns Distance matrix
 */
export function calculateDistanceMatrix(
    normalized: NormalizedDataset
): DistanceMatrix {
    console.log('[DISTANCE] Calculating pairwise distance matrix...')

    const n = normalized.normalizedRows.length
    const matrix = Array(n)
        .fill(0)
        .map(() => Array(n).fill(0))

    let comparisons = 0

    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const rawDistance = calculateDistance(
                normalized.normalizedRows[i],
                normalized.normalizedRows[j],
                normalized.params
            )

            // CRITICAL: Normalize distance by number of merit dimensions
            // This makes epsilon threshold dimension-independent
            const normalizedDistance = rawDistance / normalized.params.length

            matrix[i][j] = normalizedDistance
            matrix[j][i] = normalizedDistance  // Symmetric

            comparisons++
        }
    }

    console.log(`[DISTANCE] ✅ Computed ${comparisons} pairwise distances (${n} × ${n} matrix)`)

    return { matrix, rowCount: n }
}

/**
 * Calculate distance between two normalized rows
 * 
 * @param rowA - First normalized row
 * @param rowB - Second normalized row
 * @param params - Normalization parameters
 * @returns Raw distance (before dimension normalization)
 */
function calculateDistance(
    rowA: number[],
    rowB: number[],
    params: NormalizationParams[]
): number {
    let totalDistance = 0

    for (let i = 0; i < rowA.length; i++) {
        const param = params[i]

        if (param.type === 'numeric') {
            // L1 (Manhattan) distance for normalized numerics
            totalDistance += Math.abs(rowA[i] - rowB[i])
        } else {
            // Binary distance for categoricals: 0 if equal, 1 if different
            totalDistance += rowA[i] === rowB[i] ? 0 : 1
        }
    }

    return totalDistance
}
