/**
 * Explanation Generator (Phase 3)
 * 
 * Generates human-readable explanations from Phase 1 results
 * 
 * CRITICAL RULES:
 * - OpenAI explains decisions, NEVER makes decisions
 * - If OpenAI fails, use fallback templates
 * - NO modification of Phase 1 results
 * - Explanations are additive only (non-breaking)
 */

import { openai } from './openai-client'
import type { Phase1BiasResult } from './bias-detector-phase1'
import type { ParsedDataset, ColumnRole } from './types'
import { generateFallbackExplanation, type ExplanationResult } from './explanation-templates'
import { createExplanationPrompt, EXPLANATION_SYSTEM_MESSAGE } from './explanation-prompts'

/**
 * Generate explanation from Phase 1 results
 * 
 * Tries OpenAI first, falls back to templates if OpenAI fails
 */
export async function generateExplanation(
    biasResult: Phase1BiasResult,
    dataset?: ParsedDataset,
    roles?: ColumnRole[]
): Promise<ExplanationResult> {
    console.log('[EXPLANATION] Generating explanation for severity:', biasResult.severity)

    try {
        // Try OpenAI explanation
        const aiExplanation = await generateExplanationWithAI(biasResult)

        console.log('[EXPLANATION] ✅ OpenAI explanation generated')
        return aiExplanation

    } catch (error: any) {
        console.warn('[EXPLANATION] OpenAI failed, using fallback:', error.message)

        // Fallback to template
        const fallbackExplanation = generateFallbackExplanation(biasResult)

        console.log('[EXPLANATION] ✅ Fallback explanation generated')
        return fallbackExplanation
    }
}

/**
 * Generate explanation using OpenAI
 * 
 * OpenAI's ONLY role: Technical writing, NOT analysis
 */
async function generateExplanationWithAI(
    biasResult: Phase1BiasResult
): Promise<ExplanationResult> {
    // Create prompt
    const prompt = createExplanationPrompt(biasResult)

    // Call OpenAI
    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: EXPLANATION_SYSTEM_MESSAGE },
            { role: 'user', content: prompt }
        ],
        temperature: 0.3,  // Low temperature for consistency
        max_tokens: 800,
        response_format: { type: 'json_object' }
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
        throw new Error('Empty response from OpenAI')
    }

    // Parse response
    const parsed = JSON.parse(content)

    // Validate response structure
    if (!parsed.summary || !parsed.details || !parsed.limitations) {
        throw new Error('Invalid response structure from OpenAI')
    }

    // Return explanation with AI source
    return {
        summary: parsed.summary,
        details: Array.isArray(parsed.details) ? parsed.details : [parsed.details],
        examples: parsed.examples || undefined,
        limitations: Array.isArray(parsed.limitations) ? parsed.limitations : [parsed.limitations],
        source: 'ai'
    }
}

/**
 * Validate explanation content
 * 
 * Ensures explanation doesn't contradict Phase 1 results
 */
function validateExplanation(
    explanation: ExplanationResult,
    biasResult: Phase1BiasResult
): boolean {
    // Check that severity is mentioned correctly
    const severityMentioned = explanation.summary.toLowerCase().includes(biasResult.severity.toLowerCase())

    if (!severityMentioned) {
        console.warn('[EXPLANATION] Validation warning: Severity not mentioned in summary')
    }

    // Check that metrics are present in details
    const metricsPresent = explanation.details.some(d =>
        d.includes(String(biasResult.metrics.total_groups)) ||
        d.includes(String(biasResult.metrics.biased_groups))
    )

    if (!metricsPresent) {
        console.warn('[EXPLANATION] Validation warning: Metrics not found in details')
    }

    return true  // Non-blocking validation
}
