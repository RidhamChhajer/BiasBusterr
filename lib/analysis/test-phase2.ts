/**
 * Phase 2 Integration Test
 * 
 * Tests the CSV role confirmation workflow
 */

import { processCSVForRoleConfirmation } from './csv-processor'

async function testPhase2Workflow() {
    console.log('\n' + '='.repeat(80))
    console.log('PHASE 2 INTEGRATION TEST')
    console.log('='.repeat(80))

    // Create test CSV data
    const csvData = `gender,experience,education,selected
Male,5,Bachelor,Yes
Female,5,Bachelor,No
Male,3,Master,Yes
Female,3,Master,No
Male,7,PhD,Yes
Female,7,PhD,No`

    const buffer = Buffer.from(csvData, 'utf-8')

    console.log('\n📋 Test CSV Data:')
    console.log(csvData)

    try {
        console.log('\n🔄 Processing CSV for role confirmation...')

        const result = await processCSVForRoleConfirmation(buffer, 'test.csv')

        console.log('\n✅ SUCCESS! Result:')
        console.log('Status:', result.status)
        console.log('Analysis ID:', result.analysis_id)
        console.log('Rows:', result.row_count)
        console.log('Columns:', result.column_count)

        console.log('\n📊 Suggested Roles:')
        result.suggested_roles.forEach((suggestion: any) => {
            console.log(`  ${suggestion.column}:`)
            console.log(`    Role: ${suggestion.suggested_role}`)
            console.log(`    Confidence: ${(suggestion.confidence * 100).toFixed(0)}%`)
            console.log(`    Reason: ${suggestion.reason}`)
        })

        console.log('\n📄 Data Preview (first 3 rows):')
        result.data_preview.slice(0, 3).forEach((row: any[], idx: number) => {
            console.log(`  Row ${idx + 1}:`, row.join(', '))
        })

        console.log('\n🎉 PHASE 2 WORKFLOW TEST PASSED!')
        console.log('='.repeat(80) + '\n')

        return true

    } catch (error: any) {
        console.error('\n❌ TEST FAILED:', error.message)
        console.error(error.stack)
        console.log('='.repeat(80) + '\n')
        return false
    }
}

// Run test
if (require.main === module) {
    testPhase2Workflow().then(success => {
        process.exit(success ? 0 : 1)
    })
}

export { testPhase2Workflow }
