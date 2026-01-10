/**
 * Phase 1 Core Logic Tests
 * 
 * Tests the pure logic-driven bias detection engine
 * NO OpenAI, NO UI, NO API - just core logic
 */

import type { ParsedDataset, ColumnRole } from './types'
import { detectBiasPhase1 } from './bias-detector-phase1'

/**
 * Test 1: Biased hiring dataset (should detect HIGH bias)
 */
export function testBiasedDataset() {
    console.log('\n' + '='.repeat(80))
    console.log('TEST 1: Biased Hiring Dataset (Expected: HIGH bias)')
    console.log('='.repeat(80))

    // Create biased dataset
    // Scenario: Same qualifications, but gender affects hiring outcome
    const dataset: ParsedDataset = {
        headers: ['name', 'gender', 'experience', 'education', 'selected'],
        rows: [
            // Males with 5 years experience + Bachelor's → mostly selected
            ['John', 'Male', 5, 'Bachelor', 'Yes'],
            ['Mike', 'Male', 5, 'Bachelor', 'Yes'],
            ['Tom', 'Male', 5, 'Bachelor', 'Yes'],
            ['Steve', 'Male', 5, 'Bachelor', 'Yes'],
            ['Dave', 'Male', 5, 'Bachelor', 'No'],  // 1 rejection

            // Females with 5 years experience + Bachelor's → mostly rejected
            ['Jane', 'Female', 5, 'Bachelor', 'No'],
            ['Sarah', 'Female', 5, 'Bachelor', 'No'],
            ['Emily', 'Female', 5, 'Bachelor', 'No'],
            ['Lisa', 'Female', 5, 'Bachelor', 'No'],
            ['Anna', 'Female', 5, 'Bachelor', 'Yes'],  // 1 selection

            // Males with 3 years experience + Master's → mostly selected
            ['Bob', 'Male', 3, 'Master', 'Yes'],
            ['Jim', 'Male', 3, 'Master', 'Yes'],
            ['Mark', 'Male', 3, 'Master', 'No'],

            // Females with 3 years experience + Master's → mostly rejected
            ['Mary', 'Female', 3, 'Master', 'No'],
            ['Kate', 'Female', 3, 'Master', 'No'],
            ['Amy', 'Female', 3, 'Master', 'Yes'],
        ],
        rowCount: 16,
        columnCount: 5,
        metadata: {
            source: 'test-biased.csv',
            extractedAt: new Date().toISOString(),
            quality: 'high'
        }
    }

    // Define column roles
    const roles: ColumnRole[] = [
        { columnName: 'name', role: 'ignored', confidence: 1, reason: 'Identifier' },
        { columnName: 'gender', role: 'sensitive', confidence: 1, reason: 'Protected attribute' },
        { columnName: 'experience', role: 'merit', confidence: 1, reason: 'Qualification' },
        { columnName: 'education', role: 'merit', confidence: 1, reason: 'Qualification' },
        { columnName: 'selected', role: 'outcome', confidence: 1, reason: 'Decision' }
    ]

    // Run Phase 1 detection
    const result = detectBiasPhase1(dataset, roles)

    // Verify result
    console.log('\n📊 RESULT:')
    console.log('Bias Detected:', result.bias_detected)
    console.log('Severity:', result.severity)
    console.log('Bias Ratio:', (result.metrics.bias_ratio * 100).toFixed(1) + '%')
    console.log('Affected Attributes:', result.affected_sensitive_attributes.join(', '))

    const passed = result.severity === 'HIGH' || result.severity === 'MEDIUM'
    console.log('\n' + (passed ? '✅ TEST PASSED' : '❌ TEST FAILED'))

    return passed
}

/**
 * Test 2: Fair dataset (should detect LOW bias)
 */
export function testFairDataset() {
    console.log('\n' + '='.repeat(80))
    console.log('TEST 2: Fair Hiring Dataset (Expected: LOW bias)')
    console.log('='.repeat(80))

    // Create fair dataset
    // Scenario: Same qualifications → same outcomes regardless of gender
    const dataset: ParsedDataset = {
        headers: ['name', 'gender', 'experience', 'education', 'selected'],
        rows: [
            // 5 years + Bachelor → all selected (both genders)
            ['John', 'Male', 5, 'Bachelor', 'Yes'],
            ['Jane', 'Female', 5, 'Bachelor', 'Yes'],
            ['Mike', 'Male', 5, 'Bachelor', 'Yes'],
            ['Sarah', 'Female', 5, 'Bachelor', 'Yes'],

            // 2 years + Bachelor → all rejected (both genders)
            ['Tom', 'Male', 2, 'Bachelor', 'No'],
            ['Emily', 'Female', 2, 'Bachelor', 'No'],
            ['Steve', 'Male', 2, 'Bachelor', 'No'],
            ['Lisa', 'Female', 2, 'Bachelor', 'No'],

            // 5 years + Master → all selected (both genders)
            ['Bob', 'Male', 5, 'Master', 'Yes'],
            ['Mary', 'Female', 5, 'Master', 'Yes'],
            ['Jim', 'Male', 5, 'Master', 'Yes'],
            ['Kate', 'Female', 5, 'Master', 'Yes'],
        ],
        rowCount: 12,
        columnCount: 5,
        metadata: {
            source: 'test-fair.csv',
            extractedAt: new Date().toISOString(),
            quality: 'high'
        }
    }

    const roles: ColumnRole[] = [
        { columnName: 'name', role: 'ignored', confidence: 1, reason: 'Identifier' },
        { columnName: 'gender', role: 'sensitive', confidence: 1, reason: 'Protected attribute' },
        { columnName: 'experience', role: 'merit', confidence: 1, reason: 'Qualification' },
        { columnName: 'education', role: 'merit', confidence: 1, reason: 'Qualification' },
        { columnName: 'selected', role: 'outcome', confidence: 1, reason: 'Decision' }
    ]

    const result = detectBiasPhase1(dataset, roles)

    console.log('\n📊 RESULT:')
    console.log('Bias Detected:', result.bias_detected)
    console.log('Severity:', result.severity)
    console.log('Bias Ratio:', (result.metrics.bias_ratio * 100).toFixed(1) + '%')

    const passed = result.severity === 'LOW'
    console.log('\n' + (passed ? '✅ TEST PASSED' : '❌ TEST FAILED'))

    return passed
}

/**
 * Test 3: Sparse dataset (should return INCONCLUSIVE)
 */
export function testSparseDataset() {
    console.log('\n' + '='.repeat(80))
    console.log('TEST 3: Sparse Dataset (Expected: INCONCLUSIVE)')
    console.log('='.repeat(80))

    // Create sparse dataset (too few records)
    const dataset: ParsedDataset = {
        headers: ['name', 'gender', 'experience', 'selected'],
        rows: [
            ['John', 'Male', 5, 'Yes'],
            ['Jane', 'Female', 5, 'No'],
            ['Mike', 'Male', 3, 'No'],
        ],
        rowCount: 3,
        columnCount: 4,
        metadata: {
            source: 'test-sparse.csv',
            extractedAt: new Date().toISOString(),
            quality: 'low'
        }
    }

    const roles: ColumnRole[] = [
        { columnName: 'name', role: 'ignored', confidence: 1, reason: 'Identifier' },
        { columnName: 'gender', role: 'sensitive', confidence: 1, reason: 'Protected attribute' },
        { columnName: 'experience', role: 'merit', confidence: 1, reason: 'Qualification' },
        { columnName: 'selected', role: 'outcome', confidence: 1, reason: 'Decision' }
    ]

    const result = detectBiasPhase1(dataset, roles)

    console.log('\n📊 RESULT:')
    console.log('Bias Detected:', result.bias_detected)
    console.log('Severity:', result.severity)
    console.log('Reasoning:', result.reasoning.join('; '))

    const passed = result.severity === 'INCONCLUSIVE'
    console.log('\n' + (passed ? '✅ TEST PASSED' : '❌ TEST FAILED'))

    return passed
}

/**
 * Run all tests
 */
export function runAllTests() {
    console.log('\n🧪 RUNNING PHASE 1 CORE LOGIC TESTS\n')

    const test1 = testBiasedDataset()
    const test2 = testFairDataset()
    const test3 = testSparseDataset()

    console.log('\n' + '='.repeat(80))
    console.log('📋 TEST SUMMARY')
    console.log('='.repeat(80))
    console.log('Test 1 (Biased Dataset):', test1 ? '✅ PASSED' : '❌ FAILED')
    console.log('Test 2 (Fair Dataset):', test2 ? '✅ PASSED' : '❌ FAILED')
    console.log('Test 3 (Sparse Dataset):', test3 ? '✅ PASSED' : '❌ FAILED')
    console.log('='.repeat(80))

    const allPassed = test1 && test2 && test3
    console.log('\n' + (allPassed ? '🎉 ALL TESTS PASSED' : '⚠️ SOME TESTS FAILED'))

    return allPassed
}

// Export for use in other files
if (require.main === module) {
    runAllTests()
}
