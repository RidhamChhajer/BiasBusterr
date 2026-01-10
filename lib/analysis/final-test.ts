/**
 * Final Phase 1 Test - Comprehensive
 */

import type { ParsedDataset, ColumnRole } from './types'
import { detectBiasPhase1 } from './bias-detector-phase1'

console.log('\n' + '='.repeat(80))
console.log('PHASE 1 FINAL TEST')
console.log('='.repeat(80))

// Test 1: HIGH BIAS - Clear gender discrimination across multiple experience levels
console.log('\n📋 TEST 1: HIGH BIAS (Gender Discrimination)')
console.log('-'.repeat(80))

const biasedDataset: ParsedDataset = {
    headers: ['gender', 'years_exp', 'hired'],
    rows: [
        // 10 different experience levels, each showing bias
        // Males: mostly hired, Females: mostly rejected
        ...Array.from({ length: 10 }, (_, i) => {
            const exp = i + 1
            return [
                ['Male', exp, 'Yes'],
                ['Male', exp, 'Yes'],
                ['Male', exp, 'Yes'],
                ['Female', exp, 'No'],
                ['Female', exp, 'No'],
                ['Female', exp, 'No'],
            ]
        }).flat()
    ],
    rowCount: 60,
    columnCount: 3,
    metadata: { source: 'test1.csv', extractedAt: '', quality: 'high' }
}

const roles: ColumnRole[] = [
    { columnName: 'gender', role: 'sensitive', confidence: 1, reason: '' },
    { columnName: 'years_exp', role: 'merit', confidence: 1, reason: '' },
    { columnName: 'hired', role: 'outcome', confidence: 1, reason: '' }
]

const result1 = detectBiasPhase1(biasedDataset, roles)

console.log('\n📊 RESULT:')
console.log('  Severity:', result1.severity)
console.log('  Bias Ratio:', (result1.metrics.bias_ratio * 100).toFixed(1) + '%')
console.log('  Total Groups:', result1.metrics.total_groups)
console.log('  Biased Groups:', result1.metrics.biased_groups)

const test1Pass = result1.severity === 'HIGH'
console.log('\n', test1Pass ? '✅ PASSED' : '❌ FAILED')

// Test 2: LOW BIAS - Fair hiring
console.log('\n\n📋 TEST 2: LOW BIAS (Fair Hiring)')
console.log('-'.repeat(80))

const fairDataset: ParsedDataset = {
    headers: ['gender', 'years_exp', 'hired'],
    rows: [
        // 10 different experience levels, all fair
        ...Array.from({ length: 10 }, (_, i) => {
            const exp = i + 1
            return [
                ['Male', exp, 'Yes'],
                ['Male', exp, 'Yes'],
                ['Female', exp, 'Yes'],
                ['Female', exp, 'Yes'],
            ]
        }).flat()
    ],
    rowCount: 40,
    columnCount: 3,
    metadata: { source: 'test2.csv', extractedAt: '', quality: 'high' }
}

const result2 = detectBiasPhase1(fairDataset, roles)

console.log('\n📊 RESULT:')
console.log('  Severity:', result2.severity)
console.log('  Bias Ratio:', (result2.metrics.bias_ratio * 100).toFixed(1) + '%')

const test2Pass = result2.severity === 'LOW'
console.log('\n', test2Pass ? '✅ PASSED' : '❌ FAILED')

// Test 3: INCONCLUSIVE - Sparse data
console.log('\n\n📋 TEST 3: INCONCLUSIVE (Sparse Data)')
console.log('-'.repeat(80))

const sparseDataset: ParsedDataset = {
    headers: ['gender', 'years_exp', 'hired'],
    rows: [
        ['Male', 5, 'Yes'],
        ['Female', 5, 'No'],
    ],
    rowCount: 2,
    columnCount: 3,
    metadata: { source: 'test3.csv', extractedAt: '', quality: 'low' }
}

const result3 = detectBiasPhase1(sparseDataset, roles)

console.log('\n📊 RESULT:')
console.log('  Severity:', result3.severity)
console.log('  Reasoning:', result3.reasoning[0])

const test3Pass = result3.severity === 'INCONCLUSIVE'
console.log('\n', test3Pass ? '✅ PASSED' : '❌ FAILED')

// Summary
console.log('\n\n' + '='.repeat(80))
console.log('SUMMARY')
console.log('='.repeat(80))
console.log('Test 1 (HIGH BIAS):', test1Pass ? '✅ PASSED' : '❌ FAILED')
console.log('Test 2 (LOW BIAS):', test2Pass ? '✅ PASSED' : '❌ FAILED')
console.log('Test 3 (INCONCLUSIVE):', test3Pass ? '✅ PASSED' : '❌ FAILED')

const allPass = test1Pass && test2Pass && test3Pass
console.log('\n' + (allPass ? '🎉 ALL TESTS PASSED - PHASE 1 COMPLETE!' : '⚠️ SOME TESTS FAILED'))
console.log('='.repeat(80) + '\n')

process.exit(allPass ? 0 : 1)
