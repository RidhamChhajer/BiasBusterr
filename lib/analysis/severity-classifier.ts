/**
 * Severity Classification Engine (Phase 1 - Core Logic)
 * 
 * Converts bias metrics into severity levels using explicit thresholds
 * 
 * CRITICAL RULES:
 * - Severity MUST be decided ONLY from metrics - NEVER from AI
 * - Use explicit, configurable thresholds
 * - Handle sparse/unstable data → INCONCLUSIVE
 * - Strong outcome flips increase severity
 * - Consistent impact increases severity
 */

import type { BiasMetrics, SeverityLevel, SeverityResult, SeverityConfig } from './types'
import { BIAS_CONFIG } from './config'

/**
 * Classify bias severity from metrics
 * 
 * @param metrics - Computed bias metrics
 * @param config - Optional severity configuration (uses defaults if not provided)
 * @returns Severity result with level and reasoning
 */
export function classifySeverity(
    metrics: BiasMetrics,
    config?: SeverityConfig
): SeverityResult {
    console.log('[SEVERITY] Classifying severity...')

    // Use provided config or defaults
    const severityConfig: SeverityConfig = config || {
        lowThreshold: BIAS_CONFIG.lowThreshold,
        mediumThreshold: BIAS_CONFIG.mediumThreshold,
        minSampleSize: BIAS_CONFIG.minSampleSize,
        requireConsistency: false
    }

    const reasoning: string[] = []

    // Check for insufficient data (INCONCLUSIVE)
    if (metrics.totalGroups < severityConfig.minSampleSize) {
        console.log('[SEVERITY] → INCONCLUSIVE (insufficient data)')

        return {
            level: 'INCONCLUSIVE',
            biasRatio: metrics.biasRatio,
            reasoning: [
                `Insufficient comparable groups (${metrics.totalGroups} < ${severityConfig.minSampleSize})`,
                'Cannot reliably assess bias with sparse data'
            ],
            confidence: 0
        }
    }

    // Check for no bias detected
    if (metrics.biasedGroups === 0) {
        console.log('[SEVERITY] → LOW (no bias detected)')

        return {
            level: 'LOW',
            biasRatio: 0,
            reasoning: [
                'No outcome disparities detected in comparable groups',
                'All groups show consistent outcomes across sensitive attributes'
            ],
            confidence: 1.0
        }
    }

    // Apply threshold-based classification
    let baseSeverity: SeverityLevel = applyThresholds(
        metrics.biasRatio,
        severityConfig
    )

    reasoning.push(`Bias ratio: ${(metrics.biasRatio * 100).toFixed(1)}%`)
    reasoning.push(`Affected groups: ${metrics.biasedGroups} of ${metrics.totalGroups}`)

    // Adjust for strong outcome flips (high magnitude)
    if (metrics.averageMagnitude >= 0.5) {
        // Very strong disparities (e.g., 80% vs 30% = 50% difference)
        if (baseSeverity === 'LOW') {
            baseSeverity = 'MEDIUM'
            reasoning.push('Upgraded to MEDIUM due to strong outcome disparities')
        } else if (baseSeverity === 'MEDIUM') {
            baseSeverity = 'HIGH'
            reasoning.push('Upgraded to HIGH due to very strong outcome disparities')
        }

        reasoning.push(`Average disparity magnitude: ${(metrics.averageMagnitude * 100).toFixed(1)}%`)
    }

    // Adjust for consistency (same groups repeatedly affected)
    if (metrics.consistencyScore >= 0.7) {
        // High consistency = systematic bias pattern
        if (baseSeverity === 'LOW') {
            baseSeverity = 'MEDIUM'
            reasoning.push('Upgraded to MEDIUM due to consistent bias pattern')
        } else if (baseSeverity === 'MEDIUM') {
            baseSeverity = 'HIGH'
            reasoning.push('Upgraded to HIGH due to highly consistent bias pattern')
        }

        reasoning.push(`Consistency score: ${(metrics.consistencyScore * 100).toFixed(1)}%`)
    }

    // Calculate confidence based on sample size and consistency
    const confidence = calculateConfidence(metrics, severityConfig)

    console.log('[SEVERITY] ✅ Classified as:', baseSeverity)
    console.log('[SEVERITY] Confidence:', confidence.toFixed(2))

    return {
        level: baseSeverity,
        biasRatio: metrics.biasRatio,
        reasoning,
        confidence
    }
}

/**
 * Apply threshold-based classification
 * 
 * Uses user-approved thresholds:
 * - LOW: < 10%
 * - MEDIUM: 10-30%
 * - HIGH: > 30%
 */
export function applyThresholds(
    biasRatio: number,
    config: SeverityConfig
): SeverityLevel {
    if (biasRatio < config.lowThreshold) {
        return 'LOW'
    } else if (biasRatio <= config.mediumThreshold) {
        return 'MEDIUM'
    } else {
        return 'HIGH'
    }
}

/**
 * Adjust severity for consistency
 * 
 * Consistent impact on same sensitive groups increases severity
 */
export function adjustForConsistency(
    baseSeverity: SeverityLevel,
    metrics: BiasMetrics
): SeverityLevel {
    // High consistency (>0.7) can upgrade severity
    if (metrics.consistencyScore >= 0.7) {
        if (baseSeverity === 'LOW') {
            return 'MEDIUM'
        } else if (baseSeverity === 'MEDIUM') {
            return 'HIGH'
        }
    }

    return baseSeverity
}

/**
 * Calculate confidence in severity classification
 * 
 * Based on:
 * - Sample size (more groups = higher confidence)
 * - Consistency (consistent patterns = higher confidence)
 * - Magnitude (strong disparities = higher confidence)
 */
function calculateConfidence(
    metrics: BiasMetrics,
    config: SeverityConfig
): number {
    // Sample size factor (0-1)
    const sampleSizeFactor = Math.min(1, metrics.totalGroups / (config.minSampleSize * 5))

    // Consistency factor (0-1)
    const consistencyFactor = metrics.consistencyScore

    // Magnitude factor (0-1)
    const magnitudeFactor = Math.min(1, metrics.averageMagnitude * 2)

    // Weighted average
    let confidence = (
        sampleSizeFactor * 0.4 +
        consistencyFactor * 0.3 +
        magnitudeFactor * 0.3
    )

    // Reduce confidence for higher epsilon (relaxed grouping)
    if (metrics.groupingMetadata) {
        const epsilonPenalty = metrics.groupingMetadata.epsilon_used * 0.3
        confidence *= (1 - Math.min(epsilonPenalty, 0.3))  // Max 30% reduction

        console.log(`[SEVERITY] Epsilon penalty: ${(epsilonPenalty * 100).toFixed(1)}% (epsilon=${metrics.groupingMetadata.epsilon_used.toFixed(2)})`)
    }

    return Math.max(0, Math.min(1, confidence))
}

/**
 * Check if data is too sparse for reliable classification
 */
export function isSparseData(
    totalGroups: number,
    minSampleSize: number
): boolean {
    return totalGroups < minSampleSize
}
