/**
 * Role Validator (Phase 2)
 * 
 * Validates user-confirmed role assignments
 * 
 * VALIDATION RULES:
 * 1. At least 1 merit/context column
 * 2. Exactly 1 outcome column
 * 3. Zero or more sensitive columns (warning if 0)
 * 4. Every column assigned exactly one role
 * 5. No duplicate column assignments
 */

import type { ColumnRole, RoleType } from './types'

export interface ConfirmedRole {
    column: string
    role: RoleType
}

export interface ValidationResult {
    isValid: boolean
    errors: string[]
    warnings: string[]
}

/**
 * Validate role assignment
 * 
 * Ensures roles meet minimum requirements for bias analysis
 */
export function validateRoleAssignment(
    roles: ConfirmedRole[],
    allColumns?: string[]
): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Check for empty roles
    if (!roles || roles.length === 0) {
        errors.push('No column roles provided')
        return { isValid: false, errors, warnings }
    }

    // Count roles by type
    const sensitiveColumns = roles.filter(r => r.role === 'sensitive')
    const meritColumns = roles.filter(r => r.role === 'merit')
    const outcomeColumns = roles.filter(r => r.role === 'outcome')
    const ignoredColumns = roles.filter(r => r.role === 'ignored')

    // Rule 1: At least 1 merit column
    if (meritColumns.length === 0) {
        errors.push('At least one MERIT column is required for fairness grouping')
    }

    // Rule 2: Exactly 1 outcome column
    if (outcomeColumns.length === 0) {
        errors.push('Exactly one OUTCOME column is required for bias analysis')
    } else if (outcomeColumns.length > 1) {
        errors.push(`Only one OUTCOME column allowed, but ${outcomeColumns.length} were specified: ${outcomeColumns.map(c => c.column).join(', ')}`)
    }

    // Rule 3: Warning if no sensitive columns
    if (sensitiveColumns.length === 0) {
        warnings.push('No SENSITIVE columns specified - bias detection will be limited')
    }

    // Rule 4: Check for duplicate column assignments
    const columnNames = roles.map(r => r.column)
    const uniqueColumns = new Set(columnNames)

    if (columnNames.length !== uniqueColumns.size) {
        const duplicates = columnNames.filter((name, index) =>
            columnNames.indexOf(name) !== index
        )
        errors.push(`Duplicate column assignments found: ${[...new Set(duplicates)].join(', ')}`)
    }

    // Rule 5: If allColumns provided, check all columns are assigned
    if (allColumns && allColumns.length > 0) {
        const assignedColumns = new Set(columnNames)
        const unassignedColumns = allColumns.filter(col => !assignedColumns.has(col))

        if (unassignedColumns.length > 0) {
            errors.push(`Not all columns have been assigned roles: ${unassignedColumns.join(', ')}`)
        }
    }

    // Check for invalid role types
    const validRoles: RoleType[] = ['sensitive', 'merit', 'outcome', 'ignored']
    const invalidRoles = roles.filter(r => !validRoles.includes(r.role))

    if (invalidRoles.length > 0) {
        errors.push(`Invalid role types found: ${invalidRoles.map(r => `${r.column}:${r.role}`).join(', ')}`)
    }

    const isValid = errors.length === 0

    return { isValid, errors, warnings }
}

/**
 * Convert confirmed roles to Phase 1 format
 */
export function convertToPhase1Roles(
    confirmedRoles: ConfirmedRole[]
): ColumnRole[] {
    return confirmedRoles.map(r => ({
        columnName: r.column,
        role: r.role,
        confidence: 1.0,  // User-confirmed = 100% confidence
        reason: 'User confirmed'
    }))
}
