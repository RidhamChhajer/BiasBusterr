/**
 * Explanation Templates (Phase 3)
 * 
 * Provides deterministic fallback explanations when OpenAI fails
 * 
 * CRITICAL RULES:
 * - Templates explain Phase 1 results only
 * - NO decision-making or reinterpretation
 * - Neutral, factual tone
 * - Metrics interpolated directly from Phase 1
 */

import type { Phase1BiasResult } from './bias-detector-phase1'

export interface ExplanationResult {
    summary: string
    details: string[]
    examples?: string[]
    limitations: string[]
    source: 'ai' | 'fallback'
}

/**
 * Generate fallback explanation from Phase 1 results
 * 
 * Used when OpenAI fails or is unavailable
 */
export function generateFallbackExplanation(
    biasResult: Phase1BiasResult
): ExplanationResult {
    const { severity, metrics, affected_sensitive_attributes, reasoning } = biasResult

    switch (severity) {
        case 'HIGH':
            return generateHighSeverityExplanation(biasResult)

        case 'MEDIUM':
            return generateMediumSeverityExplanation(biasResult)

        case 'LOW':
            return generateLowSeverityExplanation(biasResult)

        case 'INCONCLUSIVE':
            return generateInconclusiveExplanation(biasResult)

        default:
            return generateDefaultExplanation(biasResult)
    }
}

/**
 * HIGH severity explanation
 */
function generateHighSeverityExplanation(result: Phase1BiasResult): ExplanationResult {
    const { metrics, affected_sensitive_attributes } = result
    const biasRatioPercent = (metrics.bias_ratio * 100).toFixed(1)
    const magnitudePercent = (metrics.average_magnitude * 100).toFixed(1)
    const attributeList = affected_sensitive_attributes.join(', ')

    return {
        summary: `The analysis detected a HIGH level of bias. Out of ${metrics.total_groups} comparable groups analyzed, ${metrics.biased_groups} groups (${biasRatioPercent}%) showed significant outcome disparities associated with ${attributeList || 'sensitive attributes'}.`,

        details: [
            `Analyzed ${metrics.total_groups} groups of records with similar merit attributes`,
            `Found ${metrics.biased_groups} groups with meaningful outcome differences (≥10% disparity)`,
            `Bias ratio: ${biasRatioPercent}% of groups affected`,
            `Average disparity magnitude: ${magnitudePercent}%`,
            `Affected attributes: ${attributeList || 'sensitive attributes'}`
        ],

        limitations: [
            'Results are based on the provided dataset only',
            'Analysis assumes column roles are correctly assigned',
            'Actual bias patterns may differ in the broader population',
            'This is a statistical analysis, not a legal determination'
        ],

        source: 'fallback'
    }
}

/**
 * MEDIUM severity explanation
 */
function generateMediumSeverityExplanation(result: Phase1BiasResult): ExplanationResult {
    const { metrics, affected_sensitive_attributes } = result
    const biasRatioPercent = (metrics.bias_ratio * 100).toFixed(1)
    const magnitudePercent = (metrics.average_magnitude * 100).toFixed(1)
    const attributeList = affected_sensitive_attributes.join(', ')

    return {
        summary: `The analysis detected a MEDIUM level of bias. Out of ${metrics.total_groups} comparable groups analyzed, ${metrics.biased_groups} groups (${biasRatioPercent}%) showed outcome disparities associated with ${attributeList || 'sensitive attributes'}.`,

        details: [
            `Analyzed ${metrics.total_groups} groups of records with similar merit attributes`,
            `Found ${metrics.biased_groups} groups with outcome differences (≥10% disparity)`,
            `Bias ratio: ${biasRatioPercent}% of groups affected`,
            `Average disparity magnitude: ${magnitudePercent}%`,
            `Affected attributes: ${attributeList || 'sensitive attributes'}`
        ],

        limitations: [
            'Results are based on the provided dataset only',
            'Analysis assumes column roles are correctly assigned',
            'Medium-level bias may warrant further investigation',
            'This is a statistical analysis, not a legal determination'
        ],

        source: 'fallback'
    }
}

/**
 * LOW severity explanation
 */
function generateLowSeverityExplanation(result: Phase1BiasResult): ExplanationResult {
    const { metrics } = result
    const biasRatioPercent = (metrics.bias_ratio * 100).toFixed(1)

    return {
        summary: `The analysis detected a LOW level of bias or no significant bias. Out of ${metrics.total_groups} comparable groups analyzed, ${metrics.biased_groups} groups (${biasRatioPercent}%) showed outcome disparities.`,

        details: [
            `Analyzed ${metrics.total_groups} groups of records with similar merit attributes`,
            `Found ${metrics.biased_groups} groups with outcome differences (≥10% disparity)`,
            `Bias ratio: ${biasRatioPercent}% of groups affected`,
            'Most groups showed consistent outcomes across sensitive attributes'
        ],

        limitations: [
            'Results are based on the provided dataset only',
            'Low bias does not guarantee complete fairness',
            'Analysis is limited to detectable statistical patterns',
            'This is a statistical analysis, not a legal determination'
        ],

        source: 'fallback'
    }
}

/**
 * INCONCLUSIVE explanation
 */
function generateInconclusiveExplanation(result: Phase1BiasResult): ExplanationResult {
    const { reasoning } = result
    const primaryReason = reasoning[0] || 'Unable to complete analysis'

    return {
        summary: `The analysis could not reach a conclusion. ${primaryReason}`,

        details: reasoning.length > 1 ? reasoning.slice(1) : [
            'Insufficient data for reliable bias detection',
            'Please review the dataset and column role assignments'
        ],

        limitations: [
            'Analysis requires adequate sample size for reliable results',
            'Column roles must be correctly assigned',
            'Dataset must contain comparable groups for analysis',
            'Please address the issues mentioned and try again'
        ],

        source: 'fallback'
    }
}

/**
 * Default explanation (fallback for unexpected cases)
 */
function generateDefaultExplanation(result: Phase1BiasResult): ExplanationResult {
    return {
        summary: 'The analysis completed but could not determine a clear severity level.',

        details: [
            'Please review the analysis parameters',
            'Ensure column roles are correctly assigned',
            'Verify dataset quality and completeness'
        ],

        limitations: [
            'Results may be unreliable',
            'Please contact support if this issue persists'
        ],

        source: 'fallback'
    }
}
