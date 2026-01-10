/**
 * Minimal test to trace the issue
 */

import { createComparableGroups } from './fairness-grouping'
import { detectOutcomeDisparities } from './outcome-comparison'
import type { ParsedDataset, ColumnRole } from './types'

const dataset: ParsedDataset = {
    headers: ['gender', 'experience', 'selected'],
    rows: [
        // Group 1: 5 years - BIASED (males selected, females rejected)
        ['Male', 5, 'Yes'],
        ['Male', 5, 'Yes'],
        ['Female', 5, 'No'],
        ['Female', 5, 'No'],
    ],
    rowCount: 4,
    columnCount: 3,
    metadata: { source: 'trace.csv', extractedAt: '', quality: 'high' }
}

const roles: ColumnRole[] = [
    { columnName: 'gender', role: 'sensitive', confidence: 1, reason: '' },
    { columnName: 'experience', role: 'merit', confidence: 1, reason: '' },
    { columnName: 'selected', role: 'outcome', confidence: 1, reason: '' }
]

console.log('\n=== TRACE TEST ===\n')

// Step 1: Create groups
const groups = createComparableGroups(dataset, roles)
console.log('\nGroups created:', groups.length)

for (const group of groups) {
    console.log('\nGroup:', group.groupKey)
    console.log('  Merit attributes:', group.meritAttributes)
    console.log('  Records:', group.records.length)

    for (const record of group.records) {
        console.log('    -', record.sensitiveAttributes, '→', record.outcome)
    }

    console.log('  Outcome distribution:')
    for (const [attr, map] of group.outcomeDistribution.bySensitiveAttribute.entries()) {
        console.log(`    ${attr}:`, Array.from(map.entries()))
    }
}

// Step 2: Detect disparities
const disparities = detectOutcomeDisparities(groups)
console.log('\n\nDisparities found:', disparities.length)

for (const disparity of disparities) {
    console.log('\nDisparity in group:', disparity.groupKey)
    console.log('  Has bias:', disparity.hasBias)
    console.log('  Affected attributes:', disparity.affectedSensitiveAttributes)
    console.log('  Evidence:')

    for (const ev of disparity.evidence) {
        console.log(`    ${ev.sensitiveAttribute}=${ev.sensitiveValue}: ${(ev.outcomeRate * 100).toFixed(0)}% vs ${(ev.comparisonOutcomeRate * 100).toFixed(0)}% (magnitude: ${(ev.magnitude * 100).toFixed(0)}%)`)
    }
}
