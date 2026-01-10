/**
 * Bias Metrics Calculator (Phase 1 - Core Logic)
 * 
 * Converts disparities into measurable evidence
 * 
 * CRITICAL RULES:
 * - Pure statistical computation
 * - NO AI judgment
 * - Metrics are the foundation for severity classification
 */

import type { DisparityReport, BiasMetrics, AggregatedEvidence, DisparityEvidence } from './types'

/**
 * Compute bias metrics from disparity reports
 * 
 * @param disparities - Array of disparity reports from outcome comparison
 * @param totalGroups - Total number of comparable groups analyzed
 * @returns Bias metrics
 */
export function computeBiasMetrics(
    disparities: DisparityReport[],
    totalGroups: number
): BiasMetrics {
    console.log('[METRICS] Computing bias metrics...')
    console.log('[METRICS] Total groups:', totalGroups)
    console.log('[METRICS] Groups with disparities:', disparities.length)

    // Count biased groups
    const biasedGroups = disparities.length

    // Calculate bias ratio
    const biasRatio = totalGroups > 0 ? biasedGroups / totalGroups : 0

    // Calculate average disparity magnitude
    const allMagnitudes: number[] = []
    for (const report of disparities) {
        for (const evidence of report.evidence) {
            allMagnitudes.push(evidence.magnitude)
        }
    }

    const averageMagnitude = allMagnitudes.length > 0
        ? allMagnitudes.reduce((sum, val) => sum + val, 0) / allMagnitudes.length
        : 0

    // Calculate frequency by sensitive attribute
    const frequencyBySensitiveAttribute = new Map<string, number>()

    for (const report of disparities) {
        for (const attrName of report.affectedSensitiveAttributes) {
            const current = frequencyBySensitiveAttribute.get(attrName) || 0
            frequencyBySensitiveAttribute.set(attrName, current + 1)
        }
    }

    // Calculate consistency score
    // Consistency = how often the same sensitive attributes are affected
    const consistencyScore = calculateConsistencyScore(
        frequencyBySensitiveAttribute,
        biasedGroups
    )

    const metrics: BiasMetrics = {
        totalGroups,
        biasedGroups,
        biasRatio,
        averageMagnitude,
        frequencyBySensitiveAttribute,
        consistencyScore
    }

    console.log('[METRICS] ✅ Metrics computed:', {
        biasRatio: biasRatio.toFixed(3),
        averageMagnitude: averageMagnitude.toFixed(3),
        consistencyScore: consistencyScore.toFixed(3)
    })

    return metrics
}

/**
 * Calculate consistency score
 * 
 * Measures how consistently the same sensitive attributes are affected
 * Higher score = more consistent bias pattern
 */
function calculateConsistencyScore(
    frequencyMap: Map<string, number>,
    totalBiasedGroups: number
): number {
    if (totalBiasedGroups === 0 || frequencyMap.size === 0) {
        return 0
    }

    // Get frequencies as array
    const frequencies = Array.from(frequencyMap.values())

    // Calculate variance in frequencies
    const mean = frequencies.reduce((sum, val) => sum + val, 0) / frequencies.length
    const variance = frequencies.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / frequencies.length
    const stdDev = Math.sqrt(variance)

    // Consistency score: inverse of coefficient of variation
    // High consistency = low variation in how often attributes are affected
    if (mean === 0) {
        return 0
    }

    const coefficientOfVariation = stdDev / mean

    // Normalize to 0-1 range (lower CV = higher consistency)
    const consistencyScore = Math.max(0, Math.min(1, 1 - coefficientOfVariation))

    return consistencyScore
}

/**
 * Aggregate evidence for reporting
 * 
 * Identifies strongest disparities and affected attributes
 */
export function aggregateEvidence(disparities: DisparityReport[]): AggregatedEvidence {
    console.log('[METRICS] Aggregating evidence...')

    // Collect all evidence
    const allEvidence: DisparityEvidence[] = []
    const affectedAttributesSet = new Set<string>()
    let totalRecordsAffected = 0

    for (const report of disparities) {
        allEvidence.push(...report.evidence)

        for (const attrName of report.affectedSensitiveAttributes) {
            affectedAttributesSet.add(attrName)
        }

        // Count unique records affected (by row index)
        const uniqueRecords = new Set<number>()
        for (const evidence of report.evidence) {
            uniqueRecords.add(evidence.sampleSize)
        }
        totalRecordsAffected += uniqueRecords.size
    }

    // Sort evidence by magnitude (strongest first)
    const sortedEvidence = [...allEvidence].sort((a, b) => b.magnitude - a.magnitude)

    // Take top 10 strongest disparities
    const strongestDisparities = sortedEvidence.slice(0, 10)

    const aggregated: AggregatedEvidence = {
        strongestDisparities,
        affectedAttributes: Array.from(affectedAttributesSet),
        totalRecordsAffected
    }

    console.log('[METRICS] ✅ Evidence aggregated:', {
        strongestDisparities: strongestDisparities.length,
        affectedAttributes: aggregated.affectedAttributes.length,
        totalRecordsAffected
    })

    return aggregated
}

/**
 * Calculate bias ratio
 * 
 * Simple helper function for clarity
 */
export function calculateBiasRatio(totalGroups: number, biasedGroups: number): number {
    return totalGroups > 0 ? biasedGroups / totalGroups : 0
}
