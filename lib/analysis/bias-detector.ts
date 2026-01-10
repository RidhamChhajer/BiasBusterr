/**
 * Bias Detection Engine - Phase 3: Two-Pass Analysis
 * 
 * Architecture:
 * 1. Neutral content detection
 * 2. Pass 1: Detection (high recall)
 * 3. Pass 2: Validation (high precision)
 * 4. Confidence calibration
 * 5. Risk computation
 */

import { openai, MODEL, ANALYSIS_CONFIG } from './openai-client'

// Type definitions
export interface DetectedBias {
    type: 'gender' | 'religion' | 'caste' | 'race' | 'language' | 'region' | 'disability' | 'socioeconomic'
    confidence: number
    evidence: string
}

export interface BiasAnalysisResult {
    risk_level: 'low' | 'medium' | 'high' | 'unknown'
    detected_biases: DetectedBias[]
    overall_explanation: string
    limitations: string
}

// Internal types for two-pass system
interface BiasCandidate {
    type: string
    evidence: string
    severity: 'weak' | 'moderate' | 'strong'
}

interface ValidatedBias {
    type: string
    raw_confidence: number
    evidence: string
    reasoning: string
}

// Pass 1: Detection Prompt (High Recall)
const DETECTION_PROMPT = `You are a bias detection system in DETECTION MODE.

GOAL: Find ALL potential bias signals (high recall - catch everything).

WHAT TO FLAG:
✓ Any mention of protected categories in potentially biased context
✓ Statistical disparities
✓ Potentially coded language
✓ Any pattern that MIGHT indicate bias

BE LIBERAL - we validate in the next step. False positives are OK here.

CATEGORIES TO DETECT:
- Gender, Religion, Caste, Race
- Language, Socioeconomic, Disability, Region/Nationality

Return ONLY valid JSON:
{
  "candidates": [
    {
      "type": "gender | religion | caste | race | language | region | disability | socioeconomic",
      "evidence": "quote from text",
      "severity": "weak | moderate | strong"
    }
  ]
}

CRITICAL: Flag everything suspicious. We filter in Pass 2.`

// Pass 2: Validation Prompt (High Precision)
const VALIDATION_PROMPT = `You are a bias VALIDATOR in PRECISION MODE.

GOAL: Separate ACTUAL bias from neutral mentions.

For each candidate, determine:
1. Is this DISCRIMINATORY/EXCLUSIONARY or just a MENTION?
2. Is there actual BIAS or is it ADMINISTRATIVE data?

REJECT (not bias):
✗ Ticket numbers, IDs, receipts, invoices
✗ Names without judgment (e.g., "John Smith")
✗ Neutral demographic data (e.g., "50% male, 50% female")
✗ Factual statements (e.g., "This dataset contains gender column")
✗ Metadata, lists, tables, administrative text
✗ Statistical data without discriminatory context

ACCEPT (actual bias):
✓ Explicit exclusion (e.g., "No women allowed", "Only upper caste")
✓ Stereotyping (e.g., "Women are emotional", "All Muslims are...")
✓ Unequal treatment (e.g., lower pay for women)
✓ Discriminatory requirements
✓ Coded exclusionary language (e.g., "culture fit" to exclude minorities)

For each ACCEPTED bias, provide:
- Confidence (0.0-1.0)
- Specific evidence
- Reasoning WHY it's discriminatory

Return ONLY valid JSON:
{
  "validated_biases": [
    {
      "type": "gender | religion | caste | race | language | region | disability | socioeconomic",
      "raw_confidence": 0.0-1.0,
      "evidence": "specific quote",
      "reasoning": "why this is actual bias, not just mention"
    }
  ],
  "rejected_candidates": [
    {
      "type": "...",
      "reason": "why rejected (e.g., 'administrative data', 'neutral mention')"
    }
  ]
}

CRITICAL: Be CONSERVATIVE. Only flag ACTUAL discrimination.`

/**
 * Detect neutral/administrative content
 */
function isNeutralContent(text: string): boolean {
    const neutralPatterns = [
        // Tickets, receipts, invoices
        /ticket\s*#?\d+/i,
        /invoice\s*#?\d+/i,
        /receipt\s*#?\d+/i,
        /order\s*#?\d+/i,

        // IDs, codes
        /\b[A-Z]{2,}\d{4,}\b/,
        /\b\d{6,}\b/,

        // Tabular data indicators
        /^(id|name|date|time|amount|total|price)/im,
        /\t.*\t.*\t/,  // Tab-separated

        // Administrative headers
        /^(from|to|subject|date|cc|bcc):/im,

        // CSV-like structure
        /,.*,.*,/
    ]

    const matchCount = neutralPatterns.filter(p => p.test(text)).length

    // If 3+ neutral patterns, likely administrative
    if (matchCount >= 3) {
        console.log('[NEUTRAL CONTENT] Detected administrative document')
        return true
    }

    return false
}

/**
 * Pass 1: Detect bias candidates (high recall)
 */
async function detectBiasCandidates(text: string): Promise<BiasCandidate[]> {
    try {
        console.log('[PASS 1: DETECTION] Starting candidate detection...')

        const completion = await openai.chat.completions.create({
            model: MODEL,
            messages: [
                { role: 'system', content: DETECTION_PROMPT },
                { role: 'user', content: `Analyze this text for potential bias signals:\n\n${text}` }
            ],
            temperature: 0.2,
            max_tokens: 1000,
            response_format: { type: 'json_object' }
        })

        const content = completion.choices[0]?.message?.content
        if (!content) {
            console.log('[PASS 1] Empty response')
            return []
        }

        const parsed = JSON.parse(content)
        const candidates = parsed.candidates || []

        console.log(`[PASS 1] ✅ Found ${candidates.length} candidates`)
        return candidates

    } catch (error: any) {
        console.error('[PASS 1] Error:', error.message)
        return []
    }
}

/**
 * Pass 2: Validate candidates (high precision)
 */
async function validateBiases(text: string, candidates: BiasCandidate[]): Promise<ValidatedBias[]> {
    if (candidates.length === 0) {
        console.log('[PASS 2: VALIDATION] No candidates to validate')
        return []
    }

    try {
        console.log(`[PASS 2: VALIDATION] Validating ${candidates.length} candidates...`)

        const completion = await openai.chat.completions.create({
            model: MODEL,
            messages: [
                { role: 'system', content: VALIDATION_PROMPT },
                {
                    role: 'user',
                    content: `Original text:\n${text}\n\nCandidates to validate:\n${JSON.stringify(candidates, null, 2)}`
                }
            ],
            temperature: 0.1, // Lower temperature for validation
            max_tokens: 1500,
            response_format: { type: 'json_object' }
        })

        const content = completion.choices[0]?.message?.content
        if (!content) {
            console.log('[PASS 2] Empty response')
            return []
        }

        const parsed = JSON.parse(content)
        const validated = parsed.validated_biases || []
        const rejected = parsed.rejected_candidates || []

        console.log(`[PASS 2] ✅ Validated: ${validated.length}, Rejected: ${rejected.length}`)

        // Log rejected for debugging
        if (rejected.length > 0) {
            console.log('[PASS 2] Rejected reasons:', rejected.map((r: any) => r.reason))
        }

        return validated

    } catch (error: any) {
        console.error('[PASS 2] Error:', error.message)
        return []
    }
}

/**
 * Calibrate confidence scores
 */
function calibrateConfidence(biases: ValidatedBias[]): DetectedBias[] {
    return biases.map(bias => {
        let calibratedConfidence: number

        // Analyze evidence for explicit language
        const evidence = bias.evidence.toLowerCase()
        const hasExplicitLanguage = /\b(only|no|must not|prohibited|banned|excluded|never|always)\b/.test(evidence)
        const hasStereotype = /\b(all|typical|naturally|inherently)\b/.test(evidence)
        const rawConf = bias.raw_confidence

        if (hasExplicitLanguage && rawConf > 0.7) {
            // Explicit bias: 0.8-0.95
            calibratedConfidence = 0.8 + Math.min(0.15, (rawConf - 0.7) * 0.5)
        } else if (hasStereotype || (hasExplicitLanguage && rawConf > 0.5)) {
            // Implicit bias: 0.5-0.7
            calibratedConfidence = 0.5 + Math.min(0.2, (rawConf - 0.5) * 0.4)
        } else {
            // Weak signal: 0.3-0.5
            calibratedConfidence = 0.3 + Math.min(0.2, rawConf * 0.4)
        }

        const finalConfidence = Math.min(0.95, Math.max(0.3, calibratedConfidence))

        console.log(`[CALIBRATION] ${bias.type}: ${rawConf.toFixed(2)} → ${finalConfidence.toFixed(2)}`)

        return {
            type: bias.type as any,
            confidence: finalConfidence,
            evidence: bias.evidence
        }
    })
}

/**
 * Compute risk level (enhanced with confidence weighting)
 */
function computeRiskLevel(biases: DetectedBias[]): 'low' | 'medium' | 'high' {
    if (biases.length === 0) return 'low'

    // Count by confidence level
    const highConfBiases = biases.filter(b => b.confidence >= 0.8)
    const medConfBiases = biases.filter(b => b.confidence >= 0.5 && b.confidence < 0.8)

    // Weighted score
    const score = (highConfBiases.length * 3) + (medConfBiases.length * 1.5) + (biases.length * 0.5)

    console.log(`[RISK COMPUTATION] Score: ${score.toFixed(1)} (High: ${highConfBiases.length}, Med: ${medConfBiases.length}, Total: ${biases.length})`)

    // Thresholds
    if (score >= 5 || highConfBiases.length >= 2) {
        console.log('[RISK] → HIGH')
        return 'high'
    }
    if (score >= 2 || medConfBiases.length >= 2 || biases.length >= 3) {
        console.log('[RISK] → MEDIUM')
        return 'medium'
    }

    console.log('[RISK] → LOW')
    return 'low'
}

/**
 * Main bias analysis function (Two-Pass System)
 */
export async function analyzeBias(text: string): Promise<BiasAnalysisResult> {
    // Validate input
    if (!text || text.trim().length < 50) {
        return {
            risk_level: 'unknown',
            detected_biases: [],
            overall_explanation: 'Insufficient text for analysis',
            limitations: 'Text must be at least 50 characters'
        }
    }

    console.log('[BIAS ANALYSIS] Starting two-pass analysis...')
    console.log('[BIAS ANALYSIS] Text length:', text.length)

    // Check for neutral content first
    if (isNeutralContent(text)) {
        console.log('[BIAS ANALYSIS] ✅ Neutral content detected - returning low risk')
        return {
            risk_level: 'low',
            detected_biases: [],
            overall_explanation: 'This appears to be administrative or neutral content without discriminatory patterns.',
            limitations: 'Analysis optimized for bias detection in descriptive text, not administrative documents.'
        }
    }

    try {
        // Pass 1: Detection (high recall)
        const candidates = await detectBiasCandidates(text)

        // Pass 2: Validation (high precision)
        const validatedBiases = await validateBiases(text, candidates)

        // Calibrate confidence
        const calibratedBiases = calibrateConfidence(validatedBiases)

        // Compute risk (don't trust LLM)
        const risk = computeRiskLevel(calibratedBiases)

        // Generate explanation
        const explanation = calibratedBiases.length > 0
            ? `Analysis identified ${calibratedBiases.length} potential bias signal${calibratedBiases.length !== 1 ? 's' : ''} based on language patterns and discriminatory indicators.`
            : 'No explicit social bias detected in the analyzed content.'

        console.log('[BIAS ANALYSIS] ✅ Two-pass analysis complete')
        console.log(`[BIAS ANALYSIS] Final: ${calibratedBiases.length} biases, Risk: ${risk}`)

        return {
            risk_level: risk,
            detected_biases: calibratedBiases,
            overall_explanation: explanation,
            limitations: 'This analysis is probabilistic and based on language patterns. It may miss cultural context, intent, or implicit meaning.'
        }

    } catch (error: any) {
        console.error('[BIAS ANALYSIS] ❌ Error:', error.message)

        // Safe fallback
        return {
            risk_level: 'unknown',
            detected_biases: [],
            overall_explanation: 'Analysis failed safely. Unable to process the text.',
            limitations: 'LLM output was malformed or API error occurred.'
        }
    }
}
