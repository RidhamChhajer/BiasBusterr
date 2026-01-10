/**
 * Column Role Assignment System
 * 
 * MANDATORY USER CONFIRMATION - NO AUTO-CONFIRMATION
 * 
 * CRITICAL RULES (NON-NEGOTIABLE):
 * 1. Suggestions are ONLY suggestions, never final
 * 2. User MUST explicitly confirm roles
 * 3. Without confirmation → INCONCLUSIVE status
 * 4. NO default roles, NO auto-fill, NO assumptions
 * 
 * FORBIDDEN BEHAVIORS:
 * - ❌ Auto-confirming suggested roles
 * - ❌ Using "default" or "fallback" role assignments
 * - ❌ Proceeding with analysis based on confidence scores alone
 * - ❌ Assuming roles based on column names without explicit user approval
 */

import { openai } from './openai-client'
import type { ColumnMetadata, RoleSuggestion, ColumnRole, ConfirmedRoles, UserRoleConfirmation } from './types'

/**
 * Suggest column roles using semantic analysis
 * 
 * CRITICAL: These are SUGGESTIONS ONLY - user must confirm
 */
export async function suggestColumnRoles(
    columns: ColumnMetadata[]
): Promise<RoleSuggestion[]> {
    console.log('[ROLE SUGGESTION] Analyzing', columns.length, 'columns...')

    try {
        // Try OpenAI semantic analysis first
        const aiSuggestions = await suggestRolesWithAI(columns)

        if (aiSuggestions && aiSuggestions.length > 0) {
            console.log('[ROLE SUGGESTION] ✅ OpenAI suggestions generated')
            return aiSuggestions
        }
    } catch (error: any) {
        console.warn('[ROLE SUGGESTION] OpenAI failed, using heuristic fallback:', error.message)
    }

    // Fallback to heuristic suggestions
    console.log('[ROLE SUGGESTION] Using heuristic fallback')
    return suggestRolesHeuristic(columns)
}

/**
 * Suggest roles using OpenAI semantic analysis
 * 
 * OpenAI's ONLY role: Semantic understanding, NOT decision-making
 */
async function suggestRolesWithAI(columns: ColumnMetadata[]): Promise<RoleSuggestion[]> {
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
- Explain your reasoning
- Be conservative with "sensitive" classification
- These are SUGGESTIONS ONLY - user will confirm

Return JSON array:
[
  {
    "columnName": "column name",
    "suggestedRole": "sensitive | merit | outcome | ignored",
    "alternatives": ["other", "possible", "roles"],
    "reasoning": "why this role makes sense",
    "confidence": 0.0-1.0
  }
]`

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
    const suggestions = parsed.suggestions || parsed.roles || []

    return suggestions.map((s: any) => ({
        columnName: s.columnName,
        suggestedRole: s.suggestedRole,
        alternatives: s.alternatives || [],
        reasoning: s.reasoning || 'AI-suggested role',
        confidence: s.confidence || 0.7
    }))
}

/**
 * Heuristic role suggestions (fallback when OpenAI unavailable)
 */
function suggestRolesHeuristic(columns: ColumnMetadata[]): RoleSuggestion[] {
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
            'language', 'native'
        ]

        // Outcome keywords
        const outcomeKeywords = [
            'selected', 'rejected', 'hired', 'fired',
            'approved', 'denied', 'accepted', 'declined',
            'admitted', 'enrolled', 'passed', 'failed',
            'outcome', 'result', 'decision', 'status'
        ]

        // Merit keywords
        const meritKeywords = [
            'experience', 'skill', 'education', 'degree',
            'qualification', 'score', 'grade', 'performance',
            'salary', 'income', 'rating', 'level'
        ]

        // Ignored keywords
        const ignoredKeywords = [
            'id', 'name', 'serial', 'number', 'code',
            'date', 'time', 'timestamp', 'created'
        ]

        // Check for matches
        const isSensitive = sensitiveKeywords.some(kw => nameLower.includes(kw))
        const isOutcome = outcomeKeywords.some(kw => nameLower.includes(kw))
        const isMerit = meritKeywords.some(kw => nameLower.includes(kw))
        const isIgnored = ignoredKeywords.some(kw => nameLower.includes(kw))

        // Determine suggested role
        let suggestedRole: 'sensitive' | 'merit' | 'outcome' | 'ignored' = 'merit'  // Default
        let confidence = 0.5
        let reasoning = 'Default suggestion based on heuristics'
        let alternatives: ('sensitive' | 'merit' | 'outcome' | 'ignored')[] = []

        if (isSensitive) {
            suggestedRole = 'sensitive'
            confidence = 0.8
            reasoning = 'Column name suggests identity-related attribute'
            alternatives = ['ignored']
        } else if (isOutcome) {
            suggestedRole = 'outcome'
            confidence = 0.8
            reasoning = 'Column name suggests decision or result'
            alternatives = ['merit']
        } else if (isMerit) {
            suggestedRole = 'merit'
            confidence = 0.7
            reasoning = 'Column name suggests qualification or performance metric'
            alternatives = ['outcome']
        } else if (isIgnored) {
            suggestedRole = 'ignored'
            confidence = 0.9
            reasoning = 'Column appears to be metadata or identifier'
            alternatives = []
        } else {
            // No clear match - suggest merit as default
            suggestedRole = 'merit'
            confidence = 0.4
            reasoning = 'No clear indicators - defaulting to merit (please review)'
            alternatives = ['sensitive', 'outcome', 'ignored']
        }

        return {
            columnName: col.name,
            suggestedRole,
            alternatives,
            reasoning,
            confidence
        }
    })
}

/**
 * Validate role assignment
 * 
 * MANDATORY: At least 1 outcome column and 1 merit column required
 */
export function validateRoleAssignment(roles: ColumnRole[]): {
    isValid: boolean
    errors: string[]
} {
    const errors: string[] = []

    // Count roles
    const outcomeColumns = roles.filter(r => r.role === 'outcome')
    const meritColumns = roles.filter(r => r.role === 'merit')
    const sensitiveColumns = roles.filter(r => r.role === 'sensitive')

    // MANDATORY: At least 1 outcome column
    if (outcomeColumns.length === 0) {
        errors.push('At least one OUTCOME column is required for bias analysis')
    }

    // MANDATORY: At least 1 merit column
    if (meritColumns.length === 0) {
        errors.push('At least one MERIT column is required for fairness grouping')
    }

    // WARNING: No sensitive columns (analysis will be limited)
    if (sensitiveColumns.length === 0) {
        errors.push('WARNING: No SENSITIVE columns specified - bias detection will be limited')
    }

    return {
        isValid: outcomeColumns.length > 0 && meritColumns.length > 0,
        errors
    }
}

/**
 * Process user confirmation of roles
 * 
 * CRITICAL: This is the ONLY way to proceed with analysis
 * NO AUTO-CONFIRMATION ALLOWED
 */
export function confirmRoles(
    suggestions: RoleSuggestion[],
    userConfirmation: UserRoleConfirmation
): ConfirmedRoles {
    console.log('[ROLE CONFIRMATION] Processing user confirmation...')

    const { confirmedRoles, userModified } = userConfirmation

    // Validate confirmed roles
    const validation = validateRoleAssignment(confirmedRoles)

    if (!validation.isValid) {
        console.log('[ROLE CONFIRMATION] ❌ Validation failed:', validation.errors)

        return {
            roles: confirmedRoles,
            isValid: false,
            validationErrors: validation.errors,
            sensitiveColumns: [],
            meritColumns: [],
            outcomeColumns: []
        }
    }

    // Extract column lists by role
    const sensitiveColumns = confirmedRoles
        .filter(r => r.role === 'sensitive')
        .map(r => r.columnName)

    const meritColumns = confirmedRoles
        .filter(r => r.role === 'merit')
        .map(r => r.columnName)

    const outcomeColumns = confirmedRoles
        .filter(r => r.role === 'outcome')
        .map(r => r.columnName)

    console.log('[ROLE CONFIRMATION] ✅ Roles confirmed:', {
        sensitive: sensitiveColumns.length,
        merit: meritColumns.length,
        outcome: outcomeColumns.length,
        userModified
    })

    return {
        roles: confirmedRoles,
        isValid: true,
        validationErrors: [],
        sensitiveColumns,
        meritColumns,
        outcomeColumns
    }
}

/**
 * Create INCONCLUSIVE result when roles are not confirmed
 * 
 * CRITICAL: This enforces the mandatory confirmation requirement
 */
export function createInconclusiveResult(
    suggestions: RoleSuggestion[],
    dataPreview: any[][]
): any {
    console.log('[ROLE CONFIRMATION] ⚠️ Creating INCONCLUSIVE result (no user confirmation)')

    return {
        status: 'pending_confirmation',
        risk_level: 'inconclusive',
        detected_biases: [],
        overall_explanation: 'Analysis cannot proceed without user confirmation of column roles.',
        limitations: [
            'Column roles must be explicitly confirmed by user',
            'Fairness analysis requires validated role assignments',
            'Please review suggested roles and confirm to proceed'
        ],
        suggestedRoles: suggestions,
        dataPreview: dataPreview.slice(0, 10),  // First 10 rows
        message: 'Please confirm column roles to proceed with fairness analysis'
    }
}
