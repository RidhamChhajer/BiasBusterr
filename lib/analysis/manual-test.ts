/**
 * Detailed trace with logging in outcome comparison
 */

import type { ComparableGroup, GroupRecord } from './types'

// Manually create a group to test
const group: ComparableGroup = {
    groupKey: 'N5',
    records: [
        { rowIndex: 0, sensitiveAttributes: { gender: 'Male' }, outcome: 'Yes' },
        { rowIndex: 1, sensitiveAttributes: { gender: 'Male' }, outcome: 'Yes' },
        { rowIndex: 2, sensitiveAttributes: { gender: 'Female' }, outcome: 'No' },
        { rowIndex: 3, sensitiveAttributes: { gender: 'Female' }, outcome: 'No' },
    ],
    meritAttributes: { experience: 5 },
    outcomeDistribution: {
        bySensitiveAttribute: new Map([
            ['gender', new Map([
                ['Male', 2],
                ['Female', 2]
            ])]
        ]),
        totalRecords: 4
    }
}

console.log('\n=== MANUAL OUTCOME COMPARISON TEST ===\n')
console.log('Group:', group.groupKey)
console.log('Records:')
group.records.forEach(r => {
    console.log(`  ${JSON.stringify(r.sensitiveAttributes)} → ${r.outcome}`)
})

// Test getRecordsBySensitiveValue
function getRecordsBySensitiveValue(
    records: GroupRecord[],
    sensitiveAttribute: string,
    sensitiveValue: any
): GroupRecord[] {
    return records.filter(r => r.sensitiveAttributes[sensitiveAttribute] === sensitiveValue)
}

const maleRecords = getRecordsBySensitiveValue(group.records, 'gender', 'Male')
const femaleRecords = getRecordsBySensitiveValue(group.records, 'gender', 'Female')

console.log('\nMale records:', maleRecords.length)
maleRecords.forEach(r => console.log(`  → ${r.outcome}`))

console.log('\nFemale records:', femaleRecords.length)
femaleRecords.forEach(r => console.log(`  → ${r.outcome}`))

// Test computeOutcomeRate
function computeOutcomeRate(records: GroupRecord[]): number {
    if (records.length === 0) return 0

    const outcomeCounts = new Map<any, number>()
    for (const record of records) {
        const outcome = record.outcome
        outcomeCounts.set(outcome, (outcomeCounts.get(outcome) || 0) + 1)
    }

    const uniqueOutcomes = Array.from(outcomeCounts.keys())
    console.log('  Unique outcomes:', uniqueOutcomes)
    console.log('  Outcome counts:', Array.from(outcomeCounts.entries()))

    if (uniqueOutcomes.length === 2) {
        // Find positive outcome
        const positiveKeywords = ['1', 'true', 'yes', 'y', 'selected', 'hired', 'approved']

        let positiveOutcome = null
        for (const outcome of uniqueOutcomes) {
            const outcomeStr = String(outcome).toLowerCase()
            if (positiveKeywords.includes(outcomeStr)) {
                positiveOutcome = outcome
                break
            }
        }

        if (!positiveOutcome) {
            positiveOutcome = uniqueOutcomes[0]
        }

        console.log('  Positive outcome:', positiveOutcome)
        const positiveCount = outcomeCounts.get(positiveOutcome) || 0
        return positiveCount / records.length
    }

    let maxCount = 0
    for (const count of outcomeCounts.values()) {
        if (count > maxCount) maxCount = count
    }
    return maxCount / records.length
}

console.log('\nMale outcome rate:')
const maleRate = computeOutcomeRate(maleRecords)
console.log('  Rate:', maleRate)

console.log('\nFemale outcome rate:')
const femaleRate = computeOutcomeRate(femaleRecords)
console.log('  Rate:', femaleRate)

const magnitude = Math.abs(maleRate - femaleRate)
console.log('\nMagnitude:', magnitude)
console.log('Is meaningful (>0.10)?', magnitude >= 0.10)

if (magnitude >= 0.10) {
    console.log('\n✅ DISPARITY DETECTED!')
} else {
    console.log('\n❌ NO DISPARITY (this is the bug)')
}
