/**
 * Fairness Grouping Engine (Phase X - Distance-Based Similarity)
 * 
 * Groups records using distance-based similarity instead of exact matching
 * 
 * CRITICAL RULES:
 * - Uses ALL merit columns (no dropping)
 * - No outcome information in grouping
 * - No semantic importance ranking
 * - Transparent epsilon threshold
 * - Prefer INCONCLUSIVE over unsafe assumptions
 */

import type { ParsedDataset, ColumnRole, ComparableGroup, GroupRecord, OutcomeDistribution, Phase1Roles, RoleType } from './types'
import { normalizeMeritColumns, type NormalizedDataset } from './merit-normalizer'
import { calculateDistanceMatrix, type DistanceMatrix } from './distance-calculator'

export interface GroupingMetadata {
    grouping_method: 'distance-based'
    epsilon_used: number
    epsilon_attempts: number
    merit_dimensions_used: number
    normalization: 'z-score'
    group_count: number
    max_epsilon_reached: boolean
}

/**
 * Create comparable groups using distance-based similarity
 * 
 * @param dataset - Parsed dataset
 * @param roles - Column role assignments
 * @returns Groups and metadata
 */
export function createComparableGroups(
    dataset: ParsedDataset,
    roles: ColumnRole[]
): { groups: ComparableGroup[], metadata: GroupingMetadata } {
    console.log('[GROUPING] Starting distance-based similarity grouping...')

    // Convert ColumnRole[] to Phase1Roles format (Record<string, RoleType>)
    const phase1Roles: Phase1Roles = {}
    roles.forEach(r => {
        phase1Roles[r.columnName] = r.role as RoleType
    })

    // Extract indices
    const { meritIndices, sensitiveIndices, outcomeIndices } = extractIndices(dataset, roles)

    if (meritIndices.length === 0) {
        console.warn('[GROUPING] No merit columns - returning empty')
        return {
            groups: [],
            metadata: {
                grouping_method: 'distance-based',
                epsilon_used: 0,
                epsilon_attempts: 0,
                merit_dimensions_used: 0,
                normalization: 'z-score',
                group_count: 0,
                max_epsilon_reached: false
            }
        }
    }

    if (outcomeIndices.length === 0) {
        console.warn('[GROUPING] No outcome columns - returning empty')
        return {
            groups: [],
            metadata: {
                grouping_method: 'distance-based',
                epsilon_used: 0,
                epsilon_attempts: 0,
                merit_dimensions_used: meritIndices.length,
                normalization: 'z-score',
                group_count: 0,
                max_epsilon_reached: false
            }
        }
    }

    // Step 1: Normalize merit columns
    const normalized = normalizeMeritColumns(dataset, phase1Roles)

    // Step 2: Calculate distance matrix
    const distanceMatrix = calculateDistanceMatrix(normalized)

    // Step 3: Adaptive epsilon search
    const INITIAL_EPSILON = 0.1
    const MAX_EPSILON = 1.0
    const EPSILON_INCREMENT = 0.1
    const MIN_GROUPS_NEEDED = 3

    let epsilon = INITIAL_EPSILON
    let attempts = 0
    let groups: ComparableGroup[] = []

    while (groups.length < MIN_GROUPS_NEEDED && epsilon <= MAX_EPSILON) {
        attempts++
        groups = formGroupsAtEpsilon(dataset, roles, distanceMatrix, epsilon, meritIndices, sensitiveIndices, outcomeIndices[0])

        console.log(`[GROUPING] Epsilon ${epsilon.toFixed(2)}: ${groups.length} groups formed`)

        if (groups.length >= MIN_GROUPS_NEEDED) break

        epsilon += EPSILON_INCREMENT
    }

    const metadata: GroupingMetadata = {
        grouping_method: 'distance-based',
        epsilon_used: Math.min(epsilon, MAX_EPSILON),
        epsilon_attempts: attempts,
        merit_dimensions_used: normalized.params.length,
        normalization: 'z-score',
        group_count: groups.length,
        max_epsilon_reached: epsilon > MAX_EPSILON
    }

    console.log('[GROUPING] ✅ Final result:', metadata)
    console.log('[GROUPING] Total records grouped:', groups.reduce((sum, g) => sum + g.records.length, 0))

    return { groups, metadata }
}

/**
 * Extract column indices by role
 */
function extractIndices(dataset: ParsedDataset, roles: ColumnRole[]) {
    const meritIndices = roles
        .filter(r => r.role === 'merit')
        .map(r => dataset.headers.indexOf(r.columnName))
        .filter(idx => idx !== -1)

    const sensitiveIndices = roles
        .filter(r => r.role === 'sensitive')
        .map(r => dataset.headers.indexOf(r.columnName))
        .filter(idx => idx !== -1)

    const outcomeIndices = roles
        .filter(r => r.role === 'outcome')
        .map(r => dataset.headers.indexOf(r.columnName))
        .filter(idx => idx !== -1)

    return { meritIndices, sensitiveIndices, outcomeIndices }
}

/**
 * Form groups at a given epsilon threshold
 * Uses connected components algorithm
 */
function formGroupsAtEpsilon(
    dataset: ParsedDataset,
    roles: ColumnRole[],
    distanceMatrix: DistanceMatrix,
    epsilon: number,
    meritIndices: number[],
    sensitiveIndices: number[],
    outcomeIndex: number
): ComparableGroup[] {
    const n = distanceMatrix.rowCount
    const visited = new Array(n).fill(false)
    const groups: ComparableGroup[] = []

    // BFS to find connected components
    for (let i = 0; i < n; i++) {
        if (visited[i]) continue

        const component: number[] = []
        const queue = [i]

        while (queue.length > 0) {
            const current = queue.shift()!
            if (visited[current]) continue

            visited[current] = true
            component.push(current)

            // Find neighbors within epsilon
            for (let j = 0; j < n; j++) {
                if (!visited[j] && distanceMatrix.matrix[current][j] <= epsilon) {
                    queue.push(j)
                }
            }
        }

        // Convert to ComparableGroup (min 2 records)
        if (component.length >= 2) {
            const group = createGroupFromIndices(
                dataset,
                component,
                meritIndices,
                sensitiveIndices,
                outcomeIndex
            )
            if (group) groups.push(group)
        }
    }

    return groups
}

/**
 * Create ComparableGroup from row indices
 */
function createGroupFromIndices(
    dataset: ParsedDataset,
    indices: number[],
    meritIndices: number[],
    sensitiveIndices: number[],
    outcomeIndex: number
): ComparableGroup | null {
    // Create group records
    const records: GroupRecord[] = indices.map(rowIndex => {
        const row = dataset.rows[rowIndex]

        const sensitiveAttributes: Record<string, any> = {}
        for (const idx of sensitiveIndices) {
            sensitiveAttributes[dataset.headers[idx]] = row[idx]
        }

        return {
            rowIndex,
            sensitiveAttributes,
            outcome: row[outcomeIndex]
        }
    })

    // Extract merit attributes from first record
    const firstRow = dataset.rows[indices[0]]
    const meritAttributes: Record<string, any> = {}
    for (const idx of meritIndices) {
        meritAttributes[dataset.headers[idx]] = firstRow[idx]
    }

    // Compute outcome distribution
    const outcomeDistribution = computeOutcomeDistribution(records, sensitiveIndices, dataset.headers)

    // Create group key (for audit)
    const groupKey = `group_${indices[0]}_${indices.length}records`

    return {
        groupKey,
        records,
        meritAttributes,
        outcomeDistribution
    }
}

/**
 * Compute outcome distribution by sensitive attributes
 */
function computeOutcomeDistribution(
    records: GroupRecord[],
    sensitiveIndices: number[],
    headers: string[]
): OutcomeDistribution {
    const bySensitiveAttribute = new Map<string, Map<any, number>>()

    // Initialize maps for each sensitive attribute
    for (const idx of sensitiveIndices) {
        const columnName = headers[idx]
        bySensitiveAttribute.set(columnName, new Map())
    }

    // Count outcomes by sensitive attribute value
    for (const record of records) {
        for (const [attrName, attrValue] of Object.entries(record.sensitiveAttributes)) {
            const outcomeMap = bySensitiveAttribute.get(attrName)
            if (outcomeMap) {
                const currentCount = outcomeMap.get(attrValue) || 0
                outcomeMap.set(attrValue, currentCount + 1)
            }
        }
    }

    return {
        bySensitiveAttribute,
        totalRecords: records.length
    }
}

/**
 * Get records by sensitive attribute value (helper)
 */
export function getRecordsBySensitiveValue(
    records: GroupRecord[],
    sensitiveAttribute: string,
    sensitiveValue: any
): GroupRecord[] {
    return records.filter(r => r.sensitiveAttributes[sensitiveAttribute] === sensitiveValue)
}
