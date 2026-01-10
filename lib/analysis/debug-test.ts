/**
 * Simple debug test to see what's happening
 */

import type { ParsedDataset, ColumnRole } from './types'
import { detectBiasPhase1 } from './bias-detector-phase1'

// Create simple biased dataset
const dataset: ParsedDataset = {
    headers: ['gender', 'experience', 'education', 'selected'],
    rows: [
        // Males with 5 years + Bachelor → mostly selected
        ['Male', 5, 'Bachelor', 'Yes'],
        ['Male', 5, 'Bachelor', 'Yes'],
        ['Male', 5, 'Bachelor', 'Yes'],
        ['Male', 5, 'Bachelor', 'Yes'],
        ['Male', 5, 'Bachelor', 'No'],

        // Females with 5 years + Bachelor → mostly rejected
        ['Female', 5, 'Bachelor', 'No'],
        ['Female', 5, 'Bachelor', 'No'],
        ['Female', 5, 'Bachelor', 'No'],
        ['Female', 5, 'Bachelor', 'No'],
        ['Female', 5, 'Bachelor', 'Yes'],
    ],
    rowCount: 10,
    columnCount: 4,
    metadata: {
        source: 'debug-test.csv',
        extractedAt: new Date().toISOString(),
        quality: 'high'
    }
}

const roles: ColumnRole[] = [
    { columnName: 'gender', role: 'sensitive', confidence: 1, reason: 'Protected' },
    { columnName: 'experience', role: 'merit', confidence: 1, reason: 'Qualification' },
    { columnName: 'education', role: 'merit', confidence: 1, reason: 'Qualification' },
    { columnName: 'selected', role: 'outcome', confidence: 1, reason: 'Decision' }
]

console.log('\n🔍 DEBUG TEST - Simple Biased Dataset\n')
console.log('Dataset:', dataset.rowCount, 'rows')
console.log('Roles:', roles.map(r => `${r.columnName}:${r.role}`).join(', '))
console.log('\n')

const result = detectBiasPhase1(dataset, roles)

console.log('\n📊 FINAL RESULT:')
console.log('Bias Detected:', result.bias_detected)
console.log('Severity:', result.severity)
console.log('Metrics:', JSON.stringify(result.metrics, null, 2))
console.log('Affected Attributes:', result.affected_sensitive_attributes)
console.log('Reasoning:', result.reasoning)
console.log('Confidence:', result.confidence)

if (result.severity === 'HIGH' || result.severity === 'MEDIUM') {
    console.log('\n✅ TEST PASSED - Bias detected as expected')
} else {
    console.log('\n❌ TEST FAILED - Expected HIGH/MEDIUM, got', result.severity)
}
