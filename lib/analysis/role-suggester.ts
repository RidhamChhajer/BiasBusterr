/**
 * Role Suggester (Phase 2)
 * 
 * Suggests column roles using heuristics and optional OpenAI semantic analysis
 * 
 * CRITICAL RULES:
 * - Suggestions are ONLY suggestions, never final
 * - OpenAI is ONLY for semantic assistance, NOT confirmation
 * - If OpenAI fails, fall back to heuristics
 * - User MUST confirm roles before analysis proceeds
 */

import { openai } from './openai-client'
import type { ColumnMetadata, RoleSuggestion, RoleType } from './types'

/**
 * Suggest column roles (main entry point)
 * 
 * Tries OpenAI semantic analysis first, falls back to heuristics
 */
export async function suggestColumnRoles(
    columns: ColumnMetadata[]
): Promise<RoleSuggestion[]> {
    console.log('[ROLE SUGGESTER] Analyzing', columns.length, 'columns...')

    try {
        // Try OpenAI semantic analysis first
        const aiSuggestions = await suggestRolesWithAI(columns)

        if (aiSuggestions && aiSuggestions.length > 0) {
            console.log('[ROLE SUGGESTER] ✅ Using OpenAI semantic suggestions')
            return aiSuggestions
        }
    } catch (error: any) {
        console.warn('[ROLE SUGGESTER] OpenAI failed, using heuristic fallback:', error.message)
    }

    // Fallback to heuristics
    console.log('[ROLE SUGGESTER] Using keyword-based heuristics')
    return suggestRolesHeuristic(columns)
}

/**
 * Suggest roles using OpenAI semantic analysis
 * 
 * OpenAI's ONLY role: Semantic understanding, NOT decision-making
 */
async function suggestRolesWithAI(
    columns: ColumnMetadata[]
): Promise<RoleSuggestion[]> {
    const prompt = `Analyze these dataset columns and suggest appropriate roles for bias detection.

COLUMN ROLES:
- **sensitive**: Identity-related attributes (gender, religion, race, caste, age, nationality, disability, etc.)
- **merit**: Qualifications, skills, experience, performance metrics used to compare individuals
- **outcome**: Final decision or result (selected/rejected, approved/denied, admitted/not admitted)
- **ignored**: IDs, names, serial numbers, metadata

COLUMNS:
${columns.map((col, idx) => `${idx + 1}. "${col.name}" (${col.type}, ${col.uniqueCount} unique values, samples: ${col.sampleValues.slice(0, 3).join(', ')})`).join('\n')}

CRITICAL INSTRUCTIONS:
- Suggest the MOST LIKELY role for each column
- Provide alternatives if uncertain
- Explain your reasoning briefly
- Be conservative with "sensitive" classification
- These are SUGGESTIONS ONLY - user will confirm

Return JSON:
{
  "suggestions": [
    {
      "column": "column name",
      "suggested_role": "sensitive | merit | outcome | ignored",
      "confidence": 0.0-1.0,
      "reason": "brief explanation",
      "alternatives": ["other", "possible", "roles"]
    }
  ]
}`

    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 1500,
        response_format: { type: 'json_object' }
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
        throw new Error('Empty response from OpenAI')
    }

    const parsed = JSON.parse(content)
    const suggestions = parsed.suggestions || []

    return suggestions.map((s: any) => ({
        column: s.column,
        suggested_role: s.suggested_role,
        confidence: s.confidence || 0.7,
        reason: s.reason || 'AI-suggested role',
        alternatives: s.alternatives || []
    }))
}

/**
 * Suggest roles using keyword-based heuristics
 * 
 * Always available fallback when OpenAI unavailable
 */
export function suggestRolesHeuristic(
    columns: ColumnMetadata[]
): RoleSuggestion[] {
    return columns.map(col => {
        const nameLower = col.name.toLowerCase()

        // Sensitive attribute keywords
        const sensitiveKeywords = [
            'gender', 'sex', 'male', 'female',
            'religion', 'religious', 'faith',
            'race', 'ethnicity', 'ethnic',
            'caste', 'tribe', 'community',
            'age', 'birth', 'dob',
            'nationality', 'country', 'origin',
            'disability', 'handicap',
            'language', 'native', 'skin', 'color'
        ]

        // Outcome keywords
        const outcomeKeywords = [
            'selected', 'rejected', 'hired', 'fired',
            'approved', 'denied', 'accepted', 'declined',
            'admitted', 'enrolled', 'passed', 'failed',
            'outcome', 'result', 'decision', 'status',
            'verdict', 'judgment'
        ]

        // Merit keywords
        const meritKeywords = [
            'experience', 'skill', 'education', 'degree',
            'qualification', 'score', 'grade', 'performance',
            'salary', 'income', 'rating', 'level',
            'gpa', 'marks', 'test', 'exam'
        ]

        // Ignored keywords
        const ignoredKeywords = [
            'id', 'name', 'serial', 'number', 'code',
            'date', 'time', 'timestamp', 'created',
            'updated', 'modified', 'index'
        ]

        // Check for matches
        const isSensitive = sensitiveKeywords.some(kw => nameLower.includes(kw))
        const isOutcome = outcomeKeywords.some(kw => nameLower.includes(kw))
        const isMerit = meritKeywords.some(kw => nameLower.includes(kw))
        const isIgnored = ignoredKeywords.some(kw => nameLower.includes(kw))

        // Determine suggested role
        let suggestedRole: RoleType = 'merit'  // Default
        let confidence = 0.5
        let reason = 'Default suggestion based on heuristics'
        let alternatives: RoleType[] = []

        if (isSensitive) {
            suggestedRole = 'sensitive'
            confidence = 0.85
            reason = 'Column name suggests identity-related attribute'
            alternatives = ['ignored']
        } else if (isOutcome) {
            suggestedRole = 'outcome'
            confidence = 0.85
            reason = 'Column name suggests decision or result'
            alternatives = ['merit']
        } else if (isMerit) {
            suggestedRole = 'merit'
            confidence = 0.75
            reason = 'Column name suggests qualification or performance metric'
            alternatives = ['outcome']
        } else if (isIgnored) {
            suggestedRole = 'ignored'
            confidence = 0.9
            reason = 'Column appears to be metadata or identifier'
            alternatives = []
        } else {
            // No clear match - suggest merit as default
            suggestedRole = 'merit'
            confidence = 0.4
            reason = 'No clear indicators - defaulting to merit (please review)'
            alternatives = ['sensitive', 'outcome', 'ignored']
        }

        return {
            column: col.name,
            suggested_role: suggestedRole,
            confidence,
            reason,
            alternatives
        }
    })
}
