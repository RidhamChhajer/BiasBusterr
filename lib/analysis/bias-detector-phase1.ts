/**
 * Phase 1 Core Bias Detector
 * 
 * Pure logic-driven bias detection engine
 * 
 * PHASE 1 CONSTRAINTS (STRICTLY ENFORCED):
 * - NO OpenAI usage
 * - NO role confirmation workflows
 * - NO API changes
 * - NO UI modifications
 * - NO Vision/OCR
 * - NO explanations
 * 
 * INPUT ASSUMPTIONS:
 * - Structured dataset (already parsed)
 * - Column roles already provided (assumed correct and trusted)
 * 
 * OUTPUT:
 * - Pure logic result with metrics and severity
 * - NO human-readable explanations
 */

import type { ParsedDataset, ColumnRole } from './types'
import { createComparableGroups } from './fairness-grouping'
import { detectOutcomeDisparities } from './outcome-comparison'
import { computeBiasMetrics, aggregateEvidence } from './bias-metrics'
import { classifySeverity } from './severity-classifier'

/**
 * Phase 1 Bias Detection Result
 * 
 * Pure logic output - no explanations
 */
export interface Phase1BiasResult {
    bias_detected: boolean | 'inconclusive'
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'INCONCLUSIVE'
    metrics: {
        total_groups: number
        biased_groups: number
        bias_ratio: number
        average_magnitude: number
        consistency_score: number
    }
    affected_sensitive_attributes: string[]
    reasoning: string[]  // Technical reasoning, not user-facing
    confidence: number
}

/**
 * Detect bias in structured dataset (Phase 1 - Core Logic Only)
 * 
 * @param dataset - Parsed structured dataset
 * @param roles - Column role assignments (assumed correct in Phase 1)
 * @returns Pure logic result
 */
export function detectBiasPhase1(
    dataset: ParsedDataset,
    roles: ColumnRole[]
): Phase1BiasResult {
    console.log('='.repeat(60))
    console.log('[PHASE 1 BIAS DETECTION] Starting core logic analysis...')
    console.log('[PHASE 1] Dataset:', dataset.rowCount, 'rows x', dataset.columnCount, 'columns')
    console.log('[PHASE 1] Roles:', roles.map(r => `${r.columnName}:${r.role}`).join(', '))
    console.log('='.repeat(60))

    // Validate inputs
    if (!dataset || !dataset.rows || dataset.rows.length === 0) {
        console.error('[PHASE 1] ❌ Invalid dataset')
        return createInconclusiveResult('Invalid or empty dataset')
    }

    if (!roles || roles.length === 0) {
        console.error('[PHASE 1] ❌ No column roles provided')
        return createInconclusiveResult('No column roles provided')
    }

    // Validate required roles
    const hasOutcome = roles.some(r => r.role === 'outcome')
    const hasMerit = roles.some(r => r.role === 'merit')

    if (!hasOutcome) {
        console.error('[PHASE 1] ❌ No outcome column specified')
        return createInconclusiveResult('No outcome column specified')
    }

    if (!hasMerit) {
        console.error('[PHASE 1] ❌ No merit columns specified')
        return createInconclusiveResult('No merit columns specified')
    }

    try {
        // STEP 1: Fairness Grouping
        console.log('\n[PHASE 1] STEP 1: Creating comparable groups...')
        const { groups, metadata: groupingMetadata } = createComparableGroups(dataset, roles)

        if (groups.length === 0) {
            console.warn('[PHASE 1] ⚠️ No comparable groups created')
            return createInconclusiveResult('No comparable groups could be created')
        }

        // STEP 2: Outcome Comparison
        console.log('\n[PHASE 1] STEP 2: Detecting outcome disparities...')
        const disparities = detectOutcomeDisparities(groups)

        // STEP 3: Compute Metrics
        console.log('\n[PHASE 1] STEP 3: Computing bias metrics...')
        const metrics = computeBiasMetrics(disparities, groups.length)

        // Attach grouping metadata to metrics
        metrics.groupingMetadata = groupingMetadata

        // STEP 4: Aggregate Evidence
        console.log('\n[PHASE 1] STEP 4: Aggregating evidence...')
        const evidence = aggregateEvidence(disparities)

        // STEP 5: Classify Severity
        console.log('\n[PHASE 1] STEP 5: Classifying severity...')
        const severityResult = classifySeverity(metrics)

        // Determine if bias detected
        const biasDetected = severityResult.level !== 'LOW' && severityResult.level !== 'INCONCLUSIVE'
            ? true
            : severityResult.level === 'INCONCLUSIVE'
                ? 'inconclusive'
                : false

        // Create result
        const result: Phase1BiasResult = {
            bias_detected: biasDetected,
            severity: severityResult.level,
            metrics: {
                total_groups: metrics.totalGroups,
                biased_groups: metrics.biasedGroups,
                bias_ratio: metrics.biasRatio,
                average_magnitude: metrics.averageMagnitude,
                consistency_score: metrics.consistencyScore
            },
            affected_sensitive_attributes: evidence.affectedAttributes,
            reasoning: severityResult.reasoning,
            confidence: severityResult.confidence
        }

        console.log('\n' + '='.repeat(60))
        console.log('[PHASE 1] ✅ ANALYSIS COMPLETE')
        console.log('[PHASE 1] Bias Detected:', result.bias_detected)
        console.log('[PHASE 1] Severity:', result.severity)
        console.log('[PHASE 1] Bias Ratio:', (result.metrics.bias_ratio * 100).toFixed(1) + '%')
        console.log('[PHASE 1] Confidence:', result.confidence.toFixed(2))
        console.log('='.repeat(60))

        return result

    } catch (error: any) {
        console.error('[PHASE 1] ❌ Error during analysis:', error.message)
        console.error(error.stack)

        return createInconclusiveResult(`Analysis error: ${error.message}`)
    }
}

/**
 * Create INCONCLUSIVE result
 */
function createInconclusiveResult(reason: string): Phase1BiasResult {
    return {
        bias_detected: 'inconclusive',
        severity: 'INCONCLUSIVE',
        metrics: {
            total_groups: 0,
            biased_groups: 0,
            bias_ratio: 0,
            average_magnitude: 0,
            consistency_score: 0
        },
        affected_sensitive_attributes: [],
        reasoning: [reason],
        confidence: 0
    }
}
