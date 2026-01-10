/**
 * Explanation Prompts (Phase 3)
 * 
 * OpenAI prompt design for explanation generation
 * 
 * CRITICAL RULES:
 * - OpenAI is a technical writer, NOT an analyst
 * - OpenAI explains results, NEVER makes decisions
 * - Prompts must explicitly forbid decision-making
 */

import type { Phase1BiasResult } from './bias-detector-phase1'

/**
 * Generate OpenAI prompt for explanation
 */
export function createExplanationPrompt(biasResult: Phase1BiasResult): string {
    const { severity, bias_detected, metrics, affected_sensitive_attributes, reasoning } = biasResult

    const biasRatioPercent = (metrics.bias_ratio * 100).toFixed(1)
    const magnitudePercent = (metrics.average_magnitude * 100).toFixed(1)
    const consistencyPercent = (metrics.consistency_score * 100).toFixed(1)
    const attributeList = affected_sensitive_attributes.join(', ') || 'none specified'

    return `You are a technical writer explaining bias detection results to a non-technical audience.

CRITICAL RULES (NON-NEGOTIABLE):
- Do NOT decide bias or severity - these are already determined
- Do NOT adjust or reinterpret metrics - use them exactly as provided
- Do NOT add recommendations, advice, or policy suggestions
- Do NOT introduce new evidence or speculation
- Explain ONLY the provided data
- Use neutral, factual, professional language
- Avoid moral judgment or accusations
- Be clear and concise (aim for < 15 seconds reading time)

ANALYSIS RESULTS (FINAL - DO NOT CHANGE):
- Severity: ${severity}
- Bias Detected: ${bias_detected}
- Total Comparable Groups: ${metrics.total_groups}
- Groups with Disparities: ${metrics.biased_groups}
- Bias Ratio: ${biasRatioPercent}%
- Average Disparity Magnitude: ${magnitudePercent}%
- Consistency Score: ${consistencyPercent}%
- Affected Attributes: ${attributeList}

TECHNICAL REASONING:
${reasoning.map((r, i) => `${i + 1}. ${r}`).join('\n')}

YOUR TASK:
Generate a clear, neutral explanation in plain English that helps a non-technical person understand these results.

Include:
1. **Summary** (1 paragraph): Explain the severity and what was found
2. **Details** (3-5 bullet points): Explain the evidence (groups analyzed, disparities found, metrics)
3. **Limitations** (2-3 bullet points): What the analysis cannot determine, data dependencies

Return JSON:
{
  "summary": "One clear paragraph explaining the ${severity} severity finding",
  "details": [
    "Evidence point 1 (use actual numbers from metrics)",
    "Evidence point 2",
    "Evidence point 3"
  ],
  "limitations": [
    "Limitation 1 (e.g., based on provided dataset only)",
    "Limitation 2"
  ]
}

Remember: You are explaining existing results, not analyzing or deciding anything new.`
}

/**
 * System message for OpenAI
 */
export const EXPLANATION_SYSTEM_MESSAGE = `You are a technical writer specializing in explaining statistical analysis results to non-technical audiences. Your role is to translate complex metrics into clear, understandable language without making any analytical decisions or judgments.`
