/**
 * Outcome Comparison Engine (Phase 1 - Core Logic) - FIXED
 * 
 * Detects outcome differences within comparable groups
 * 
 * CRITICAL RULES:
 * - Compare outcomes across different sensitive attribute values
 * - Ignore trivial differences
 * - Detect meaningful disparities (e.g., approval vs rejection, large rate gaps)
 * - NO AI judgment - pure statistical comparison
 */

import type { ComparableGroup, DisparityReport, DisparityEvidence, GroupRecord } from './types'
import { getRecordsBySensitiveValue } from './fairness-grouping'

/**
 * Detect outcome disparities in comparable groups
 * 
 * @param groups - Comparable groups from fairness grouping
 * @returns Array of disparity reports
 */
export function detectOutcomeDisparities(groups: ComparableGroup[]): DisparityReport[] {
    console.log('[OUTCOME COMPARISON] Analyzing', groups.length, 'groups...')

    const reports: DisparityReport[] = []

    for (const group of groups) {
        const report = analyzeGroup(group)

        if (report.hasBias) {
            reports.push(report)
        }
    }

    console.log('[OUTCOME COMPARISON] ✅ Found', reports.length, 'groups with disparities')

    return reports
}

/**
 * Analyze a single group for outcome disparities
 */
function analyzeGroup(group: ComparableGroup): DisparityReport {
    const evidence: DisparityEvidence[] = []
    const affectedSensitiveAttributes: string[] = []

    // Analyze each sensitive attribute
    for (const [attrName, outcomeMap] of group.outcomeDistribution.bySensitiveAttribute.entries()) {
        const attrEvidence = analyzeAttributeDisparities(
            group,
            attrName,
            outcomeMap
        )

        if (attrEvidence.length > 0) {
            evidence.push(...attrEvidence)
            affectedSensitiveAttributes.push(attrName)
        }
    }

    return {
        groupKey: group.groupKey,
        hasBias: evidence.length > 0,
        affectedSensitiveAttributes,
        evidence
    }
}

/**
 * Analyze disparities for a specific sensitive attribute
 */
function analyzeAttributeDisparities(
    group: ComparableGroup,
    sensitiveAttribute: string,
    outcomeMap: Map<any, number>
): DisparityEvidence[] {
    const evidence: DisparityEvidence[] = []

    // Get unique sensitive values
    const sensitiveValues = Array.from(outcomeMap.keys())

    // Need at least 2 different values to compare
    if (sensitiveValues.length < 2) {
        return []
    }

    // Compare each pair of sensitive values
    for (let i = 0; i < sensitiveValues.length; i++) {
        for (let j = i + 1; j < sensitiveValues.length; j++) {
            const value1 = sensitiveValues[i]
            const value2 = sensitiveValues[j]

            // Get records for each value
            const records1 = getRecordsBySensitiveValue(group.records, sensitiveAttribute, value1)
            const records2 = getRecordsBySensitiveValue(group.records, sensitiveAttribute, value2)

            console.log(`[OUTCOME] Comparing ${sensitiveAttribute}: ${value1} (n=${records1.length}) vs ${value2} (n=${records2.length})`)

            // Skip if no records for either value
            // Changed from requiring 2+ records to requiring 1+ record
            // This allows bias detection in smaller datasets
            if (records1.length < 1 || records2.length < 1) {
                console.log(`[OUTCOME] ✗ Skipped - insufficient records`)
                continue
            }

            // Compute outcome rates for POSITIVE outcomes
            const result1 = computeOutcomeRates(records1, records2)
            const result2 = computeOutcomeRates(records2, records1)

            // Use the positive outcome rate from result1
            const outcomeRate1 = result1.positiveRate
            const outcomeRate2 = result2.positiveRate

            // Compute disparity magnitude
            const magnitude = Math.abs(outcomeRate1 - outcomeRate2)

            console.log(`[OUTCOME]   Rates: ${(outcomeRate1 * 100).toFixed(1)}% vs ${(outcomeRate2 * 100).toFixed(1)}%, magnitude: ${(magnitude * 100).toFixed(1)}%`)

            // Check if disparity is meaningful (>10% difference)
            const MEANINGFUL_THRESHOLD = 0.10

            if (magnitude >= MEANINGFUL_THRESHOLD) {
                console.log(`[OUTCOME] ✓ Disparity detected! (≥${(MEANINGFUL_THRESHOLD * 100).toFixed(0)}% threshold)`)
                // Found meaningful disparity
                evidence.push({
                    sensitiveAttribute,
                    sensitiveValue: value1,
                    outcomeRate: outcomeRate1,
                    comparisonOutcomeRate: outcomeRate2,
                    magnitude,
                    sampleSize: records1.length
                })

                // Also add the comparison value
                evidence.push({
                    sensitiveAttribute,
                    sensitiveValue: value2,
                    outcomeRate: outcomeRate2,
                    comparisonOutcomeRate: outcomeRate1,
                    magnitude,
                    sampleSize: records2.length
                })
            } else {
                console.log(`[OUTCOME] ✗ Below threshold (need ≥${(MEANINGFUL_THRESHOLD * 100).toFixed(0)}%)`)
            }
        }
    }

    return evidence
}

/**
 * Compute outcome rates - FIXED VERSION
 * 
 * Compares outcomes across ALL records in both groups to identify positive outcome
 */
function computeOutcomeRates(
    records1: GroupRecord[],
    records2: GroupRecord[]
): { positiveRate: number; positiveOutcome: any } {
    if (records1.length === 0) {
        return { positiveRate: 0, positiveOutcome: null }
    }

    // Collect ALL outcomes from both groups to determine what's "positive"
    const allOutcomes = new Set<any>()
    const outcomeCounts1 = new Map<any, number>()

    for (const record of records1) {
        allOutcomes.add(record.outcome)
        outcomeCounts1.set(record.outcome, (outcomeCounts1.get(record.outcome) || 0) + 1)
    }

    for (const record of records2) {
        allOutcomes.add(record.outcome)
    }

    const uniqueOutcomes = Array.from(allOutcomes)

    // Detect positive outcome
    const positiveOutcome = detectPositiveOutcome(uniqueOutcomes)

    // Calculate rate of positive outcome in records1
    const positiveCount = outcomeCounts1.get(positiveOutcome) || 0
    const positiveRate = positiveCount / records1.length

    return { positiveRate, positiveOutcome }
}

/**
 * Detect which outcome is "positive" in binary classification
 * 
 * Returns the first outcome if cannot determine
 */
function detectPositiveOutcome(outcomes: any[]): any {
    const positiveKeywords = [
        '1', 'true', 'yes', 'y',
        'selected', 'hired', 'approved', 'accepted',
        'admitted', 'enrolled', 'passed', 'success'
    ]

    for (const outcome of outcomes) {
        const outcomeStr = String(outcome).toLowerCase()

        // Check for exact matches
        if (positiveKeywords.includes(outcomeStr)) {
            return outcome
        }

        // Check for numeric 1
        if (outcome === 1 || outcome === '1') {
            return outcome
        }

        // Check for boolean true
        if (outcome === true) {
            return outcome
        }
    }

    // Cannot determine - return first outcome as default
    return outcomes[0]
}

/**
 * Measure overall disparity magnitude for a group
 */
export function measureDisparityMagnitude(group: ComparableGroup): number {
    const disparities: number[] = []

    for (const [attrName, outcomeMap] of group.outcomeDistribution.bySensitiveAttribute.entries()) {
        const evidence = analyzeAttributeDisparities(group, attrName, outcomeMap)

        for (const ev of evidence) {
            disparities.push(ev.magnitude)
        }
    }

    if (disparities.length === 0) {
        return 0
    }

    // Return average magnitude
    const sum = disparities.reduce((acc, val) => acc + val, 0)
    return sum / disparities.length
}
