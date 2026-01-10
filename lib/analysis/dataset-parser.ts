/**
 * Dataset Parser
 * 
 * Validates and analyzes structured datasets after extraction
 * Infers column types and computes statistics
 */

import type { ParsedDataset, ColumnMetadata } from './types'

/**
 * Validate that a parsed dataset has the required structure
 */
export function validateDataset(dataset: ParsedDataset): {
    isValid: boolean
    errors: string[]
} {
    const errors: string[] = []

    // Check headers
    if (!dataset.headers || dataset.headers.length === 0) {
        errors.push('Dataset must have at least one column header')
    }

    // Check for duplicate headers
    const headerSet = new Set(dataset.headers)
    if (headerSet.size !== dataset.headers.length) {
        errors.push('Dataset has duplicate column headers')
    }

    // Check rows
    if (!dataset.rows || dataset.rows.length === 0) {
        errors.push('Dataset must have at least one row of data')
    }

    // Check row consistency
    if (dataset.rows.length > 0) {
        const expectedColumns = dataset.headers.length
        const inconsistentRows = dataset.rows.filter(row => row.length !== expectedColumns)

        if (inconsistentRows.length > 0) {
            errors.push(`${inconsistentRows.length} rows have inconsistent column count`)
        }
    }

    // Check counts match
    if (dataset.rowCount !== dataset.rows.length) {
        errors.push('Row count mismatch')
    }

    if (dataset.columnCount !== dataset.headers.length) {
        errors.push('Column count mismatch')
    }

    return {
        isValid: errors.length === 0,
        errors
    }
}

/**
 * Infer column types (numeric vs categorical)
 */
export function inferColumnTypes(dataset: ParsedDataset): ColumnMetadata[] {
    const metadata: ColumnMetadata[] = []

    for (let colIndex = 0; colIndex < dataset.headers.length; colIndex++) {
        const columnName = dataset.headers[colIndex]
        const values = dataset.rows.map(row => row[colIndex])

        // Filter out null/undefined values
        const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '')

        // Count unique values
        const uniqueValues = new Set(nonNullValues)
        const uniqueCount = uniqueValues.size

        // Count missing values
        const missingCount = values.length - nonNullValues.length

        // Determine type: numeric if >80% of non-null values are numbers
        let numericCount = 0
        for (const value of nonNullValues) {
            if (typeof value === 'number' || !isNaN(Number(value))) {
                numericCount++
            }
        }

        const numericRatio = nonNullValues.length > 0
            ? numericCount / nonNullValues.length
            : 0

        const type: 'numeric' | 'categorical' = numericRatio >= 0.8 ? 'numeric' : 'categorical'

        // Sample values (up to 5 unique values)
        const sampleValues = Array.from(uniqueValues).slice(0, 5)

        metadata.push({
            name: columnName,
            index: colIndex,
            type,
            uniqueCount,
            missingCount,
            sampleValues
        })
    }

    return metadata
}

/**
 * Compute column statistics
 */
export function computeColumnStats(dataset: ParsedDataset, metadata: ColumnMetadata[]): {
    columnName: string
    type: 'numeric' | 'categorical'
    stats: any
}[] {
    return metadata.map(col => {
        const values = dataset.rows.map(row => row[col.index])
        const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '')

        if (col.type === 'numeric') {
            // Numeric statistics
            const numbers = nonNullValues.map(v => Number(v)).filter(n => !isNaN(n))

            if (numbers.length === 0) {
                return {
                    columnName: col.name,
                    type: col.type,
                    stats: { count: 0 }
                }
            }

            const sorted = [...numbers].sort((a, b) => a - b)
            const sum = numbers.reduce((acc, n) => acc + n, 0)
            const mean = sum / numbers.length
            const min = sorted[0]
            const max = sorted[sorted.length - 1]
            const median = sorted[Math.floor(sorted.length / 2)]

            return {
                columnName: col.name,
                type: col.type,
                stats: {
                    count: numbers.length,
                    min,
                    max,
                    mean,
                    median,
                    missingCount: col.missingCount
                }
            }
        } else {
            // Categorical statistics
            const valueCounts = new Map<any, number>()
            for (const value of nonNullValues) {
                valueCounts.set(value, (valueCounts.get(value) || 0) + 1)
            }

            // Sort by frequency
            const sortedCounts = Array.from(valueCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)  // Top 10 values

            return {
                columnName: col.name,
                type: col.type,
                stats: {
                    count: nonNullValues.length,
                    uniqueCount: col.uniqueCount,
                    topValues: sortedCounts,
                    missingCount: col.missingCount
                }
            }
        }
    })
}

/**
 * Detect missing value patterns
 */
export function detectMissingValues(dataset: ParsedDataset): {
    totalMissing: number
    missingByColumn: Map<string, number>
    missingRatio: number
    sparseColumns: string[]  // Columns with >30% missing
} {
    const missingByColumn = new Map<string, number>()
    let totalMissing = 0

    for (let colIndex = 0; colIndex < dataset.headers.length; colIndex++) {
        const columnName = dataset.headers[colIndex]
        const values = dataset.rows.map(row => row[colIndex])

        const missingCount = values.filter(v => v === null || v === undefined || v === '').length

        missingByColumn.set(columnName, missingCount)
        totalMissing += missingCount
    }

    const totalCells = dataset.rowCount * dataset.columnCount
    const missingRatio = totalCells > 0 ? totalMissing / totalCells : 0

    // Identify sparse columns (>30% missing)
    const sparseColumns: string[] = []
    for (const [columnName, missingCount] of missingByColumn.entries()) {
        const ratio = missingCount / dataset.rowCount
        if (ratio > 0.3) {
            sparseColumns.push(columnName)
        }
    }

    return {
        totalMissing,
        missingByColumn,
        missingRatio,
        sparseColumns
    }
}
