/**
 * CSV Analysis Helper (Phase 2)
 * 
 * Handles CSV file processing with role confirmation workflow
 */

import { parse } from 'csv-parse/sync'
import type { ParsedDataset, ColumnMetadata } from './types'
import { inferColumnTypes } from './dataset-parser'
import { suggestColumnRoles } from './role-suggester'
import { generateTempId, storePendingAnalysis } from './session-cache'

/**
 * Process CSV file for role confirmation workflow
 * 
 * Returns pending_confirmation status with suggested roles
 */
export async function processCSVForRoleConfirmation(
    buffer: Buffer,
    fileName: string
): Promise<{
    status: 'pending_confirmation'
    analysis_id: string
    suggested_roles: any[]
    data_preview: any[][]
    column_count: number
    row_count: number
    message: string
}> {
    console.log('[CSV PROCESSOR] Processing CSV file:', fileName)

    // 1. Parse CSV
    const csvText = buffer.toString('utf-8')

    const records = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true
    })

    if (records.length === 0) {
        throw new Error('CSV file is empty')
    }

    // 2. Extract headers and convert to row format
    const headers = Object.keys(records[0])
    const rows = records.map((record: any) =>
        headers.map(header => record[header])
    )

    const dataset: ParsedDataset = {
        headers,
        rows,
        rowCount: rows.length,
        columnCount: headers.length,
        metadata: {
            source: fileName,
            extractedAt: new Date().toISOString(),
            quality: 'high'
        }
    }

    console.log('[CSV PROCESSOR] ✅ Parsed CSV:', {
        rows: dataset.rowCount,
        columns: dataset.columnCount
    })

    // 3. Extract column metadata
    const columns = inferColumnTypes(dataset)

    console.log('[CSV PROCESSOR] ✅ Inferred column types')

    // 4. Suggest roles
    const suggestions = await suggestColumnRoles(columns)

    console.log('[CSV PROCESSOR] ✅ Generated role suggestions')

    // 5. Generate analysis ID
    const analysisId = generateTempId()

    // 6. Store pending analysis
    await storePendingAnalysis(analysisId, {
        dataset,
        suggested_roles: suggestions,
        created_at: Date.now(),
        expires_at: Date.now() + (15 * 60 * 1000),  // 15 minutes
        extractionResult: {
            success: true,
            dataType: 'structured',
            structuredData: dataset,
            extractionMethod: 'csv',
            confidence: 1.0,
            warnings: []
        },
        roleSuggestions: suggestions
    })

    console.log('[CSV PROCESSOR] ✅ Stored pending analysis:', analysisId)

    // 7. Return pending_confirmation response
    return {
        status: 'pending_confirmation',
        analysis_id: analysisId,
        suggested_roles: suggestions,
        data_preview: dataset.rows.slice(0, 10),  // First 10 rows
        column_count: dataset.columnCount,
        row_count: dataset.rowCount,
        message: 'Please confirm column roles to proceed with bias analysis'
    }
}
