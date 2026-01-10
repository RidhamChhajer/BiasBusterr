/**
 * Better debug test with multiple comparable groups
 */

import type { ParsedDataset, ColumnRole } from './types'
import { detectBiasPhase1 } from './bias-detector-phase1'

// Create biased dataset with MULTIPLE comparable groups
const dataset: ParsedDataset = {
    headers: ['gender', 'experience', 'selected'],
    rows: [
        // Group 1: 5 years experience
        ['Male', 5, 'Yes'],
        ['Male', 5, 'Yes'],
        ['Female', 5, 'No'],
        ['Female', 5, 'No'],

        // Group 2: 3 years experience
        ['Male', 3, 'Yes'],
        ['Male', 3, 'Yes'],
        ['Female', 3, 'No'],
        ['Female', 3, 'No'],

        // Group 3: 7 years experience
        ['Male', 7, 'Yes'],
        ['Male', 7, 'Yes'],
        ['Female', 7, 'No'],
        ['Female', 7, 'No'],

        // Group 4: 2 years experience
        ['Male', 2, 'No'],
        ['Male', 2, 'No'],
        ['Female', 2, 'No'],
        ['Female', 2, 'No'],

        // Group 5: 10 years experience
        ['Male', 10, 'Yes'],
        ['Male', 10, 'Yes'],
        ['Female', 10, 'No'],
        ['Female', 10, 'No'],

        // Group 6: 8 years experience
        ['Male', 8, 'Yes'],
        ['Male', 8, 'Yes'],
        ['Female', 8, 'No'],
        ['Female', 8, 'No'],

        // Group 7: 6 years experience
        ['Male', 6, 'Yes'],
        ['Male', 6, 'Yes'],
        ['Female', 6, 'No'],
        ['Female', 6, 'No'],

        // Group 8: 4 years experience
        ['Male', 4, 'Yes'],
        ['Male', 4, 'Yes'],
        ['Female', 4, 'No'],
        ['Female', 4, 'No'],

        // Group 9: 9 years experience
        ['Male', 9, 'Yes'],
        ['Male', 9, 'Yes'],
        ['Female', 9, 'No'],
        ['Female', 9, 'No'],

        // Group 10: 1 year experience
        ['Male', 1, 'No'],
        ['Male', 1, 'No'],
        ['Female', 1, 'No'],
        ['Female', 1, 'No'],
    ],
    rowCount: 40,
    columnCount: 3,
    metadata: {
        source: 'debug-test2.csv',
        extractedAt: new Date().toISOString(),
        quality: 'high'
    }
}

const roles: ColumnRole[] = [
    { columnName: 'gender', role: 'sensitive', confidence: 1, reason: 'Protected' },
    { columnName: 'experience', role: 'merit', confidence: 1, reason: 'Qualification' },
    { columnName: 'selected', role: 'outcome', confidence: 1, reason: 'Decision' }
]

console.log('\n🔍 DEBUG TEST 2 - Multiple Comparable Groups\n')
console.log('Dataset:', dataset.rowCount, 'rows')
console.log('Expected: 10 comparable groups (different experience levels)')
console.log('Expected: 8 groups with bias (experience 3-10), 2 fair (1-2 years)')
console.log('\n')

const result = detectBiasPhase1(dataset, roles)

console.log('\n📊 FINAL RESULT:')
console.log('Bias Detected:', result.bias_detected)
console.log('Severity:', result.severity)
console.log('Total Groups:', result.metrics.total_groups)
console.log('Biased Groups:', result.metrics.biased_groups)
console.log('Bias Ratio:', (result.metrics.bias_ratio * 100).toFixed(1) + '%')
console.log('Average Magnitude:', (result.metrics.average_magnitude * 100).toFixed(1) + '%')
console.log('Affected Attributes:', result.affected_sensitive_attributes)
console.log('Confidence:', result.confidence.toFixed(2))

console.log('\nReasoning:')
result.reasoning.forEach((r, i) => console.log(`  ${i + 1}. ${r}`))

if (result.severity === 'HIGH' || result.severity === 'MEDIUM') {
    console.log('\n✅ TEST PASSED - Bias detected as expected')
} else {
    console.log('\n❌ TEST FAILED - Expected HIGH/MEDIUM, got', result.severity)
}
