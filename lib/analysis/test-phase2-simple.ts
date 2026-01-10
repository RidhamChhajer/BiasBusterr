/**
 * Simple Phase 2 Test
 * 
 * Tests role suggester heuristics (no OpenAI dependency)
 */

import { suggestRolesHeuristic } from './role-suggester'
import { validateRoleAssignment } from './role-validator'
import type { ColumnMetadata } from './types'

console.log('\n' + '='.repeat(80))
console.log('PHASE 2 SIMPLE TEST')
console.log('='.repeat(80))

// Test 1: Role Suggester
console.log('\n📋 TEST 1: Role Suggester (Heuristics)')
console.log('-'.repeat(80))

const testColumns: ColumnMetadata[] = [
    {
        name: 'gender',
        type: 'categorical',
        uniqueCount: 2,
        sampleValues: ['Male', 'Female'],
        nullCount: 0,
        stats: {}
    },
    {
        name: 'years_experience',
        type: 'numeric',
        uniqueCount: 10,
        sampleValues: [1, 2, 3, 4, 5],
        nullCount: 0,
        stats: { min: 1, max: 10, mean: 5.5 }
    },
    {
        name: 'selected',
        type: 'categorical',
        uniqueCount: 2,
        sampleValues: ['Yes', 'No'],
        nullCount: 0,
        stats: {}
    },
    {
        name: 'id',
        type: 'numeric',
        uniqueCount: 100,
        sampleValues: [1, 2, 3],
        nullCount: 0,
        stats: {}
    }
]

const suggestions = suggestRolesHeuristic(testColumns)

console.log('\nSuggestions:')
suggestions.forEach(s => {
    console.log(`  ${s.column}:`)
    console.log(`    Role: ${s.suggested_role}`)
    console.log(`    Confidence: ${(s.confidence * 100).toFixed(0)}%`)
    console.log(`    Reason: ${s.reason}`)
})

const test1Pass =
    suggestions.find(s => s.column === 'gender')?.suggested_role === 'sensitive' &&
    suggestions.find(s => s.column === 'years_experience')?.suggested_role === 'merit' &&
    suggestions.find(s => s.column === 'selected')?.suggested_role === 'outcome' &&
    suggestions.find(s => s.column === 'id')?.suggested_role === 'ignored'

console.log('\n', test1Pass ? '✅ TEST 1 PASSED' : '❌ TEST 1 FAILED')

// Test 2: Role Validator
console.log('\n\n📋 TEST 2: Role Validator')
console.log('-'.repeat(80))

const validRoles = [
    { column: 'gender', role: 'sensitive' as const },
    { column: 'years_experience', role: 'merit' as const },
    { column: 'selected', role: 'outcome' as const },
    { column: 'id', role: 'ignored' as const }
]

const validation = validateRoleAssignment(validRoles, ['gender', 'years_experience', 'selected', 'id'])

console.log('\nValidation Result:')
console.log('  Valid:', validation.isValid)
console.log('  Errors:', validation.errors.length === 0 ? 'None' : validation.errors)
console.log('  Warnings:', validation.warnings.length === 0 ? 'None' : validation.warnings)

const test2Pass = validation.isValid

console.log('\n', test2Pass ? '✅ TEST 2 PASSED' : '❌ TEST 2 FAILED')

// Test 3: Invalid Roles
console.log('\n\n📋 TEST 3: Invalid Role Assignment (No Outcome)')
console.log('-'.repeat(80))

const invalidRoles = [
    { column: 'gender', role: 'sensitive' as const },
    { column: 'years_experience', role: 'merit' as const }
    // Missing outcome column!
]

const invalidValidation = validateRoleAssignment(invalidRoles, ['gender', 'years_experience'])

console.log('\nValidation Result:')
console.log('  Valid:', invalidValidation.isValid)
console.log('  Errors:', invalidValidation.errors)

const test3Pass = !invalidValidation.isValid && invalidValidation.errors.length > 0

console.log('\n', test3Pass ? '✅ TEST 3 PASSED' : '❌ TEST 3 FAILED')

// Summary
console.log('\n\n' + '='.repeat(80))
console.log('SUMMARY')
console.log('='.repeat(80))
console.log('Test 1 (Role Suggester):', test1Pass ? '✅ PASSED' : '❌ FAILED')
console.log('Test 2 (Valid Roles):', test2Pass ? '✅ PASSED' : '❌ FAILED')
console.log('Test 3 (Invalid Roles):', test3Pass ? '✅ PASSED' : '❌ FAILED')

const allPass = test1Pass && test2Pass && test3Pass
console.log('\n' + (allPass ? '🎉 ALL TESTS PASSED' : '⚠️ SOME TESTS FAILED'))
console.log('='.repeat(80) + '\n')

process.exit(allPass ? 0 : 1)
